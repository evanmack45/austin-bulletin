import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const LINKS = [
  ["/zilker-park-access/", "Zilker entrances, closures & parking"],
  ["/vote-2026/", "Vote 2026: dates & official instructions"],
  ["https://yallcityhall.org/meetings/2026-11-05/", "City Council on November 5"],
  ["/election/2026-11-03/", "November 3, 2026 election results"],
  ["/austin-council-races-2026/", "The five Council races on the 2026 ballot"],
  ["/austin-bonds-2026/", "Propositions A and B: the parks and library bonds"],
  ["/austin-charter-2026/", "Propositions C through J: the charter amendments"],
  ["/austin-city-budget-2027/", "The 2026-27 city budget and what it costs you"],
  ["/aisd-state-intervention/", "Austin ISD and the state: what happens next"],
  ["/muny-2026/", "The Muny deal: Austin, UT and Lions Municipal"],
  ["/feed.xml", "Follow the morning editions by RSS"]
];

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((executable) => existsSync(executable));

function guideRegion(archive) {
  const start = archive.indexOf('id="guides"');
  const end = archive.indexOf('id="search"');
  assert.ok(start !== -1 && end > start);
  return archive.slice(start, end);
}

function assertLabels(html, links) {
  let cursor = -1;
  for (const [href, label] of links) {
    const at = html.indexOf(`href="${href}"`);
    assert.ok(at > cursor, href);
    assert.ok(html.includes(`>${label}</a>`), label);
    cursor = at;
  }
}

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

function readGuide(page) {
  return page.evaluate(() => {
    const root = document.querySelector("#guides");
    const details = document.querySelector("#guide-more");
    const summary = details.querySelector("summary");
    const box = summary.getBoundingClientRect();
    const style = getComputedStyle(summary);
    const links = [...root.querySelectorAll(".guide-list a")];
    const visible = links.filter((link) => link.checkVisibility());
    const right = visible.reduce((edge, link) => {
      return Math.max(edge, link.getBoundingClientRect().right);
    }, 0);
    return {
      total: links.length,
      labels: visible.map((link) => link.textContent.trim()),
      open: details.open,
      summaryText: summary.innerText.trim(),
      summaryShown: summary.checkVisibility(),
      width: box.width,
      height: box.height,
      fontSize: parseFloat(style.fontSize),
      transform: style.textTransform,
      letterSpacing: style.letterSpacing,
      color: style.color,
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      right
    };
  });
}

async function openArchive(browser, origin, width) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 844 });
  await page.goto(`${origin}/archive/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
  return page;
}

function assertFits(state) {
  assert.equal(state.total, LINKS.length);
  assert.ok(state.scroll <= state.viewport, `${state.scroll} > ${state.viewport}`);
  assert.ok(state.right <= state.viewport + 1, `link right ${state.right}`);
}

function assertCollapsed(state) {
  assertFits(state);
  assert.deepEqual(state.labels, LINKS.slice(0, 4).map((item) => item[1]));
  assert.equal(state.open, false);
  assert.equal(state.summaryShown, true);
  assert.equal(state.summaryText, "More");
  assert.ok(state.width >= 44 && state.height >= 44, `${state.width}x${state.height}`);
  assert.ok(state.fontSize >= 16, `font ${state.fontSize}`);
  assert.equal(state.transform, "none");
  assert.ok(state.letterSpacing === "normal" || state.letterSpacing === "0px");
  assert.match(state.color, /rgb\(27,\s*27,\s*27\)/);
}

test("the archive keeps guide labels and collapses the tail", () => {
  const guides = guideRegion(readFileSync("src/archive.njk", "utf8"));
  const split = guides.indexOf('<details class="guide-more" id="guide-more">');
  assert.ok(split > 0);
  const head = guides.slice(0, split);
  const tail = guides.slice(split);
  assertLabels(head, LINKS.slice(0, 4));
  assertLabels(tail, LINKS.slice(4));
  for (const [href] of LINKS.slice(0, 4)) assert.equal(tail.includes(`href="${href}"`), false);
  for (const [href] of LINKS.slice(4)) assert.equal(head.includes(`href="${href}"`), false);
  assert.match(tail, /<span class="guide-more-label">More<\/span>/);
  assert.match(tail, /<span class="guide-fewer-label">Fewer<\/span>/);
  assert.match(tail, /matchMedia\("\(min-width: 761px\)"\)/);
  assert.match(tail, /more\.open = true/);
  assert.doesNotMatch(tail, /\.open = false/);
});

test("the More control is 44px, sentence case, and hidden once open on desktop", () => {
  const css = readFileSync("src/css/style.css", "utf8");
  const summary = css.match(/\.guide-more > summary \{[^}]*\}/)?.[0] ?? "";
  assert.match(summary, /min-height:\s*44px/);
  assert.match(summary, /min-width:\s*44px/);
  assert.match(summary, /font-size:\s*1rem/);
  assert.match(summary, /text-transform:\s*none/);
  assert.match(summary, /letter-spacing:\s*0/);
  assert.match(summary, /color:\s*var\(--ink\)/);
  assert.doesNotMatch(css, /text-transform:\s*uppercase/i);
  assert.match(
    css,
    /@media \(min-width:\s*761px\) \{\s*\.guide-more\[open\] > summary \{ display: none; \}\s*\}/
  );
});

test("a phone shows four archive guides until More, and desktop shows all", {
  skip: !chrome && "an installed Chromium is required"
}, async () => {
  const server = await serveBuiltSite();
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true, args: ["--no-sandbox"]
  });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const phone = await openArchive(browser, origin, 390);
    assertCollapsed(await readGuide(phone));
    await phone.setViewport({ width: 1280, height: 900 });
    await phone.waitForFunction(() => document.getElementById("guide-more").open);
    const widened = await readGuide(phone);
    assertFits(widened);
    assert.deepEqual(widened.labels, LINKS.map((item) => item[1]));
    assert.equal(widened.open, true);
    assert.equal(widened.summaryShown, false);
    await phone.setViewport({ width: 390, height: 844 });
    await phone.reload({ waitUntil: "domcontentloaded" });
    await phone.evaluate(() => (document.fonts ? document.fonts.ready : null));
    assertCollapsed(await readGuide(phone));
    await phone.$eval("#guide-more summary", (summary) => summary.click());
    const opened = await readGuide(phone);
    assertFits(opened);
    assert.deepEqual(opened.labels, LINKS.map((item) => item[1]));
    assert.equal(opened.open, true);
    assert.equal(opened.summaryText, "Fewer");
    assert.equal(opened.summaryShown, true);
    assert.ok(opened.height >= 44 && opened.width >= 44);
    const rows = await phone.evaluate(() => {
      const links = [...document.querySelectorAll("#guides .guide-list a")];
      return links.map((link, index) => {
        const box = link.getBoundingClientRect();
        const next = links[index + 1]?.getBoundingClientRect();
        return {
          height: box.height,
          gap: next ? next.top - box.bottom : null
        };
      });
    });
    assert.equal(rows.length, LINKS.length);
    for (const row of rows) {
      assert.ok(row.height >= 44, `guide hit ${row.height}`);
      if (row.gap != null) assert.ok(row.gap >= -0.5, `overlap ${row.gap}`);
    }
    assert.ok(rows[0].height < 50, `single line ${rows[0].height}`);
    assert.ok(rows[5].height >= rows[0].height + 16, `wrapped row ${rows[5].height}`);
    await phone.close();
    const desktop = await openArchive(browser, origin, 1280);
    const wide = await readGuide(desktop);
    assertFits(wide);
    assert.deepEqual(wide.labels, LINKS.map((item) => item[1]));
    assert.equal(wide.open, true);
    assert.equal(wide.summaryShown, false);
    await desktop.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
