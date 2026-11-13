import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
const routes = ["/", "/2026/11/10/", "/2026/11/11/", "/2026/11/12/", "/2026/11/13/"];

function serveBuiltSite() {
  const root = path.resolve("_site");
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    try {
      const types = {
        ".css": "text/css",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".png": "image/png"
      };
      const type = types[path.extname(file)] || "text/html";
      response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)).then(() => server);
}

test("homepage and Nov 10–13 stay within a 390px viewport", {
  skip: !chrome && "an installed Chromium browser is required for layout regression"
}, async () => {
  const server = await serveBuiltSite();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox"]
  });
  const page = await browser.newPage();
  const failures = [];
  try {
    await page.setViewport({ width: 390, height: 844 });
    for (const route of routes) {
      await page.goto(origin + route, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const meas = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const boards = [...document.querySelectorAll(".board")].map((board) => (
          [...board.querySelectorAll(":scope > .oc")].map((tile) => {
            const mark = tile.querySelector(".mark, .oc-head");
            return Math.round((mark || tile).getBoundingClientRect().left * 10) / 10;
          })
        ));
        return { scrollWidth, viewport: innerWidth, boards };
      });
      if (meas.scrollWidth > meas.viewport) {
        failures.push(
          `${route} scrollWidth ${meas.scrollWidth} > viewport ${meas.viewport}`
        );
      }
      meas.boards.forEach((lefts, index) => {
        if (lefts.length < 2) return;
        const unique = [...new Set(lefts)];
        if (unique.length > 1) {
          failures.push(`${route} board ${index} tile lefts ${lefts.join(", ")}`);
        }
      });
    }
  } finally {
    await browser.close();
    server.close();
  }
  assert.deepEqual(failures, []);
});
