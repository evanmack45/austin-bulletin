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

async function signupSlot(page) {
  return page.evaluate(() => {
    const main = document.querySelector(".paper-main");
    const sequence = [...main.querySelectorAll(
      ".front-lead h1, .front-story h3, .signup--lead, h2.front-section-head"
    )].map((el) => (
      el.classList.contains("signup--lead") ? "signup" : el.textContent.trim()
    ));
    return {
      sequence,
      forms: document.querySelectorAll("form.signup-form").length,
      blocks: main.querySelectorAll(".signup").length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
}

function assertSignupSlot(slot) {
  const stories = slot.sequence.filter((item) => (
    item !== "signup" && item !== "News" && item !== "Notices"
  ));
  assert.deepEqual(stories, [
    "Austin's 48th homicide of 2026 came a week before 2025's.",
    "Austin will rewrite APD's rules on working with U.S. Immigration and Customs " +
      "Enforcement (ICE) before Hinojosa takes office, KUT reports.",
    "Council's Nov. 19 draft agenda: Muny-UT deal changes, a $25 million trail " +
      "boardwalk and a $55 million Bulletin sum for Hornsby Bend.",
    "Ten affordable townhomes for sale break ground on Menchaca Road, with " +
      "2-bedrooms capped at $253,000.",
    "Police charge two in Northeast Austin copper-cable thefts and seek one of " +
      "them; a separate East Seventh café burglary is charged.",
    "Senfronia Thompson says she has the votes to be Texas House speaker after " +
      "Democrats won the chamber.",
    "Veterans parade steps off at 9 this morning; expect downtown closures.",
    "Cyclovia ATX brings a mile-long bike parade to Windsor Park today."
  ]);
  const signupAt = slot.sequence.indexOf("signup");
  const before = slot.sequence.filter((item, index) => index < signupAt && item !== "News");
  assert.equal(before.length, 3);
  assert.equal(slot.sequence[signupAt + 1].startsWith("Ten affordable townhomes"), true);
  const speaker = slot.sequence.findIndex((item) => item.startsWith("Senfronia Thompson"));
  assert.equal(slot.sequence[speaker + 1], "Notices");
  assert.equal(slot.forms, 1);
  assert.equal(slot.blocks, 1);
  assert.ok(slot.overflow <= 1, `horizontal overflow ${slot.overflow}`);
}

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
      forms: document.querySelectorAll("form.signup-form").length,
      bar: !!document.querySelector(".signup--bar"),
      formTop: formBox.top,
      photoBottom: document.querySelector(".front-lead .lead-photo")
        ?.getBoundingClientRect().bottom ?? 0,
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
  assert.match(box.value, /Get the morning email\./);
  assert.equal(box.inAside, false);
  assert.equal(box.footerForm, false);
  assert.equal(box.forms, 1);
  assert.equal(box.bar, false);
  assert.equal(box.sky, false);
  assert.ok(
    box.formTop >= box.photoBottom - 1,
    `signup stays under the lead visual: form ${box.formTop}, chart ${box.photoBottom}`
  );
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
  assertSignupSlot(await signupSlot(page));
  await page.close();
}

async function assertMobileLead(browser, origin) {
  const page = await browser.newPage();
  const posts = await blockKit(page);
  await open(page, origin, "/", 390);
  const fold = await page.evaluate(() => {
    const lead = document.querySelector(".front-lead h1").getBoundingClientRect();
    const signup = document.querySelector(".paper-main .signup--lead");
    const stories = [...document.querySelectorAll(".front-lead h1, .front-story h3")];
    const before = stories.filter((el) => (
      el.compareDocumentPosition(signup) & Node.DOCUMENT_POSITION_FOLLOWING
    ));
    const third = before[before.length - 1]?.getBoundingClientRect();
    return {
      topBottom: lead.bottom,
      signupTop: signup.getBoundingClientRect().top,
      followedBottom: third?.bottom ?? 0,
      storyCount: before.length,
      vh: window.innerHeight,
      sky: !!document.querySelector(".masthead-sky, .masthead-banner")
    };
  });
  assert.equal(fold.sky, false);
  assert.ok(fold.topBottom <= fold.vh, `lead headline below the fold: ${fold.topBottom}`);
  assert.equal(fold.storyCount, 3, `stories before the signup: ${fold.storyCount}`);
  assert.ok(fold.signupTop >= fold.followedBottom - 1, `signup starts at ${fold.signupTop}`);
  await page.evaluate(() => {
    document.querySelector(".signup--lead").scrollIntoView({ block: "center" });
  });
  const result = await page.evaluate(() => {
    const block = document.querySelector(".signup--lead");
    const action = document.querySelector(".front-lead .results-link, .front-lead .front-action");
    const anchor = action || document.querySelector(".front-lead");
    const input = block.querySelector("input[name='email_address']");
    const label = block.querySelector("label");
    return {
      action: block.querySelector("form.signup-form")?.getAttribute("action"),
      path: location.pathname,
      width: document.documentElement.scrollWidth,
      below: block.getBoundingClientRect().top >= anchor.getBoundingClientRect().bottom - 1,
      forms: document.querySelectorAll("form.signup-form").length,
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
  assert.equal(result.forms, 1);
  assert.equal(posts.length, 0);
  assertSignupSlot(await signupSlot(page));
  await page.close();
}

async function assertMobileBar(browser, origin) {
  const home = readFileSync("_site/index.html", "utf8");
  const edition = home.match(/edition-jump"><a href="(\/\d{4}\/\d{2}\/\d{2}\/)/)[1];
  const page = await browser.newPage();
  const posts = await blockKit(page);
  await open(page, origin, edition, 390);
  await page.evaluate(() => window.scrollTo(0, 700));
  const shown = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    forms: document.querySelectorAll("form.signup-form").length,
    bar: !!document.querySelector(".signup--bar"),
    value: document.querySelector(".signup--edition .signup-value")?.textContent || "",
    action: document.querySelector(".signup--edition form.signup-form")
      ?.getAttribute("action") || "",
    field: document.querySelector(".signup--edition input")?.getAttribute("name") || ""
  }));
  assert.ok(shown.width <= 390, String(shown.width));
  assert.equal(shown.forms, 1);
  assert.equal(shown.bar, false);
  assert.match(shown.value, /Get the morning email\./);
  assert.equal(shown.action, ACTION);
  assert.equal(shown.field, "email_address");
  assert.equal(posts.length, 0);
  await page.close();
}
