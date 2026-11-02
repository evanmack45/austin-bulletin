import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((executable) => existsSync(executable));

const routes = ["/", "/2026/11/02/", "/vote-2026/", "/archive/", "/about/"];

function serveBuiltSite() {
  const root = path.resolve("_site");
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(404).end();
      return;
    }
    const types = {
      ".css": "text/css",
      ".js": "text/javascript",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".woff2": "font/woff2",
      ".png": "image/png"
    };
    try {
      const type = types[path.extname(file)] || "text/html";
      response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function overflowScript() {
  const width = document.documentElement.clientWidth;
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    if (box.right > width + 1 || box.left < -1) {
      offenders.push(String(el.className || el.tagName).slice(0, 40));
    }
  }
  return {
    scroll: document.documentElement.scrollWidth,
    client: width,
    offenders: offenders.slice(0, 5)
  };
}

async function setRoot(page, px) {
  await page.evaluate((size) => {
    document.documentElement.style.fontSize = size ? `${size}px` : "";
  }, px);
}

test("reader text doubles with the root font and stays inside a phone", {
  skip: !chrome && "an installed Chromium is required for font-scale checks",
}, async () => {
  const server = await serveBuiltSite();
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true, args: ["--no-sandbox"]
  });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const route of routes) {
      const page = await browser.newPage();
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(origin + route, { waitUntil: "networkidle0" });
      const at100 = await page.evaluate(overflowScript);
      assert.ok(at100.scroll <= at100.client + 1, `${route} 100% ${at100.scroll}`);
      await setRoot(page, 32);
      const at200 = await page.evaluate(overflowScript);
      assert.deepEqual(at200.offenders, [], `${route} 200%`);
      assert.ok(at200.scroll <= at200.client + 1, `${route} 200% scroll ${at200.scroll}`);
      await page.close();
    }
    const home = await browser.newPage();
    await home.setViewport({ width: 375, height: 812 });
    await home.goto(`${origin}/`, { waitUntil: "networkidle0" });
    const before = await home.evaluate(() => ({
      wordmark: parseFloat(getComputedStyle(document.querySelector(".wordmark")).fontSize),
      headline: parseFloat(getComputedStyle(document.querySelector("h1")).fontSize),
      menu: parseFloat(getComputedStyle(document.querySelector(".site-menu-button")).fontSize),
      deck: parseFloat(getComputedStyle(document.querySelector(".front-deck")).fontSize)
    }));
    assert.equal(before.wordmark, 32);
    assert.equal(before.headline, 32);
    assert.equal(before.menu, 16);
    assert.equal(before.deck, 18);
    await setRoot(home, 32);
    const after = await home.evaluate(() => ({
      wordmark: parseFloat(getComputedStyle(document.querySelector(".wordmark")).fontSize),
      headline: parseFloat(getComputedStyle(document.querySelector("h1")).fontSize),
      menu: parseFloat(getComputedStyle(document.querySelector(".site-menu-button")).fontSize),
      deck: parseFloat(getComputedStyle(document.querySelector(".front-deck")).fontSize)
    }));
    assert.equal(after.wordmark, before.wordmark * 2);
    assert.equal(after.headline, before.headline * 2);
    assert.equal(after.menu, before.menu * 2);
    assert.equal(after.deck, before.deck * 2);
    await home.click(".site-menu-button");
    const menu = await home.evaluate(overflowScript);
    assert.deepEqual(menu.offenders, [], "open menu at 200%");
    assert.ok(menu.scroll <= menu.client + 1, `menu scroll ${menu.scroll}`);
    await home.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
