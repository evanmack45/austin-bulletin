// Per-district wait times for the visual 311 story (/austin-311-visual/).
// Usage: node scripts/data-311-visual.mjs
// Uses the same window as src/_data/feature311.json (built by data-311.mjs)
// and the same rules: duplicates and still-open requests are left out of the
// medians. Writes src/_data/feature311visual.json.
import { readFile, writeFile } from "node:fs/promises";
import { chicagoDate } from "./chicago-time.mjs";
import { parseCsv, percentile, days, queryUrl } from "./data-311.mjs";

const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
// The request types mapped by district, by City name.
export const MAP_TYPES = {
  all: null,
  vehicle: "APD - Vehicle Abatement Report",
  code: "DSD - Request Code Officer",
  pothole: "TPW - Pothole Repair"
};

const round = (n, d = 3) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);

export function districtMedians(rows) {
  const groups = new Map();
  for (const r of rows) {
    const district = r.sr_location_council_district;
    if (!district) continue;
    if (r.sr_status_desc.startsWith("Duplicate")) continue;
    if (!(r.sr_status_desc.startsWith("Closed") && r.sr_closed_date)) continue;
    const d = days(r.sr_created_date, r.sr_closed_date);
    if (d < 0) continue;
    for (const [key, type] of Object.entries(MAP_TYPES)) {
      if (type && r.sr_type_desc !== type) continue;
      const k = `${key}|${district}`;
      (groups.get(k) ?? groups.set(k, []).get(k)).push(d);
    }
  }
  const out = {};
  for (const key of Object.keys(MAP_TYPES)) {
    out[key] = [];
    for (let n = 1; n <= 10; n++) {
      const list = (groups.get(`${key}|${n}`) ?? []).sort((a, b) => a - b);
      out[key].push({ district: String(n), closed: list.length, medianDays: round(percentile(list, 0.5)) });
    }
  }
  return out;
}

async function main() {
  const base = JSON.parse(await readFile("src/_data/feature311.json", "utf8"));
  const where = `sr_created_date between '${base.from}T00:00:00' and '${base.to}T23:59:59'`;
  const fields = "sr_number,sr_type_desc,sr_status_desc,sr_created_date,sr_closed_date,sr_location_council_district";
  const url = queryUrl({ select: fields, where, order: "sr_number", limit: 2000000 });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`311 query failed: ${res.status}`);
  const rows = parseCsv(await res.text());
  const out = {
    generated: chicagoDate(), from: base.from, to: base.to, total: rows.length,
    types: MAP_TYPES, byDistrict: districtMedians(rows),
    queries: Object.fromEntries(Object.entries(MAP_TYPES).map(([key, type]) => [key, queryUrl({
      select: "sr_location_council_district,sr_status_desc,sr_created_date,sr_closed_date",
      where: type ? `${where} AND sr_type_desc='${type}'` : where, limit: 400000 })]))
  };
  await writeFile("src/_data/feature311visual.json", `${JSON.stringify(out, null, 2)}\n`);
  console.log(`311 visual: ${rows.length} rows (feature311 had ${base.total})`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
