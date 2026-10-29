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
const ACTION = "https://app.kit.com/forms/10083630/subscriptions";

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
    const block = document.querySelector(".paper-main .signup--lead");
    const form = block.querySelector("form.signup-form");
    const input = form.querySelector("input[name='email_address']");
    const label = form.querySelector("label");
    const formBox = form.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const header = document.querySelector("header.front-masthead");
    return {
      width: document.documentElement.scrollWidth,
      placed: !!block,
      inAside: !!document.querySelector("aside .signup--lead"),
      footerForm: !!document.querySelector(".signup--footer"),
      value: block.querySelector(".signup-value").textContent,
      barFixed: !!document.querySelector(".signup--bar.is-fixed"),
      formTop: formBox.top,
      formBottom: formBox.bottom,
      inputHeight: input.getBoundingClientRect().height,
      labelHeight: labelBox.height,
      labelFor: label.getAttribute("for"),
      inputId: input.id,
      action: form.getAttribute("action"),
      method: form.getAttribute("method"),
      name: input.getAttribute("name"),
      wordmark: header.querySelector(".wordmark").textContent,
      nav: [...header.querySelectorAll(".site-menu-panel a")].map((link) => {
        return link.getAttribute("href");
      }),
      sky: !!document.querySelector(".masthead-sky, .masthead-banner")
    };
  });
  assert.ok(box.width <= 1280, String(box.width));
  assert.equal(box.placed, true);
  assert.match(box.value, /Austin's news in 5 minutes, every morning/);
  assert.equal(box.inAside, false);
  assert.equal(box.footerForm, false);
  assert.equal(box.barFixed, false);
  assert.equal(box.sky, false);
  assert.ok(box.formTop < 900, `form starts at ${box.formTop}`);
  assert.ok(box.formBottom <= 900, `form ends at ${box.formBottom}`);
  assert.ok(box.inputHeight >= 44, String(box.inputHeight));
  assert.ok(box.labelHeight > 0, String(box.labelHeight));
  assert.equal(box.labelFor, box.inputId);
  assert.equal(box.action, ACTION);
  assert.equal(box.method, "post");
  assert.equal(box.name, "email_address");
  assert.match(box.wordmark, /The Austin Bulletin/);
  assert.deepEqual(box.nav, [
    "/",
    "/vote-2026/",
    "https://yallcityhall.org/",
    "/austin-bonds-2026/",
    "/austin-charter-2026/",
    "/austin-city-budget-2027/",
    "/muny-2026/",
    "/zilker-park-access/",
    "/archive/",
    "/about/"
  ]);
  assert.equal(posts.length, 0);
  await page.close();
}

async function assertMobileLead(browser, origin) {
  const page = await browser.newPage();
  const posts = await blockKit(page);
  await open(page, origin, "/", 390);
  const fold = await page.evaluate(() => {
    const top = document.querySelector(".today-top").getBoundingClientRect();
    const signup = document.querySelector(".paper-main .signup--lead").getBoundingClientRect();
    return {
      topBottom: top.bottom,
      signupTop: signup.top,
      vh: window.innerHeight,
      sky: !!document.querySelector(".masthead-sky, .masthead-banner")
    };
  });
  assert.equal(fold.sky, false);
  assert.ok(fold.topBottom <= fold.vh, `top 3 below the fold: ${fold.topBottom}`);
  assert.ok(fold.signupTop < fold.vh * 2, `signup starts at ${fold.signupTop}`);
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
    const input = block.querySelector("input[name='email_address']");
    const label = block.querySelector("label");
    return {
      action: block.querySelector("form.signup-form")?.getAttribute("action"),
      path: location.pathname,
      width: document.documentElement.scrollWidth,
      below: block.getBoundingClientRect().top >= action.getBoundingClientRect().bottom - 1,
      overlap,
      inputs: block.querySelectorAll("input[type=email]").length,
      inputHeight: input.getBoundingClientRect().height,
      labelled: label.getAttribute("for") === input.id
    };
  });
  assert.equal(result.action, ACTION);
  assert.equal(result.below, true);
  assert.equal(result.path, "/");
  assert.equal(result.inputs, 1);
  assert.ok(result.inputHeight >= 44, String(result.inputHeight));
  assert.equal(result.labelled, true);
  assert.ok(result.width <= 390, String(result.width));
  assert.equal(result.overlap, false);
  assert.equal(posts.length, 0);
  await page.close();
}

async function assertMobileBar(browser, origin) {
  const home = readFileSync("_site/index.html", "utf8");
  // The masthead's previous-edition link is the first dated href. The bar
  // belongs on the edition the homepage leads to.
  const edition = home.match(/edition-jump"><a href="(\/\d{4}\/\d{2}\/\d{2}\/)/)[1];
  const page = await browser.newPage();
  const posts = await blockKit(page);
  await open(page, origin, edition, 390);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForSelector(".signup--bar.is-fixed");
  const shown = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    label: document.querySelector(".signup--bar .signup-dismiss").textContent,
    value: document.querySelector(".signup--bar .signup-value").textContent,
    action: document.querySelector(".signup--bar form.signup-form")?.getAttribute("action") || "",
    field: document.querySelector(".signup--bar input")?.getAttribute("name") || ""
  }));
  assert.ok(shown.width <= 390, String(shown.width));
  assert.equal(shown.label, "Close");
  assert.match(shown.value, /Austin's news in 5 minutes, every morning/);
  assert.equal(shown.action, ACTION);
  assert.equal(shown.field, "email_address");
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
