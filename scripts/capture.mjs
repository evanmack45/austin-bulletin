// Full-page screenshot with real device emulation, for the persona review
// panel. Plain `chrome --headless --screenshot` enforces a ~500px minimum
// window width, so phone-width captures silently lay out wide and crop —
// the 2026-08-29 panel prep hit exactly that. This drives the installed
// Chrome over CDP instead.
//
// Usage: node scripts/capture.mjs <url> <out.png> [--width 390] [--mobile]

import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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
  await page.setViewport({ width, height: 1000, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
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
  await page.screenshot({ path: out, fullPage: true });
  console.log(`captured ${url} at ${width}px -> ${out}`);
} finally {
  await browser.close();
}
