import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
const widths = [360, 390, 1280];

function contentType(file) {
  const types = {
    ".css": "text/css",
    ".js": "text/javascript",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".png": "image/png"
  };
  return types[path.extname(file)] || "text/html";
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
      response.writeHead(200, { "Content-Type": contentType(file) }).end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)).then(() => server);
}

function editionRoutes() {
  const yearDir = path.resolve("_site/2026");
  const routes = [];
  for (const month of readdirSync(yearDir)) {
    for (const day of readdirSync(path.join(yearDir, month))) {
      const file = path.join(yearDir, month, day, "index.html");
      if (!existsSync(file)) continue;
      const html = readFileSync(file, "utf8");
      const card = html.includes('class="oc"') || html.includes('class="card');
      if (card) routes.push(`/2026/${month}/${day}/`);
    }
  }
  return routes;
}

function closedSourceProblems() {
  function hasBox(el) {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  }
  function faceRows(card) {
    return [...card.querySelectorAll(":scope > .src")];
  }
  function outside(rowBox, cardBox) {
    return rowBox.top < cardBox.top - 1
      || rowBox.bottom > cardBox.bottom + 1
      || rowBox.left < cardBox.left - 1
      || rowBox.right > cardBox.right + 1;
  }
  function covered(row, rowBox) {
    const x = rowBox.left + rowBox.width / 2;
    const y = rowBox.top + rowBox.height / 2;
    const hit = document.elementFromPoint(x, y);
    return !hit || (hit !== row && !row.contains(hit));
  }
  function placement(card, row) {
    row.scrollIntoView({ block: "center", inline: "nearest" });
    const rowBox = row.getBoundingClientRect();
    if (rowBox.width < 1 || rowBox.height < 1) return "zero box";
    const style = getComputedStyle(row);
    if (style.display === "none" || style.visibility === "hidden") return "hidden";
    if (outside(rowBox, card.getBoundingClientRect())) return "outside";
    if (covered(row, rowBox)) return "covered";
    return "";
  }
  function bodyShown(card) {
    const body = card.querySelector(":scope > details > .oc-body");
    return Boolean(body && body.textContent.trim() && hasBox(body));
  }
  function openProblem(card) {
    const details = card.querySelector(":scope > details");
    if (!details) return "";
    details.open = true;
    const opened = faceRows(card).length;
    const hidden = !bodyShown(card) && card.querySelector(".oc-body")?.textContent.trim();
    details.open = false;
    if (opened !== 1) return `${card.id} duplicate ${opened}`;
    if (hidden) return `${card.id} body hidden while open`;
    return "";
  }
  function cardProblem(card) {
    const rows = faceRows(card);
    if (rows.length !== 1) {
      return card.classList.contains("oc") ? `${card.id || "card"} count ${rows.length}` : "";
    }
    const details = card.querySelector(":scope > details");
    if (details) details.open = false;
    if (bodyShown(card)) return `${card.id} body visible while closed`;
    const closed = placement(card, rows[0]);
    if (closed) return `${card.id} ${closed}`;
    return openProblem(card);
  }
  const problems = [];
  for (const card of document.querySelectorAll(".board > .oc, article.card")) {
    const problem = cardProblem(card);
    if (problem) problems.push(problem);
  }
  return problems;
}

test("closed edition cards keep one visible sources row inside the card", async () => {
  const routes = editionRoutes();
  assert.ok(routes.length > 0, "edition routes");
  const server = await serveBuiltSite();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox"]
  });
  const failures = [];
  try {
    const page = await browser.newPage();
    for (const width of widths) {
      await page.setViewport({ width, height: 900 });
      for (const route of routes) {
        await page.goto(origin + route, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        const problems = await page.evaluate(closedSourceProblems);
        for (const problem of problems) failures.push(`${width} ${route} ${problem}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  assert.deepEqual(failures, []);
});
