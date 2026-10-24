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

function watchEmail(page, leaks) {
  page.on("request", request => {
    const blob = `${request.url()} ${request.postData() || ""}`;
    const hit = blob.includes("reader@example.com") || blob.includes("reader%40example.com");
    if (hit) leaks.push(blob);
  });
}

test("signup submits nothing, stays under the lead, and the mobile bar can close", {
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
    await assertMobileSubmit(browser, origin);
    await assertMobileBar(browser, origin);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

async function assertDesktopLead(browser, origin) {
  const page = await browser.newPage();
  await open(page, origin, "/", 1280);
  const box = await page.evaluate(() => {
    const form = document.querySelector(".signup--lead");
    const action = document.querySelector(".front-lead .front-action");
    return {
      width: document.documentElement.scrollWidth,
      below: form.getBoundingClientRect().top >= action.getBoundingClientRect().bottom - 1,
      value: form.querySelector(".signup-value").textContent,
      barFixed: !!document.querySelector(".signup--bar.is-fixed")
    };
  });
  assert.ok(box.width <= 1280, String(box.width));
  assert.equal(box.below, true);
  assert.match(box.value, /in your inbox each morning/);
  assert.equal(box.barFixed, false);
  await page.close();
}

async function assertMobileSubmit(browser, origin) {
  const page = await browser.newPage();
  const leaks = [];
  watchEmail(page, leaks);
  await open(page, origin, "/", 390);
  await page.evaluate(() => {
    document.querySelector(".signup--lead").scrollIntoView({ block: "center" });
  });
  await page.waitForFunction(() => !document.querySelector(".signup--bar.is-fixed"));
  await page.locator(".signup--lead input[type=email]").fill("reader@example.com");
  await page.locator(".signup--lead button[type=submit]").click();
  await page.waitForFunction(() => {
    return document.querySelector(".signup--lead .signup-status").textContent;
  });
  const result = await page.evaluate(() => ({
    status: document.querySelector(".signup--lead .signup-status").textContent,
    kept: document.querySelector(".signup--lead input[type=email]").value,
    path: location.pathname,
    done: localStorage.getItem("abSignupDone"),
    width: document.documentElement.scrollWidth,
    overlap: (() => {
      const bar = document.querySelector(".signup--bar.is-fixed");
      const action = document.querySelector(".front-lead .front-action");
      if (!bar || !action) return false;
      const a = action.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      return a.bottom > b.top && a.top < b.bottom;
    })()
  }));
  assert.match(result.status, /Nothing was sent/);
  assert.equal(result.kept, "reader@example.com");
  assert.equal(result.path, "/");
  assert.equal(result.done, null);
  assert.deepEqual(leaks, []);
  assert.ok(result.width <= 390, String(result.width));
  assert.equal(result.overlap, false);
  await page.close();
}

async function assertMobileBar(browser, origin) {
  const home = readFileSync("_site/index.html", "utf8");
  const edition = home.match(/href="(\/\d{4}\/\d{2}\/\d{2}\/)/)[1];
  const page = await browser.newPage();
  await open(page, origin, edition, 390);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForSelector(".signup--bar.is-fixed");
  const shown = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    label: document.querySelector(".signup--bar .signup-dismiss").textContent,
    value: document.querySelector(".signup--bar .signup-value").textContent
  }));
  assert.ok(shown.width <= 390, String(shown.width));
  assert.equal(shown.label, "Close");
  assert.match(shown.value, /Free\.$/);
  await page.locator(".signup--bar .signup-dismiss").click();
  await page.waitForSelector(".signup--bar.is-fixed", { hidden: true });
  const dismissed = await page.evaluate(() => localStorage.getItem("abSignupBarDismissed"));
  assert.equal(dismissed, "1");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForFunction(() => {
    return document.querySelector("form[data-signup='bar']")?.hidden === true;
  });
  await page.close();
}
