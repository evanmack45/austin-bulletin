import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((executable) => existsSync(executable));

function serveBuiltSite() {
  const root = path.resolve("_site");
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const types = {
        ".css": "text/css",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".woff2": "font/woff2"
      };
      const type = types[path.extname(file)] || "text/html";
      response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const contrastScript = `(() => {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) +
    0.0722 * channel(rgb[2]);
  const paint = (el) => {
    let node = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = bg.match(/rgba?\\((\\d+), (\\d+), (\\d+)(?:, ([\\d.]+))?\\)/);
      const solid = m && (m[4] == null || Number(m[4]) > 0.2);
      if (solid) return [Number(m[1]), Number(m[2]), Number(m[3])];
      node = node.parentElement;
    }
    return [251, 248, 242];
  };
  const failures = [];
  const nodes = document.querySelectorAll(
    "a, .front-asof, .front-kicker, .g-label, .src, figcaption, .edition-kicker, .site-footer");
  for (const el of nodes) {
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (cs.display === "none" || box.width < 1 || box.height < 1) continue;
    const fg = cs.color.match(/rgba?\\((\\d+), (\\d+), (\\d+)/);
    if (!fg) continue;
    const light = Math.max(lum([+fg[1], +fg[2], +fg[3]]), lum(paint(el)));
    const dark = Math.min(lum([+fg[1], +fg[2], +fg[3]]), lum(paint(el)));
    const score = (light + 0.05) / (dark + 0.05);
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const needed = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (score + 0.02 < needed) {
      failures.push({ text: (el.textContent || "").trim().slice(0, 40), score, needed, size });
    }
  }
  return failures.slice(0, 6);
})()`;

const routes = ["/", "/2026/10/24/", "/vote-2026/", "/austin-bonds-2026/", "/muny-2026/"];

test("links and muted labels pass WCAG AA on home, edition, and topic pages", {
  skip: !chrome && "an installed Chromium is required for contrast checks",
}, async () => {
  const server = await serveBuiltSite();
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true, args: ["--no-sandbox"],
  });
  try {
    for (const width of [1280, 390]) {
      for (const route of routes) {
        const page = await browser.newPage();
        await page.setViewport({ width, height: 900 });
        const origin = `http://127.0.0.1:${server.address().port}`;
        await page.goto(origin + route, { waitUntil: "networkidle0" });
        const failures = await page.evaluate((script) => eval(script), contrastScript);
        assert.deepEqual(failures, [], `${route} at ${width}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("phones use 16px body text and 44px menu, footer, and action targets", {
  skip: !chrome && "an installed Chromium is required for tap-target checks",
}, async () => {
  const server = await serveBuiltSite();
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true, args: ["--no-sandbox"],
  });
  try {
    for (const route of routes) {
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844 });
      const origin = `http://127.0.0.1:${server.address().port}`;
      await page.goto(origin + route, { waitUntil: "networkidle0" });
      const button = await page.$eval(".site-menu-button", (el) => ({
        height: el.getBoundingClientRect().height,
        expanded: el.getAttribute("aria-expanded"),
        fontSize: parseFloat(getComputedStyle(el).fontSize)
      }));
      assert.ok(button.height >= 44, `${route} menu button ${button.height}`);
      assert.equal(button.expanded, "false", route);
      assert.ok(button.fontSize >= 16, `${route} menu label ${button.fontSize}`);
      await page.click(".site-menu-button");
      const expanded = await page.$eval(".site-menu-button", (el) =>
        el.getAttribute("aria-expanded"));
      assert.equal(expanded, "true", route);
      const measure = await page.evaluate(() => {
        const selector = ".site-menu-panel a, .site-footer a, .front-action, .beat-nav a";
        const heights = [...document.querySelectorAll(selector)]
          .map((el) => el.getBoundingClientRect().height)
          .filter((height) => height > 0);
        const copy = ".front-deck, .rail-copy p, .morning-note, " +
          ".river h5 + p, .river .story-share + p, " +
          ".river .story-share + figure + p, .bulletin .big-story p";
        const texts = [...document.querySelectorAll(copy)]
          .filter((el) => !el.classList.contains("front-kicker") &&
            el.getBoundingClientRect().height > 0)
          .map((el) => parseFloat(getComputedStyle(el).fontSize));
        const credits = [...document.querySelectorAll(".src a, .source-line a, figcaption a")]
          .map((el) => {
            const box = el.getBoundingClientRect();
            return { width: box.width, height: box.height };
          })
          .filter((box) => box.width > 0 && box.height > 0);
        return {
          heights,
          minText: texts.length ? Math.min(...texts) : 16,
          credits,
        };
      });
      assert.ok(measure.heights.every((height) => height >= 44), route);
      assert.ok(measure.minText >= 16, `${route} body ${measure.minText}`);
      const tiny = measure.credits
        .filter((box) => box.width < 24 || box.height < 24)
        .map((box) => `${box.width}x${box.height}`);
      assert.deepEqual(tiny, [], `${route} credit targets`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
