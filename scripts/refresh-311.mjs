// Monthly refresh of /austin-311-response-times/.
// Usage: node scripts/refresh-311.mjs [--force]
// Safe to run every day. It does nothing when the page already covers the newest complete
// month, which makes the 1st of the month the day it works (or the next day it runs after a
// missed 1st). --force rebuilds anyway. Otherwise it:
//   1. pulls the new 12-month window from the City's 311 data (scripts/data-311.mjs),
//   2. rewrites data/311-chart.json from the new medians,
//   3. renders the two chart images with scripts/lead-chart.mjs,
//   4. rebuilds the district medians for /austin-311-visual/ (scripts/data-311-visual.mjs),
//   5. rebuilds the particle data for /austin-311-wait/ (scripts/data-311-wait.mjs).
// Then run `npm run build && npm test`, re-render that page's still images with
// scripts/render-311-wait-stills.mjs against a local build, and open a PR. Exit codes: 0 done or skipped, 1 failed.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { chicagoDate } from "./chicago-time.mjs";
import { build311, defaultWindow, monthLabels } from "./data-311.mjs";
import { build311Visual } from "./data-311-visual.mjs";
import { build311Wait } from "./data-311-wait.mjs";

const BARS = [
  ["pothole", "Pothole"], ["garbage", "Trash"], ["recycling", "Recycling"], ["compost", "Compost"],
  ["code", "Code"], ["brush", "Brush"], ["bulk", "Bulk"], ["vehicle", "Vehicle"]
];

const fmt = (n) => (n < 10 ? n.toFixed(1) : String(Math.round(n)));

export function chartSpec(data) {
  const k = data.byKey;
  const bars = BARS.map(([key, label]) => ({ label, value: fmt(k[key].medianDays), n: k[key].medianDays }))
    .sort((a, b) => a.n - b.n);
  bars.at(-1).hi = true;
  const slow = bars.at(-1);
  const slowRow = BARS.map(([key]) => k[key]).sort((a, b) => b.medianDays - a.medianDays)[0];
  const hours = Math.round(k.pothole.medianDays * 24);
  const [fromY, fromM] = data.from.split("-").map(Number);
  const [toY, toM] = data.to.split("-").map(Number);
  const short = (y, m) => `${monthLabels(`${y}-${String(m).padStart(2, "0")}`).short.slice(0, 3).toUpperCase()}. ${y}`;
  return {
    out: "src/images/features/austin-311-response-times",
    even: true,
    kicker: `AUSTIN 311 · ${short(fromY, fromM)} TO ${short(toY, toM)}`,
    bignum: `${Math.round(slowRow.medianDays)} days`,
    qualifier: `median for ${slowRow.label.toLowerCase()} requests to be marked closed`,
    headline: `A pothole report closes in about ${hours} hours. ${slowRow.label} requests take ${Math.round(slowRow.medianDays)} days.`,
    subtitle: "Median days from report to 'closed' in the City's public 311 data",
    bars: bars.map(({ label, value, n, hi }) => ({ label: label === slow.label ? slowRow.label : label, value, n, ...(hi ? { hi } : {}) }))
  };
}

async function main() {
  const force = process.argv.includes("--force");
  const today = chicagoDate();
  const [from, to] = defaultWindow(today);
  let current = null;
  try { current = JSON.parse(await readFile("src/_data/feature311.json", "utf8")); } catch { /* first run */ }
  if (!force && current?.to === to) {
    console.log(`311 refresh: page already covers through ${to}; nothing to do.`);
    return;
  }
  const data = await build311(from, to);
  await build311Visual();
  await build311Wait();
  const spec = chartSpec(data);
  await writeFile("data/311-chart.json", `${JSON.stringify(spec, null, 2)}\n`);
  execFileSync("node", ["scripts/lead-chart.mjs", "data/311-chart.json"], { stdio: "inherit" });
  console.log(`311 refresh: wrote ${from}..${to}. Next: npm run build && npm test, re-render the /austin-311-wait/ stills, then open a PR.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(`311 refresh failed: ${error.message}`); process.exit(1); });
}
