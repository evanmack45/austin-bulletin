import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { coverExpandedHits } from "../scripts/hit-probes.mjs";

const chrome = ["/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium"]
  .find((executable) => existsSync(executable));

function serveBuiltSite() {
  const root = path.resolve("_site");
  return new Promise((resolve) => {
    const server = createServer((request, response) => {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
      if (!file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(404).end();
        return;
      }
      try {
        const type = path.extname(file) === ".css" ? "text/css" : "text/html";
        response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
      } catch {
        response.writeHead(404).end();
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test("council and about 44px edges receive the click", {
  skip: !chrome && "an installed Chromium is required"
}, async () => {
  const server = await serveBuiltSite();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: process.platform === "linux" ? ["--no-sandbox"] : []
  });
  try {
    const pages = [
      ["/2026/11/07/", 1280, 900],
      ["/2026/11/07/", 390, 844],
      ["/about/", 1280, 900],
      ["/about/", 390, 844]
    ];
    for (const [route, width, height] of pages) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      const origin = `http://127.0.0.1:${server.address().port}${route}`;
      await page.goto(origin, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);
      const result = await coverExpandedHits(page);
      assert.ok(result.count > 0, route);
      assert.deepEqual(result.misses, [], `${route} ${width} ${JSON.stringify(result.misses)}`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
