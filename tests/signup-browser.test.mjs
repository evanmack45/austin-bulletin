import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
  .find(executable => existsSync(executable));
const TYPES = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".xml": "application/xml", ".webmanifest": "application/manifest+json"
};
const EMBED = "https://the-austin-bulletin.kit.com/e956043af1/index.js";

function startServer() {
  const root = path.resolve("_site");
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const rel = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const type = TYPES[path.extname(file)] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function open(page, origin, route, width) {
  await page.setViewport({ width, height: width >= 900 ? 900 : 844, deviceScaleFactor: 1 });
  await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector("html[data-signup-ready]");
}

function blockKit(page) {
  const posts = [];
  return page.setRequestInterception(true).then(() => {
    page.on("request", request => {
      const url = request.url();
      const kit = url.includes("kit.com") || url.includes("convertkit.com");
      if (kit && request.method() === "POST") posts.push(url);
      if (kit) {
        request.abort();
        return;
      }
      request.continue();
    });
    return posts;
  });
}

test("the Kit embed sits under the lead and the phone bar can close", {
  skip: !chrome && "an installed Chromium is required for signup layout"
}, async () => {
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true,
    args: process.platform === "linux" ? ["--no-sandbox"] : []
  });
  try {
    await assertDesktopLead(browser, origin);
    await assertMobileLead(browser, origin);
    await assertMobileBar(browser, origin);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

async function assertDesktopLead(browser, origin) {
  const page = await browser.newPage();
  const posts = await blockKit(page);
  await open(page, origin, "/", 1280);
  const box = await page.evaluate(() => {
    const block = document.querySelector("aside .signup--lead");
    const script = block.querySelector("script[data-uid='e956043af1']");
    return {
      width: document.documentElement.scrollWidth,
      placed: !!block,
      value: block.querySelector(".signup-value").textContent,
      src: script?.src || "",
      barFixed: !!document.querySelector(".signup--bar.is-fixed")
    };
  });
  assert.ok(box.width <= 1280, String(box.width));
  assert.equal(box.placed, true);
  assert.match(box.value, /Austin in 5 minutes, every morning/);
  assert.equal(box.src, EMBED);
  assert.equal(box.barFixed, false);
  assert.equal(posts.length, 0);
  await page.close();
}

async function assertMobileLead(browser, origin) {
  const page = await browser.newPage();
  const posts = await blockKit(page);
  await open(page, origin, "/", 390);
  await page.evaluate(() => {
    document.querySelector(".signup--lead").scrollIntoView({ block: "center" });
  });
  await page.waitForFunction(() => !document.querySelector(".signup--bar.is-fixed"));
  const result = await page.evaluate(() => {
    const block = document.querySelector(".signup--lead");
    const action = document.querySelector(".front-lead .front-action");
    const bar = document.querySelector(".signup--bar.is-fixed");
    const overlap = bar && action
      ? action.getBoundingClientRect().bottom > bar.getBoundingClientRect().top
        && action.getBoundingClientRect().top < bar.getBoundingClientRect().bottom
      : false;
    return {
      src: block.querySelector("script[data-uid='e956043af1']")?.getAttribute("src"),
      path: location.pathname,
      width: document.documentElement.scrollWidth,
      below: block.getBoundingClientRect().top >= action.getBoundingClientRect().bottom - 1,
      overlap,
      inputs: block.querySelectorAll("input[type=email]").length
    };
  });
  assert.equal(result.src, EMBED);
  assert.equal(result.below, true);
  assert.equal(result.path, "/");
  assert.equal(result.inputs, 0);
  assert.ok(result.width <= 390, String(result.width));
  assert.equal(result.overlap, false);
  assert.equal(posts.length, 0);
  await page.close();
}

async function assertMobileBar(browser, origin) {
  const home = readFileSync("_site/index.html", "utf8");
  const edition = home.match(/href="(\/\d{4}\/\d{2}\/\d{2}\/)/)[1];
  const page = await browser.newPage();
  const posts = await blockKit(page);
  await open(page, origin, edition, 390);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForSelector(".signup--bar.is-fixed");
  const shown = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    label: document.querySelector(".signup--bar .signup-dismiss").textContent,
    value: document.querySelector(".signup--bar .signup-value").textContent,
    src: document.querySelector(".signup--bar script[data-uid='e956043af1']")?.src || ""
  }));
  assert.ok(shown.width <= 390, String(shown.width));
  assert.equal(shown.label, "Close");
  assert.match(shown.value, /Free\.$/);
  assert.equal(shown.src, EMBED);
  await page.locator(".signup--bar .signup-dismiss").click();
  await page.waitForSelector(".signup--bar.is-fixed", { hidden: true });
  const dismissed = await page.evaluate(() => localStorage.getItem("abSignupBarDismissed"));
  assert.equal(dismissed, "1");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForFunction(() => {
    return document.querySelector("[data-signup='bar']")?.hidden === true;
  });
  assert.equal(posts.length, 0);
  await page.close();
}
