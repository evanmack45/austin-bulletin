import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BLACKLETTER = /unifraktur|blackletter|maguntia|old\s*english|im\s*fell/i;
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((executable) => existsSync(executable));

function header(html) {
  const match = html.match(/<header class="front-masthead">[\s\S]*?<\/header>/);
  assert.ok(match, "page is missing the shared masthead");
  return match[0];
}

function linkedStyles(html) {
  return [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
}

test("edition pages use the homepage masthead and do not reference a blackletter font", () => {
  const home = readFileSync("_site/index.html", "utf8");
  const edition = readFileSync("_site/2026/10/27/index.html", "utf8");
  assert.equal(header(edition), header(home));
  assert.match(header(home), /The Austin Bulletin/);
  assert.match(header(home), /class="masthead-dateline"/);
  assert.match(header(home), /href="\/"/);
  assert.match(header(home), /href="\/vote-2026\/"/);
  assert.match(header(home), /href="\/archive\/"/);
  assert.match(header(home), /href="\/subscribe\/"/);
  assert.match(home, /class="cover-chrome home-front"/);
  assert.match(edition, /class="cover-chrome edition-page"/);
  const homeCss = linkedStyles(home);
  const editionCss = linkedStyles(edition);
  assert.deepEqual(editionCss, homeCss);
  assert.ok(editionCss.includes("/css/front-cover.css"));
  assert.ok(editionCss.includes("/css/style.css"));

  const css = editionCss.map((href) => readFileSync(`_site${href}`, "utf8")).join("\n");
  assert.doesNotMatch(edition, BLACKLETTER);
  assert.doesNotMatch(css, BLACKLETTER);
  assert.doesNotMatch(css, /@font-face\{font-family:(?!Bricolage|Hanken)/);
  assert.match(css, /font-family:Bricolage/);
  assert.match(css, /font-family:Hanken/);

  assert.match(edition, /datetime="2026-10-27">October 27, 2026</);
  const markdown = readFileSync("src/bulletins/2026-10-27.md", "utf8");
  const urls = [...markdown.matchAll(/https?:\/\/[^"\s)<]+/g)].map((match) => match[0]);
  assert.ok(urls.length >= 4);
  for (const url of urls) assert.ok(edition.includes(url), url);
  assert.equal(
    edition.split('class="if-you"').length - 1,
    markdown.split('class="if-you"').length - 1
  );
  assert.equal(
    edition.split('class="source-line"').length - 1,
    markdown.split('class="source-line"').length - 1
  );
  const corrected = readFileSync("_site/2026/10/13/index.html", "utf8");
  assert.match(corrected, /class="correction"/);
  assert.match(corrected, /an earlier version said the Council sent the package/);
  assert.match(header(corrected), /The Austin Bulletin/);
});

function serveBuiltSite() {
  const root = path.resolve("_site");
  const types = {
    ".css": "text/css",
    ".html": "text/html",
    ".woff2": "font/woff2",
    ".js": "text/javascript",
    ".svg": "image/svg+xml",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const ext = path.extname(file);
      response.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" })
        .end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const chromeProps = [
  [".front-masthead", ["display", "backgroundColor", "padding", "borderBottomWidth", "maxWidth"]],
  [".front-masthead .wordmark", [
    "fontFamily", "fontSize", "fontWeight", "letterSpacing", "color", "textAlign",
  ]],
  [".masthead-dateline", [
    "fontFamily", "fontSize", "fontWeight", "textTransform", "color", "textAlign",
  ]],
  [".site-menu-panel a", ["fontFamily", "fontSize", "fontWeight", "color", "padding"]],
];

test("homepage and edition mastheads compute the same styles at 390 and 1440", {
  skip: !chrome && "an installed Chromium is required for masthead comparison",
}, async () => {
  const server = await serveBuiltSite();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [1440, 390]) {
      const read = async (route) => {
        const page = await browser.newPage();
        await page.setViewport({ width, height: 900 });
        await page.setJavaScriptEnabled(false);
        await page.goto(origin + route, { waitUntil: "networkidle0" });
        await page.evaluate(() => document.fonts.ready);
        const styles = await page.evaluate((groups) => {
          const out = {};
          for (const [selector, props] of groups) {
            const el = document.querySelector(selector);
            const cs = getComputedStyle(el);
            out[selector] = Object.fromEntries(props.map((prop) => [prop, cs[prop]]));
          }
          out.nav = [...document.querySelectorAll(".front-masthead nav a")].map((link) => ({
            text: link.textContent,
            href: link.getAttribute("href"),
          }));
          out.fonts = [...document.fonts].map((font) => font.family);
          return out;
        }, chromeProps);
        await page.close();
        return styles;
      };
      const home = await read("/");
      const edition = await read("/2026/10/27/");
      assert.deepEqual(edition.nav, home.nav, `nav at ${width}`);
      for (const [selector] of chromeProps) {
        assert.deepEqual(edition[selector], home[selector], `${selector} at ${width}`);
      }
      assert.ok(edition.fonts.some((family) => family.includes("Bricolage")), "Bricolage loads");
      assert.ok(edition.fonts.some((family) => family.includes("Hanken")), "Hanken loads");
      assert.ok(
        edition.fonts.every((family) => !BLACKLETTER.test(family)),
        edition.fonts.join(",")
      );
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
