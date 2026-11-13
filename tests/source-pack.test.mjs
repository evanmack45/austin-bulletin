import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
const widths = [360, 390, 1280];
const routes = ["/", "/2026/11/12/", "/2026/11/13/"];

function serveBuiltSite() {
  const root = path.resolve("_site");
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    try {
      const types = {
        ".css": "text/css",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".png": "image/png"
      };
      const type = types[path.extname(file)] || "text/html";
      response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)).then(() => server);
}

function rowProblems() {
  function textBox(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect();
  }
  function flexProblems(row) {
    const problems = [];
    const flexes = [row, ...row.querySelectorAll(".source-group, .source-chunk")];
    for (const el of flexes) {
      const style = getComputedStyle(el);
      if (!style.display.includes("flex")) continue;
      if (style.justifyContent === "space-between") problems.push("space-between");
      if (style.alignItems === "stretch") problems.push("stretch");
      for (const child of el.children) {
        if (Number(getComputedStyle(child).flexGrow) > 0) problems.push("grow");
      }
    }
    return problems;
  }
  function visibleLinks(row) {
    return [...row.querySelectorAll("a")].filter((link) => {
      const box = link.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
  }
  function linkProblems(row) {
    const problems = [];
    const rowBox = row.getBoundingClientRect();
    for (const link of visibleLinks(row)) {
      const box = link.getBoundingClientRect();
      if (box.height < 44) problems.push("short");
      if (box.top < rowBox.top - 1 || box.bottom > rowBox.bottom + 1) problems.push("spill");
      if (textBox(link).height > 28) problems.push("wrap");
    }
    return problems;
  }
  function gapProblems(links) {
    const problems = [];
    for (let index = 1; index < links.length; index += 1) {
      const gap = links[index].getBoundingClientRect().left
        - links[index - 1].getBoundingClientRect().right;
      if (gap < 12 || gap > 28) problems.push(`gap ${Math.round(gap)}`);
    }
    return problems;
  }
  return [...document.querySelectorAll(".source-line, .srcline, .src")].flatMap((row) => {
    const links = [...row.querySelectorAll("a")].filter((link) => {
      const box = link.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
    const label = row.querySelector(".source-label, .src-k");
    const problems = [...flexProblems(row), ...linkProblems(row), ...gapProblems(links)];
    if (label && links[0]) {
      const shift = Math.abs(textBox(label).top - textBox(links[0]).top);
      if (shift > 2) problems.push(`baseline ${Math.round(shift)}`);
    }
    if (!problems.length) return [];
    const text = row.textContent.replace(/\s+/g, " ").trim().slice(0, 70);
    return [`${text}: ${problems.join(", ")}`];
  });
}

test("source rows pack left on one baseline", async () => {
  const server = await serveBuiltSite();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox"]
  });
  const page = await browser.newPage();
  const failures = [];
  for (const width of widths) {
    await page.setViewport({ width, height: 1400 });
    for (const route of routes) {
      await page.goto(origin + route, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => typeof window.packSourceRows === "function");
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.packSourceRows();
      });
      const problems = await page.evaluate(rowProblems);
      for (const problem of problems) failures.push(`${width} ${route} ${problem}`);
    }
  }
  await browser.close();
  server.close();
  assert.deepEqual(failures, []);
});
