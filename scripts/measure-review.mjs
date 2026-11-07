// Local production measurement for a reviewer.
// This script records the author's machine only when the author runs it.
// An independent reviewer runs it again on the same head.
//
//   npm run build
//   node scripts/measure-review.mjs /opt/cursor/artifacts
//
// Chrome is puppeteer-core against the local _site directory. No network.

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coverExpandedHits } from "./hit-probes.mjs";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(repo, "_site");
const outDir = path.resolve(process.argv[2] || path.join(repo, "review-measure"));
const chrome = [
  "/usr/local/bin/google-chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].find((file) => existsSync(file));

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json"
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function fileHash(rel) {
  const file = path.join(root, rel);
  return { rel, sha256: sha256(readFileSync(file)), bytes: readFileSync(file).length };
}

function serve() {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const rel = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) {
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
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function installObservers(page) {
  return page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    window.__lcp = null;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (!last) return;
      window.__lcp = {
        time: Math.round(last.startTime),
        tag: last.element?.tagName || "",
        url: last.url || ""
      };
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
}

function measurePage() {
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  const lum = (rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const paint = (el) => {
    let node = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      const match = bg.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/);
      if (match && (match[4] == null || Number(match[4]) > 0.2)) {
        return [Number(match[1]), Number(match[2]), Number(match[3])];
      }
      node = node.parentElement;
    }
    return [251, 248, 242];
  };
  const hitBox = (el) => {
    const box = el.getBoundingClientRect();
    const before = getComputedStyle(el, "::before");
    const width = Number.parseFloat(before.width);
    const height = Number.parseFloat(before.height);
    const expanded = before.position === "absolute" && width >= 1 && height >= 1;
    const hitW = expanded ? width : box.width;
    const hitH = expanded ? height : box.height;
    return {
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
      x: Math.round(box.x + box.width / 2 - hitW / 2),
      y: Math.round(box.y + box.height / 2 - hitH / 2),
      w: Math.round(hitW),
      h: Math.round(hitH),
      layoutW: Math.round(box.width),
      layoutH: Math.round(box.height)
    };
  };
  const contrast = [];
  for (const el of document.querySelectorAll("a, p, h1, h2, h3, li, .ai-disclosure, .if-you, .source-line")) {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (style.display === "none" || box.width < 1 || box.height < 1) continue;
    const fg = style.color.match(/rgba?\((\d+), (\d+), (\d+)/);
    if (!fg) continue;
    const fgLum = lum([Number(fg[1]), Number(fg[2]), Number(fg[3])]);
    const bgLum = lum(paint(el));
    const score = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
    const size = Number.parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    const needed = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (score + 0.02 < needed) {
      contrast.push({
        text: (el.textContent || "").trim().slice(0, 48),
        score: Number(score.toFixed(2)),
        needed,
        size
      });
    }
  }
  const taps = [...document.querySelectorAll("a, button")]
    .filter((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    })
    .map(hitBox);
  const shortTaps = taps.filter((tap) => tap.w < 44 || tap.h < 44);
  const overlaps = [];
  for (let i = 0; i < taps.length; i += 1) {
    for (let j = i + 1; j < taps.length; j += 1) {
      const a = taps[i];
      const b = taps[j];
      const overlapW = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const overlapH = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (overlapW > 2 && overlapH > 2) overlaps.push({ a: a.text, b: b.text, overlapW, overlapH });
    }
  }
  const visualLines = (el) => {
    const lines = new Map();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent || "";
      const range = document.createRange();
      let index = 0;
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        range.setStart(node, index);
        range.setEnd(node, index + part.length);
        const rect = range.getClientRects()[0];
        index += part.length;
        if (!rect || rect.width < 0.2) continue;
        const top = Math.round(rect.top / 4) * 4;
        lines.set(top, `${lines.get(top) || ""}${part}`);
      }
      node = walker.nextNode();
    }
    return [...lines.values()].map((line) => line.trim()).filter(Boolean);
  };
  const sourceLines = [...document.querySelectorAll(".source-line, .front-story-sources, .front-sources")]
    .map((el) => {
      const box = el.getBoundingClientRect();
      const lines = visualLines(el);
      return {
        text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 160),
        width: Math.round(box.width),
        fontSize: Number.parseFloat(getComputedStyle(el).fontSize),
        lines: lines.map((line) => ({ chars: line.length, text: line.slice(0, 90) })),
        maxChars: lines.reduce((max, line) => Math.max(max, line.length), 0)
      };
    });
  const prose = [...document.querySelectorAll(
    ".front-deck, .front-story-summary, .big-story p:not(.source-line), .river p:not(.source-line), .if-you"
  )].flatMap(visualLines);
  const signup = document.querySelector(".paper-main .signup--lead");
  const stories = [...document.querySelectorAll(".front-lead h1, .front-story h3")];
  const meta = (sel) => document.querySelector(sel)?.getAttribute("content") || "";
  const menu = document.querySelector(".site-menu-button")?.getBoundingClientRect();
  const agent = document.querySelector(".crawler-user-agent");
  const agentText = agent ? agent.textContent : "";
  const beforeAgent = agent?.previousSibling?.textContent || "";
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    contrast: contrast.slice(0, 8),
    shortTaps,
    shortCount: shortTaps.length,
    overlaps: overlaps.slice(0, 12),
    overlapCount: overlaps.length,
    sourceLines,
    sourceMaxChars: sourceLines.reduce((max, line) => Math.max(max, line.maxChars), 0),
    proseMaxChars: prose.reduce((max, line) => Math.max(max, line.length), 0),
    toc: [...document.querySelectorAll(".skim li")].map((li) => {
      const link = li.querySelector("a");
      const linkBox = link.getBoundingClientRect();
      const liBox = li.getBoundingClientRect();
      return {
        text: (link?.textContent || "").trim().slice(0, 42),
        linkTopDelta: Math.round(linkBox.top - liBox.top),
        linkH: Math.round(linkBox.height)
      };
    }),
    storiesBeforeSignup: signup
      ? stories.filter((el) => el.compareDocumentPosition(signup) & Node.DOCUMENT_POSITION_FOLLOWING).length
      : null,
    h1: (document.querySelector("h1")?.textContent || "").trim().slice(0, 140),
    disclosure: (document.querySelector(".ai-disclosure")?.textContent || "").trim(),
    trust: (document.querySelector(".trust-link, a[href='/about/#trust']")?.textContent || "").trim(),
    banned: ["Our rules", "We report", "How we gather", "About our reporting", "Sources: Source"]
      .filter((phrase) => document.body.textContent.includes(phrase)),
    doubledLabel: /Sources:\s*Source\b/.test(document.body.textContent),
    userAgent: agentText,
    orphanParen: /^\s*\(/.test(beforeAgent),
    gaps: [...document.querySelectorAll(".front-section")].map((el) => getComputedStyle(el).marginTop),
    share: {
      title: meta('meta[property="og:title"]'),
      description: meta('meta[property="og:description"]'),
      image: meta('meta[property="og:image"]'),
      imageAlt: meta('meta[property="og:image:alt"]')
    },
    menu: menu && menu.height > 0 ? { w: Math.round(menu.width), h: Math.round(menu.height) } : null,
    imgs: document.querySelectorAll("img").length
  };
}

async function readback(origin, route) {
  const response = await fetch(origin + route);
  const body = Buffer.from(await response.arrayBuffer());
  return { route, status: response.status, sha256: sha256(body), bytes: body.length };
}

if (!chrome) throw new Error("Chrome is not installed");
mkdirSync(outDir, { recursive: true });
const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const editionRead = await readback(origin, "/2026/11/07/");
const cssRead = await readback(origin, "/css/style.css");
const editionFile = fileHash("2026/11/07/index.html");
const cssFile = fileHash("css/style.css");
if (editionRead.sha256 !== editionFile.sha256 || cssRead.sha256 !== cssFile.sha256) {
  throw new Error("Served files do not match the built _site files");
}
if (!readFileSync(path.join(root, "css/style.css"), "utf8").includes(".source-group")) {
  throw new Error("Build is stale: style.css has no .source-group");
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  protocolTimeout: 120000,
  args: ["--no-sandbox"]
});
const images = [];
const views = {};

async function saveShot(page, file, detail) {
  const target = path.join(outDir, file);
  await page.screenshot({ path: target, fullPage: true });
  const bytes = readFileSync(target);
  images.push({
    file,
    route: detail.route,
    viewport: detail.viewport,
    scrollY: detail.scrollY,
    fullPage: true,
    sha256: sha256(bytes),
    bytes: bytes.length
  });
}

async function clip(page, selector, file, detail) {
  const el = await page.$(selector);
  if (!el) return;
  const target = path.join(outDir, file);
  await el.screenshot({ path: target });
  const bytes = readFileSync(target);
  const box = await el.boundingBox();
  images.push({
    file,
    route: detail.route,
    viewport: detail.viewport,
    scrollY: detail.scrollY,
    fullPage: false,
    selector,
    box,
    sha256: sha256(bytes),
    bytes: bytes.length
  });
}

async function shoot(route, width) {
  const height = width >= 900 ? 900 : 844;
  const page = await browser.newPage();
  await installObservers(page);
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(origin + route, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const scrollY = await page.evaluate(() => window.scrollY);
  const measured = await page.evaluate(measurePage);
  const timing = await page.evaluate(() => ({ cls: window.__cls || 0, lcp: window.__lcp }));
  const slug = route === "/" ? "home" : route.replaceAll("/", "-").replace(/^-|-$/g, "");
  const file = `${slug}-${width}.png`;
  const detail = { route, viewport: { width, height, deviceScaleFactor: 1 }, scrollY };
  await saveShot(page, file, detail);
  views[`${route}@${width}`] = { file, ...detail, timing, ...measured };
  return { page, detail };
}

const shots = [
  ["/", 1280, [
    [".site-footer", "home-footer-1280.png"],
    [".front-lead .front-sources", "home-lead-sources-1280.png"],
    [".front-story-sources", "home-sources-1280.png"]
  ]],
  ["/", 390, [
    [".site-footer", "home-footer-390.png"],
    [".front-lead .front-sources", "home-lead-sources-390.png"],
    [".front-story-sources", "home-sources-390.png"]
  ]],
  ["/2026/11/07/", 1280, [
    [".site-footer", "edition-footer-1280.png"],
    [".skim", "edition-toc-1280.png"],
    [".big-story .source-line", "edition-sources-1280.png"],
    [".council-did", "edition-council-1280.png"],
    [".if-you", "edition-ifyou-1280.png"]
  ]],
  ["/2026/11/07/", 390, [
    [".site-footer", "edition-footer-390.png"],
    [".skim", "edition-toc-390.png"],
    [".big-story .source-line", "edition-sources-390.png"],
    [".council-did", "edition-council-390.png"],
    [".if-you", "edition-ifyou-390.png"]
  ]],
  ["/about/", 1280, [[".crawler-user-agent", "about-user-agent-1280.png"], ["#trust", "about-trust-1280.png"]]],
  ["/about/", 390, [[".crawler-user-agent", "about-user-agent-390.png"]]],
  ["/2026/11/06/", 1280, []],
  ["/2026/11/06/", 390, []]
];
for (const [route, width, clips] of shots) {
  const shot = await shoot(route, width);
  for (const [selector, file] of clips) await clip(shot.page, selector, file, shot.detail);
  const key = `${route}@${width}`;
  views[key].hitProbe = await coverExpandedHits(shot.page);
  await shot.page.close();
}

const homeShare = views["/@1280"].share;
const editionShare = views["/2026/11/07/@1280"].share;
const preview = await browser.newPage();
await preview.setViewport({ width: 980, height: 520, deviceScaleFactor: 1 });
const card = (label, data) => `<article style="width:420px;background:#fff;border-radius:12px;overflow:hidden;font-family:Georgia,serif;color:#1b1b1b"><img alt="${data.imageAlt}" src="${origin}/icon-512.png" style="width:100%;height:160px;object-fit:cover"><div style="padding:16px"><p style="margin:0 0 8px;font:700 12px Arial">${label}</p><h2 style="margin:0 0 8px;font-size:20px;line-height:1.25">${data.title}</h2><p style="margin:0;font-size:15px;line-height:1.4">${data.description}</p></div></article>`;
await preview.setContent(
  `<body style="margin:0;background:#e7e1d4;display:flex;gap:24px;padding:24px">${card("Homepage", homeShare)}${card("Edition", editionShare)}</body>`
);
const previewFile = path.join(outDir, "link-preview.png");
await preview.screenshot({ path: previewFile });
images.push({
  file: "link-preview.png",
  route: "share-card preview of / and /2026/11/07/",
  viewport: { width: 980, height: 520, deviceScaleFactor: 1 },
  scrollY: 0,
  fullPage: false,
  sha256: sha256(readFileSync(previewFile)),
  bytes: readFileSync(previewFile).length
});

await preview.close();
await browser.close();
await new Promise((resolve) => server.close(resolve));

const stamp = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  dateStyle: "full",
  timeStyle: "long"
}).format(new Date());
const report = {
  note: "Author-run measurements. An independent reviewer reruns this script.",
  timestampCT: stamp,
  sha: execSync("git rev-parse HEAD", { cwd: repo }).toString().trim(),
  branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: repo }).toString().trim(),
  chrome,
  origin,
  readback: {
    edition: editionRead,
    editionFile,
    css: cssRead,
    cssFile,
    match: true
  },
  images,
  views,
  friday: {
    desktop: views["/2026/11/06/@1280"].timing,
    phone: views["/2026/11/06/@390"].timing
  }
};
writeFileSync(path.join(outDir, "review-measure.json"), JSON.stringify(report, null, 2));
const brief = Object.fromEntries(Object.entries(views).map(([key, view]) => [key, {
  file: view.file,
  overflow: view.overflow,
  contrast: view.contrast.length,
  shortCount: view.shortCount,
  shortTaps: view.shortTaps,
  overlapCount: view.overlapCount,
  overlaps: view.overlaps,
  sourceMaxChars: view.sourceMaxChars,
  proseMaxChars: view.proseMaxChars,
  sourceLines: view.sourceLines,
  toc: view.toc,
  storiesBeforeSignup: view.storiesBeforeSignup,
  disclosure: view.disclosure,
  banned: view.banned,
  doubledLabel: view.doubledLabel,
  orphanParen: view.orphanParen,
  userAgent: view.userAgent,
  gaps: view.gaps,
  menu: view.menu,
  imgs: view.imgs,
  hitProbe: view.hitProbe,
  cls: view.timing.cls,
  lcp: view.timing.lcp,
  h1: view.h1
}]));
writeFileSync(path.join(outDir, "review-summary.json"), JSON.stringify(brief, null, 2));
console.log(JSON.stringify({ timestampCT: stamp, sha: report.sha, brief }, null, 2));
