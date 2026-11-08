// Author measurements for a built _site. These are not an independent review.
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve("_site");
const CHROME = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((executable) => statSync(executable, { throwIfNoEntry: false })?.isFile());

function filesUnder(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) filesUnder(file, out);
    else out.push(file);
  }
  return out;
}

export function siteManifest(root = ROOT) {
  return filesUnder(root).sort().map((file) => {
    const bytes = readFileSync(file);
    return {
      path: path.relative(root, file).replaceAll("\\", "/"),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex")
    };
  });
}

function serve(root) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(404).end();
      return;
    }
    const types = { ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2",
      ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png" };
    try {
      const type = types[path.extname(file)] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const MEASURE = `(() => {
  const box = (el) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      text: el.innerText.replace(/\\s+/g, " ").trim(),
      top: Math.round(rect.top),
      height: Math.round(rect.height),
      width: Math.round(rect.width),
      fontSize: style.fontSize,
      color: style.color,
      display: style.display
    };
  };
  const words = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = new Map();
    let node;
    while ((node = walker.nextNode())) {
      const range = document.createRange();
      let index = 0;
      for (const part of node.textContent.split(/(\\s+)/)) {
        if (!part.trim()) { index += part.length; continue; }
        range.setStart(node, index);
        range.setEnd(node, index + part.length);
        const rect = range.getClientRects()[0];
        if (rect) {
          const top = Math.round(rect.top);
          lines.set(top, [...(lines.get(top) || []), part]);
        }
        index += part.length;
      }
    }
    return [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([top, line]) => ({
      top, text: line.join(" ")
    }));
  };
  const disclosure = document.querySelector(".ai-disclosure a");
  const markers = [...document.querySelectorAll(".skim li")].map((item) => {
    const link = item.querySelector("a");
    const itemStyle = getComputedStyle(item);
    const before = getComputedStyle(item, "::before");
    const linkLines = link ? words(link) : [];
    const itemTop = Math.round(item.getBoundingClientRect().top);
    return {
      marker: before.content,
      alignItems: itemStyle.alignItems,
      listStyle: itemStyle.listStyleType,
      itemTop,
      firstTop: linkLines[0]?.top ?? null,
      lastTop: linkLines.at(-1)?.top ?? null,
      firstDelta: linkLines[0] ? linkLines[0].top - itemTop : null,
      lines: linkLines.map((line) => line.text),
      height: link ? Math.round(link.getBoundingClientRect().height) : 0
    };
  });
  const heads = [...document.querySelectorAll("h2")].map((head) => {
    const style = getComputedStyle(head);
    return { text: head.innerText.replace(/\\s+/g, " ").trim(), marginTop: style.marginTop,
      borderTop: style.borderTopWidth, borderColor: style.borderTopColor };
  });
  const lead = document.querySelector(".front-lead h1, .big-story h3");
  const source = document.querySelector(".big-story .source-line, .front-lead .front-sources");
  return {
    disclosure: box(disclosure),
    href: disclosure?.getAttribute("href") || "",
    markers,
    heads,
    leadLines: lead ? words(lead).map((line) => line.text) : [],
    sourceText: source ? source.innerText.replace(/\\s+/g, " ").trim() : "",
    share: [...document.querySelectorAll(".story-share-button, .story-share-link")]
      .filter((el) => !el.hidden && el.getClientRects().length)
      .slice(0, 3)
      .map((el) => ({
        text: el.innerText.trim(),
        height: Math.round(el.getBoundingClientRect().height)
      })),
    bodySize: getComputedStyle(document.querySelector(
      ".bulletin p, .front-story-summary, main p"
    )).fontSize,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    signupIndex: [...document.querySelectorAll(".front-lead, .front-story, .signup--lead")]
      .findIndex((node) => node.classList.contains("signup--lead"))
  };
})()`;

async function measure(browser, origin, route, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(origin + route, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(MEASURE);
  await page.close();
  return result;
}

async function main() {
  if (!CHROME) throw new Error("Chromium is not installed");
  const server = await serve(ROOT);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, args: ["--no-sandbox"]
  });
  const shots = [
    ["home-390", "/", 390, 844],
    ["home-1280", "/", 1280, 900],
    ["edition-390", "/2026/11/08/", 390, 844],
    ["edition-1280", "/2026/11/08/", 1280, 900]
  ];
  const report = {};
  for (const [name, route, width, height] of shots) {
    report[name] = await measure(browser, origin, route, width, height);
  }
  await browser.close();
  server.close();
  const out = process.argv[2] || "author-edition-probes.json";
  writeFileSync(out, JSON.stringify(report, null, 2));
  process.stdout.write(`${out}\n`);
}

const called = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (called) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exit(1);
  });
}
