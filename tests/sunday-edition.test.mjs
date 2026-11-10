import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { editionSignup } from "../scripts/edition-chrome.mjs";

const CHROME = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((executable) => statSync(executable, { throwIfNoEntry: false })?.isFile());

test("the edition signup follows the third story on every date", () => {
  const html = [
    '<section class="big-story"><h3 id="lead">Lead</h3><p>L.</p></section>',
    '<div class="river river--tiered">',
    '<h4 id="hall">Hall</h4>',
    '<h5 id="one">One</h5><p>A.</p>',
    '<h5 id="two">Two</h5><p>B.</p>',
    '<h4 id="next">Next</h4>',
    '<h5 id="three">Three</h5><p>C.</p>',
    "</div>"
  ].join("");
  const placed = editionSignup(html);
  const signup = placed.indexOf('class="signup signup--edition"');
  assert.ok(placed.indexOf('id="two"') < signup);
  assert.ok(signup < placed.indexOf('id="next"'));
  assert.ok(signup < placed.indexOf('id="three"'));
  assert.equal(placed.split('class="signup signup--edition"').length - 1, 1);
  assert.equal(editionSignup(placed), placed);
  const short = editionSignup('<section class="big-story"><h3 id="lead">Lead</h3></section>');
  assert.ok(short.indexOf('id="lead"') < short.indexOf('class="signup signup--edition"'));
  assert.equal(short.split('class="signup signup--edition"').length - 1, 1);
});

test("November 8 story prose is Georgia and the back page is open", () => {
  const css = readFileSync("src/css/front-cover.css", "utf8");
  assert.match(css, /\.edition-page \.river > p/);
  assert.match(css, /font-family: Georgia, "Times New Roman", serif/);
  assert.match(
    css,
    /\.edition-page \.the-number:not\(:has\(p\)\):not\(\.the-number--figure\)::before/
  );
  const page = readFileSync("_site/2026/11/08/index.html", "utf8");
  assert.match(page, /class="bulletin bulletin--2026-11-08"/);
  assert.equal(page.includes("The Number:"), false);
  assert.match(page, /\$25 million<\/strong> in state funds the Nov\. 19 draft would accept/);
  assert.match(page, /not an approved sum/);
  assert.match(
    page,
    /lists that \$25 million as the total estimated project cost, plus any cost overruns/
  );
  assert.doesNotMatch(page, /separate estimated project cost/);
  assert.doesNotMatch(page, /separate from \$25 million/);
  assert.match(page, /id=484837/);
  assert.match(page, /id=472487/);
  assert.match(page, /new-affordable-menchaca-townhomes/);
  const friday = readFileSync("_site/2026/11/06/index.html", "utf8");
  assert.equal(friday.includes("bulletin--2026-11-08"), false);
});

function serveSite() {
  const root = path.resolve("_site");
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(404).end();
      return;
    }
    const types = { ".css": "text/css", ".html": "text/html", ".woff2": "font/woff2" };
    try {
      const type = types[path.extname(file)] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const SUNDAY_TYPE = `(() => {
  const style = (selector) => getComputedStyle(document.querySelector(selector));
  const before = (selector) => getComputedStyle(document.querySelector(selector), "::before");
  return {
    story: style(".legacy-copy p").fontFamily,
    storySize: style(".legacy-copy p").fontSize,
    signup: style(".signup--edition p").fontFamily,
    datumSize: style(".the-number strong").fontSize,
    datumColor: style(".the-number strong").color,
    datumBorder: style(".the-number").borderLeftWidth,
    datumTop: style(".the-number").borderTopWidth,
    datumBg: style(".the-number").backgroundColor,
    tab: before(".the-number").content,
    heading: style(".countdown strong").fontFamily,
    headingSize: style(".countdown strong").fontSize
  };
})()`;

test("November 8 renders Georgia prose and an open back page", { skip: !CHROME }, async () => {
  const server = await serveSite();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, args: ["--no-sandbox"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${origin}/2026/11/08/`, { waitUntil: "networkidle0" });
  const phone = await page.evaluate(SUNDAY_TYPE);
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  const desk = await page.evaluate(SUNDAY_TYPE);
  await page.goto(`${origin}/2026/11/06/`, { waitUntil: "networkidle0" });
  const friday = await page.evaluate(
    "getComputedStyle(document.querySelector('.legacy-copy p')).fontFamily"
  );
  await browser.close();
  server.close();
  assert.match(phone.story, /Georgia/);
  assert.equal(phone.storySize, "18px");
  assert.equal(desk.storySize, "18px");
  assert.doesNotMatch(phone.signup, /Georgia/);
  assert.equal(phone.datumSize, "18px");
  assert.equal(desk.datumSize, "18px");
  assert.notEqual(phone.datumColor, "rgb(200, 16, 46)");
  assert.equal(phone.datumBorder, "0px");
  assert.equal(phone.datumTop, "1px");
  assert.equal(phone.datumBg, "rgba(0, 0, 0, 0)");
  assert.equal(phone.tab, "\"The Number\"");
  assert.equal(desk.tab, "\"The Number\"");
  assert.match(phone.heading, /Bricolage/);
  assert.equal(phone.headingSize, "20px");
  assert.match(friday, /Georgia/);
});
