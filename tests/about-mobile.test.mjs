import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const chrome = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find(executable => existsSync(executable));
const agent = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";

// An unbreakable crawler identifier must not make the About page wider than a phone.
test("About crawler identifier fits at 360px and stays readable and copyable", {
  skip: !chrome && "an installed Chromium browser is required for layout regression"
}, async () => {
  const html = readFileSync("_site/about/index.html", "utf8").replace(
    '<link rel="stylesheet" href="/css/style.css">',
    `<style>${readFileSync("_site/css/style.css", "utf8")}</style>`);
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
    args: process.platform === "linux" ? ["--no-sandbox"] : [] });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", request => request.abort());
    // The test blocks font requests. Linux can fall back to a Times-style serif
    // where Mac uses Georgia; exercise both line-break contexts explicitly.
    for (const fallback of [null, "Times New Roman"]) {
      for (const width of [360, 390, 1440]) {
        await page.setViewport({ width, height: 900 });
        const fontStyle = fallback
          ? `<style>body { font-family: "${fallback}", serif; }</style>` : "";
        await page.setContent(html + fontStyle, { waitUntil: "domcontentloaded" });
        const result = await page.evaluate(expected => {
          const code = [...document.querySelectorAll("code")]
            .find(el => el.textContent === expected);
          if (!code) throw new Error("Crawler identifier is missing or altered");
          const range = document.createRange(); range.selectNodeContents(code);
          const rectangles = [...range.getClientRects()].map(r => ({
            left: r.left, right: r.right, height: r.height
          }));
          const selection = window.getSelection();
          selection.removeAllRanges(); selection.addRange(range);
          return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth,
            text: code.textContent, selected: selection.toString(), rectangles };
        }, agent);
        assert.ok(result.documentWidth <= width,
          `${width}px viewport, ${result.documentWidth}px document`);
        assert.equal(result.text, agent);
        assert.equal(result.selected, agent);
        assert.ok(result.rectangles.length > 0);
        assert.ok(result.rectangles.every(r => r.left >= 0 && r.right <= width && r.height > 0),
          `identifier must remain inside ${width}px`);
        if (width === 1440) {
          assert.equal(result.rectangles.length, 1,
            `desktop identifier remains on one line (${fallback || "default fallback"})`);
        }
      }
    }
  } finally { await browser.close(); }
});
