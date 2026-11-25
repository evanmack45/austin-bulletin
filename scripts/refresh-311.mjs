// Monthly refresh of /austin-311-response-times/.
// Usage: node scripts/refresh-311.mjs [--force]
// Runs only on the 1st of the month (Chicago date), or with --force. It does nothing
// when the page already covers the newest complete month. Otherwise it:
//   1. pulls the new 12-month window from the City's 311 data (scripts/data-311.mjs),
//   2. rewrites data/311-chart.json from the new medians,
//   3. renders the two chart images with scripts/lead-chart.mjs.
// Then run `npm run build && npm test`, and open a PR. Exit codes: 0 done or skipped, 1 failed.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { chicagoDate } from "./chicago-time.mjs";
import { build311, defaultWindow, monthLabels } from "./data-311.mjs";

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
  if (!force && today.slice(8) !== "01") {
    console.log(`311 refresh: ${today} is not the 1st of the month; skipping.`);
    return;
  }
  const [from, to] = defaultWindow(today);
  let current = null;
  try { current = JSON.parse(await readFile("src/_data/feature311.json", "utf8")); } catch { /* first run */ }
  if (!force && current?.to === to) {
    console.log(`311 refresh: page already covers through ${to}; skipping.`);
    return;
  }
  const data = await build311(from, to);
  const spec = chartSpec(data);
  await writeFile("data/311-chart.json", `${JSON.stringify(spec, null, 2)}\n`);
  execFileSync("node", ["scripts/lead-chart.mjs", "data/311-chart.json"], { stdio: "inherit" });
  console.log(`311 refresh: wrote ${from}..${to}. Next: npm run build && npm test, then open a PR.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(`311 refresh failed: ${error.message}`); process.exit(1); });
}
