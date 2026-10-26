// Full-site outbound link audit. Report only: not part of ci.yml.
//
// Usage: npm run audit:links
//        node scripts/link-audit.mjs   (reads an existing _site/)
//
// Builds are the caller's job (the npm script builds first). The audit
// reads every built HTML page, dedupes external anchor hrefs, and checks
// each one. HEAD first, then GET when HEAD is not a final 2xx/3xx.
// Redirects are followed. A browser-like User-Agent is intentional: a 403
// then means a bot wall (KVUE, the Daily Texan), not a refusal of the
// publication crawler. Gather still identifies as TheAustinBulletin/1.0.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE_ORIGIN = "https://theaustinbulletin.com";
const TIMEOUT_MS = 15000;
const CONCURRENCY = 6;
const HOST_GAP_MS = 200;
const KINDS = ["OK", "BROKEN", "BLOCKED", "ERROR"];
const DNS_CODES = new Set([
  "ENOTFOUND", "EAI_AGAIN", "ENODATA", "EAI_NODATA", "EAI_NONAME"
]);
const TIMEOUT_CODES = new Set([
  "ETIMEDOUT", "ECONNABORTED", "ABORT_ERR", "UND_ERR_ABORTED",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT",
  "AbortError", "TimeoutError"
]);
const USER_AGENT = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "AppleWebKit/537.36 (KHTML, like Gecko)",
  "Chrome/131.0.0.0 Safari/537.36"
].join(" ");
const REQUEST_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};
const ANCHOR = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;

const hostTails = new Map();

export function classifyLink(result) {
  const status = httpStatus(result);
  const code = result?.code || null;
  if (status == null) return { kind: networkKind(code), status: networkStatus(code) };
  return { kind: statusKind(status), status: String(status) };
}

export function externalLinksIn(html, pageUrl) {
  const links = [];
  const seen = new Set();
  for (const raw of anchorHrefs(documentHtml(html))) {
    const link = externalLink(raw, pageUrl);
    if (!link || seen.has(link)) continue;
    seen.add(link);
    links.push(link);
  }
  return links;
}

function httpStatus(result) {
  const status = Number(result?.status);
  if (Number.isInteger(status) && status >= 100 && status <= 599) return status;
  return null;
}

function networkKind(code) {
  if (DNS_CODES.has(code)) return "BROKEN";
  return "ERROR";
}

function networkStatus(code) {
  if (DNS_CODES.has(code)) return "DNS";
  if (TIMEOUT_CODES.has(code)) return "timeout";
  return code || "error";
}

// 401, 403, and 429 are blocks, including bot walls such as KVUE and the Daily Texan.
function statusKind(status) {
  if (status >= 200 && status < 400) return "OK";
  if (status === 404 || status === 410) return "BROKEN";
  if (status === 401 || status === 403 || status === 429) return "BLOCKED";
  return "ERROR";
}

function documentHtml(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
}

function anchorHrefs(html) {
  return [...html.matchAll(ANCHOR)].map((match) => match[1] ?? match[2] ?? match[3] ?? "");
}

function decodeHref(raw) {
  return raw
    .replace(/&amp;/gi, "&")
    .replace(/&#0*38;/g, "&")
    .replace(/&#x0*26;/gi, "&");
}

export function externalLink(raw, pageUrl) {
  if (!raw || !String(raw).trim()) return null;
  let url;
  try {
    url = new URL(decodeHref(String(raw).trim()), pageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isOwnHost(url.hostname)) return null;
  url.hash = "";
  return url.href;
}

function isOwnHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "theaustinbulletin.com" || host.endsWith(".theaustinbulletin.com");
}

function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "pagefind") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function routeFor(siteDir, file) {
  const rel = path.relative(siteDir, file).split(path.sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

export async function collectExternalLinks(siteDir) {
  const files = await htmlFiles(siteDir);
  const citations = new Map();
  for (const file of files) {
    const route = routeFor(siteDir, file);
    const pageUrl = new URL(route, `${SITE_ORIGIN}/`).href;
    const html = await readFile(file, "utf8");
    addPageLinks(citations, html, pageUrl, route);
  }
  return { pageCount: files.length, citations };
}

function addPageLinks(citations, html, pageUrl, route) {
  for (const link of externalLinksIn(html, pageUrl)) {
    const pages = citations.get(link) ?? new Set();
    pages.add(route);
    citations.set(link, pages);
  }
}

function stringField(obj, key) {
  if (!obj || typeof obj[key] !== "string") return "";
  return obj[key];
}

function errorCode(err) {
  const cause = err && err.cause;
  return stringField(cause, "code")
    || stringField(err, "code")
    || stringField(cause, "name")
    || stringField(err, "name")
    || "error";
}

async function discard(response) {
  if (!response.body) return;
  try {
    await response.body.cancel();
  } catch {
    // The status is already known. Closing the body is connection hygiene.
  }
}

async function requestOnce(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: REQUEST_HEADERS
    });
    await discard(response);
    return { status: response.status, code: null, finalUrl: response.url };
  } catch (err) {
    return { status: null, code: errorCode(err), finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url) {
  const head = await requestOnce(url, "HEAD");
  const headClass = classifyLink(head);
  if (headClass.kind === "OK" || headClass.status === "DNS") return head;
  const get = await requestOnce(url, "GET");
  if (get.status == null && head.status != null) return head;
  return get;
}

function pause() {
  return new Promise((resolve) => setTimeout(resolve, HOST_GAP_MS));
}

function withHostGate(host, fn) {
  const previous = hostTails.get(host) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  hostTails.set(host, run.then(pause, pause));
  return run;
}

async function mapPool(items, limit, worker) {
  if (items.length === 0) return [];
  const results = new Array(items.length);
  let next = 0;
  const runners = Math.min(limit, items.length);
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: runners }, () => run()));
  return results;
}

function interleaveByHost(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const host = new URL(entry[0]).hostname;
    const list = groups.get(host) ?? [];
    list.push(entry);
    groups.set(host, list);
  }
  const mixed = [];
  const queues = [...groups.values()];
  let pending = true;
  while (pending) {
    pending = false;
    for (const queue of queues) {
      if (queue.length === 0) continue;
      mixed.push(queue.shift());
      pending = true;
    }
  }
  return mixed;
}

function sortedPages(pages) {
  return [...pages].sort((a, b) => a.localeCompare(b));
}

async function checkEntry(url, pages, progress) {
  try {
    const host = new URL(url).hostname;
    const result = await withHostGate(host, () => checkUrl(url));
    const classified = classifyLink(result);
    progress();
    return { url, kind: classified.kind, status: classified.status, pages: sortedPages(pages) };
  } catch {
    progress();
    return { url, kind: "ERROR", status: "error", pages: sortedPages(pages) };
  }
}

async function auditLinks(citations) {
  const sorted = [...citations.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const entries = interleaveByHost(sorted);
  const total = entries.length;
  let done = 0;
  const progress = () => {
    done += 1;
    if (done % 25 === 0 || done === total) {
      console.error(`link-audit: checked ${done} of ${total}`);
    }
  };
  return mapPool(entries, CONCURRENCY, ([url, pages]) => checkEntry(url, pages, progress));
}

function countKinds(rows) {
  const counts = { OK: 0, BROKEN: 0, BLOCKED: 0, ERROR: 0 };
  for (const row of rows) counts[row.kind] += 1;
  return counts;
}

function codeSpan(value) {
  return `\`${String(value).replace(/`/g, "")}\``;
}

function section(kind, rows) {
  const lines = [`## ${kind} (${rows.length})`, ""];
  if (rows.length === 0) {
    lines.push("None.", "");
    return lines;
  }
  const ordered = [...rows].sort((a, b) => a.url.localeCompare(b.url));
  for (const row of ordered) {
    lines.push(`- ${codeSpan(row.url)} — ${row.status}`);
    for (const page of row.pages) lines.push(`  - ${codeSpan(page)}`);
  }
  lines.push("");
  return lines;
}

export function renderReport({ pageCount, rows, generatedAt }) {
  const counts = countKinds(rows);
  const lines = [
    "# Link audit",
    "",
    `Generated: ${generatedAt}`,
    "",
    `Scanned ${pageCount} built HTML pages. ${rows.length} unique external links.`,
    "Each link is requested with HEAD, then GET when HEAD is not a final 2xx or 3xx.",
    "Redirects are followed. Timeout is 15 seconds.",
    "Concurrency is 6, with one request at a time per host.",
    "User-Agent is a browser-like Chrome string.",
    "This report is not a CI gate. Re-run with `npm run audit:links`.",
    "",
    "## Summary",
    "",
    "| Class | Count |",
    "| --- | ---: |",
    ...KINDS.map((kind) => `| ${kind} | ${counts[kind]} |`),
    "",
    "OK means the final response was 2xx or 3xx.",
    "BROKEN means 404, 410, or DNS failure.",
    "BLOCKED means 401, 403, or 429, including bot walls such as KVUE and the Daily Texan.",
    "ERROR means a timeout, a 5xx, or another network failure.",
    ""
  ];
  for (const kind of ["BROKEN", "BLOCKED", "ERROR"]) {
    lines.push(...section(kind, rows.filter((row) => row.kind === kind)));
  }
  lines.push("OK links are counted in the summary and not listed one by one.");
  lines.push("");
  return lines.join("\n");
}

function printSummary(rows, pageCount, outPath) {
  const counts = countKinds(rows);
  console.log(`Link audit: ${rows.length} unique external links on ${pageCount} pages`);
  for (const kind of KINDS) console.log(`  ${kind.padEnd(7)} ${counts[kind]}`);
  console.log(`Report: ${path.relative(repoRoot(), outPath)}`);
}

async function main() {
  const siteDir = path.join(repoRoot(), "_site");
  let collected;
  try {
    collected = await collectExternalLinks(siteDir);
  } catch (err) {
    const missing = err && err.code === "ENOENT";
    const message = missing ? "no _site directory. Run npm run build first." : err.message;
    console.error(`link-audit: ${message}`);
    process.exit(1);
  }
  if (collected.pageCount === 0) {
    console.error("link-audit: no HTML pages under _site");
    process.exit(1);
  }
  if (collected.citations.size === 0) {
    console.error("link-audit: no external links found");
    process.exit(1);
  }
  const rows = await auditLinks(collected.citations);
  const report = renderReport({
    pageCount: collected.pageCount,
    rows,
    generatedAt: new Date().toISOString()
  });
  const outPath = path.join(repoRoot(), "reports", "link-audit.md");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, report);
  printSummary(rows, collected.pageCount, outPath);
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (invokedDirectly()) {
  main().catch((err) => {
    console.error(`link-audit: ${err && err.message ? err.message : String(err)}`);
    process.exit(1);
  });
}
