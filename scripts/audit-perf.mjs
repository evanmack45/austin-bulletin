// Mobile Lighthouse medians. Report only: not part of ci.yml.
//
// Usage: npm run audit:perf
//        npm run audit:perf -- https://theaustinbulletin.com/2026/10/26/
//        AUDIT_RUNS=1 npm run audit:perf -- https://theaustinbulletin.com/corrections/
//
// Requires the lighthouse CLI on PATH (it is not a dependency) and Chrome.
// Default is three simulated-mobile runs. Prints the median LCP, CLS, TBT,
// transfer size, and request count. Exits 1 if lighthouse is missing or a
// run fails.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_URLS = [
  "https://theaustinbulletin.com/",
  "https://yallcityhall.org/",
];
const RUNS = Number(process.env.AUDIT_RUNS || 3);
const LCP_BUDGET_MS = 2500;
const CLS_BUDGET = 0.1;
const BYTE_BUDGET = 1_000_000;

function median(values) {
  const xs = [...values].sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  if (xs.length % 2) return xs[mid];
  return (xs[mid - 1] + xs[mid]) / 2;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function lighthouse() {
  const found = spawnSync("lighthouse", ["--version"], { encoding: "utf8" });
  if (found.status === 0) return found.stdout.trim();
  fail("lighthouse is not on PATH. Install it with: npm install -g lighthouse");
  return "";
}

function runOnce(url, outPath) {
  const result = spawnSync("lighthouse", [
    url,
    "--quiet",
    "--output=json",
    `--output-path=${outPath}`,
    "--only-categories=performance",
    "--form-factor=mobile",
    "--screenEmulation.mobile=true",
    "--throttling-method=simulate",
    "--preset=perf",
    "--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu",
    "--max-wait-for-load=45000",
  ], { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
  if (result.status !== 0) {
    fail(`lighthouse failed for ${url}\n${(result.stderr || "").slice(-800)}`);
  }
  return JSON.parse(readFileSync(outPath, "utf8"));
}

function readRun(lhr) {
  const audits = lhr.audits;
  const summary = audits["resource-summary"].details.items;
  const total = summary.find((item) => item.resourceType === "total");
  return {
    lcp: audits["largest-contentful-paint"].numericValue,
    cls: audits["cumulative-layout-shift"].numericValue,
    tbt: audits["total-blocking-time"].numericValue,
    bytes: audits["total-byte-weight"].numericValue,
    requests: total.requestCount,
  };
}

function flag(row) {
  const marks = [];
  if (row.lcp > LCP_BUDGET_MS) marks.push("LCP");
  if (row.cls > CLS_BUDGET) marks.push("CLS");
  if (row.bytes > BYTE_BUDGET) marks.push("weight");
  return marks.length ? marks.join(",") : "ok";
}

const urls = process.argv.slice(2).filter((arg) => arg.startsWith("http"));
const pages = urls.length ? urls : DEFAULT_URLS;
if (!Number.isInteger(RUNS) || RUNS < 1) fail("AUDIT_RUNS must be a positive integer");

const version = lighthouse();
console.log(`lighthouse ${version}; mobile simulated; ${RUNS} run(s); median`);
console.log("url\tLCP_ms\tCLS\tTBT_ms\tbytes\trequests\tbudget");

const dir = mkdtempSync(join(tmpdir(), "audit-perf-"));
try {
  for (const url of pages) {
    const samples = [];
    for (let i = 1; i <= RUNS; i++) {
      const lhr = runOnce(url, join(dir, `run-${i}.json`));
      samples.push(readRun(lhr));
    }
    const row = {
      lcp: median(samples.map((s) => s.lcp)),
      cls: median(samples.map((s) => s.cls)),
      tbt: median(samples.map((s) => s.tbt)),
      bytes: median(samples.map((s) => s.bytes)),
      requests: median(samples.map((s) => s.requests)),
    };
    console.log([
      url,
      Math.round(row.lcp),
      row.cls.toFixed(3),
      Math.round(row.tbt),
      Math.round(row.bytes),
      row.requests,
      flag(row),
    ].join("\t"));
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
