// Full-page screenshot with real device emulation, for the persona review
// panel. Plain `chrome --headless --screenshot` enforces a ~500px minimum
// window width, so phone-width captures silently lay out wide and crop —
// the 2026-08-29 panel prep hit exactly that. This drives the installed
// Chrome over CDP instead.
//
// Capture is viewport-stitched, not a single `fullPage: true` shot: Chrome's
// full-page mode resizes the page to its entire document height in one jump,
// so anything still lazy-loading below the fold — a YouTube embed, most
// often — gets frozen blank before it ever has a chance to render. The
// 2026-08-28 and 2026-08-29 review panels both filed false "broken video"
// findings against exactly that artifact. Instead this walks the real
// viewport down the page in chunks, waiting after each scroll for lazy
// content to paint, then stitches the chunks back into one image with sharp.
//
// Usage: node scripts/capture.mjs <url> <out.png> [--width 390] [--mobile]

import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { pathToFileURL } from "node:url";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Splits a docHeight-tall page into viewport-height capture chunks. Each
// chunk says where to scroll to, how much of that captured frame to throw
// away from its top (because it overlaps a chunk already captured), and how
// much of it to keep. Chunks tile the page with no gaps and no double-kept
// rows: summing every chunk's `height` always equals docHeight.
export function chunkPlan(docHeight, viewportHeight) {
  if (docHeight <= viewportHeight) {
    return [{ scrollY: 0, cropTop: 0, height: docHeight }];
  }

  const plan = [];
  let scrollY = 0;
  while (scrollY + viewportHeight <= docHeight) {
    plan.push({ scrollY, cropTop: 0, height: viewportHeight });
    scrollY += viewportHeight;
  }

  const remainder = docHeight - scrollY;
  if (remainder > 0) {
    plan.push({
      scrollY: docHeight - viewportHeight,
      cropTop: viewportHeight - remainder,
      height: remainder
    });
  }

  return plan;
}

async function captureChunks(page, plan) {
  const crops = [];
  let offset = 0;
  const { width } = page.viewport();
  for (const chunk of plan) {
    await page.evaluate((y) => window.scrollTo(0, y), chunk.scrollY);
    await new Promise((r) => setTimeout(r, 400));
    const frame = await page.screenshot();
    const cropped = await sharp(frame)
      .extract({ left: 0, top: chunk.cropTop, width, height: chunk.height })
      .toBuffer();
    crops.push({ input: cropped, top: offset, left: 0 });
    offset += chunk.height;
  }
  return { crops, totalHeight: offset };
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  const out = args[1];
  if (!url || !out) {
    console.error("usage: node scripts/capture.mjs <url> <out.png> [--width N] [--mobile]");
    process.exit(1);
  }
  const widthFlag = args.indexOf("--width");
  const width = widthFlag === -1 ? 1440 : Number(args[widthFlag + 1]);
  const mobile = args.includes("--mobile");

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height: 1000,
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 1
    });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    // Walk the page so lazy-loading embeds fire before the capture — the
    // 2026-08-28 review produced a false "broken video" finding this way.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 800));

    const docHeight = await page.evaluate(() =>
      Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    );
    const plan = chunkPlan(docHeight, page.viewport().height);
    const { crops, totalHeight } = await captureChunks(page, plan);

    await sharp({
      create: {
        width: page.viewport().width,
        height: totalHeight,
        channels: 4,
        background: "#ffffff"
      }
    })
      .composite(crops)
      .png()
      .toFile(out);

    console.log(`captured ${url} at ${width}px -> ${out}`);
  } finally {
    await browser.close();
  }
}

// Only run the CLI flow when this file is executed directly (`node
// scripts/capture.mjs ...`), not when tests/capture.test.mjs imports it to
// reach the pure chunkPlan() function above — otherwise importing the
// module for its math would also launch Chrome.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await main();
}
