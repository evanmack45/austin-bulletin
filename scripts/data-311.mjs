// Build the 311 response-time feature data from the City's public 311 dataset.
// Usage: node scripts/data-311.mjs [FROM YYYY-MM-DD] [TO YYYY-MM-DD]
// Default window: the last 12 complete calendar months before today.
// Writes src/_data/feature311.json. Every figure on /austin-311-response-times/
// comes from that file, and every row links back to a City query that
// returns the same records.
import { writeFile } from "node:fs/promises";
import { chicagoDate } from "./chicago-time.mjs";

const DATASET = "xwdj-i9he";
const HOST = "https://data.austintexas.gov";
const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const TOP_TYPES = 25;

// Plain-language names for the City's request types. The City's own name is
// always shown beside it on the page.
export const LABELS = {
  "ARR - Garbage": ["garbage", "Trash"],
  "DSD - Request Code Officer": ["code", "Code officer visit"],
  "TPW - Parking Violation Enforcement": ["parking", "Parking violation"],
  "ARR - Compost": ["compost", "Compost"],
  "TPW - Traffic Signal - Maintenance": ["signal", "Traffic signal problem"],
  "ARR - Bulk": ["bulk", "Bulk items"],
  "ARR - Recycling": ["recycling", "Recycling"],
  "APD - Vehicle Abatement Report": ["vehicle", "Abandoned vehicle"],
  "Animal Protection - Loose Dog": ["dog", "Loose dog"],
  "311 CC - Other": ["other", "Other (311 call center)"],
  "ARR - Dead Animal Collection": ["deadAnimal", "Dead animal pickup"],
  "Animal Protection - Injured/Sick Animal": ["sickAnimal", "Injured or sick animal"],
  "ARR - General": ["arrGeneral", "Trash and recycling, general"],
  "Park Maintenance - Grounds": ["park", "Park grounds"],
  "ARR - Brush": ["brush", "Brush"],
  "AE Street Light Issue - Address": ["streetlight", "Streetlight out"],
  "TPW - Tree Issue Right of Way": ["tree", "Tree in the right of way"],
  "TPW - Obstruction in Right of Way": ["obstruction", "Obstruction in the right of way"],
  "Animal Protection - Assistance Request": ["animalHelp", "Animal Protection help"],
  "TPW - Debris in Street": ["debris", "Debris in the street"],
  "TPW - Pothole Repair": ["pothole", "Pothole"],
  "TPW - Construction Concerns in Right of Way": ["construction", "Construction in the right of way"],
  "DSD - Follow-Up": ["dsdFollowUp", "Code case follow-up"],
  "Animal Protection - Animal Bite": ["bite", "Animal bite"],
  "DSD - Outdoor Commercial Venue Music Complaint": ["music", "Outdoor venue music"]
};

// The last 12 complete calendar months before today's Chicago date.
export function defaultWindow(today = chicagoDate()) {
  const [y, m] = today.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  const endMonth = m === 1 ? 12 : m - 1;
  const endYear = m === 1 ? y - 1 : y;
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  const startYear = endMonth === 12 ? endYear : endYear - 1;
  const startMonth = endMonth === 12 ? 1 : endMonth + 1;
  return [`${startYear}-${pad(startMonth)}-01`, `${endYear}-${pad(endMonth)}-${pad(lastDay)}`];
}

const [from, to] = process.argv[2] ? [process.argv[2], process.argv[3]] : defaultWindow();
const windowWhere = `sr_created_date between '${from}T00:00:00' and '${to}T23:59:59'`;

export function queryUrl({ where = windowWhere, select, group, order, format = "csv", limit } = {}) {
  const params = new URLSearchParams();
  if (select) params.set("$select", select);
  params.set("$where", where);
  if (group) params.set("$group", group);
  if (order) params.set("$order", order);
  if (limit) params.set("$limit", String(limit));
  return `${HOST}/resource/${DATASET}.${format}?${params}`;
}

const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at), hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
export function monthLabels(ym) {
  const [y, m] = ym.split("-").map(Number);
  return { label: `${MONTHS[m - 1]} ${y}`, short: `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}` };
}
export function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const round = (n, d = 2) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);
const days = (a, b) => (Date.parse(`${b}Z`) - Date.parse(`${a}Z`)) / 86400000;

async function main() {
  const fields = "sr_number,sr_type_desc,sr_status_desc,sr_method_received_desc,sr_created_date,sr_closed_date,sr_location_council_district";
  const url = queryUrl({ select: fields, order: "sr_number", limit: 2000000 });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`311 query failed: ${res.status}`);
  const rows = parseCsv(await res.text());

  const byType = new Map();
  const byDistrict = new Map();
  const byMethod = new Map();
  const byMonth = new Map();
  let duplicates = 0, open = 0;
  for (const r of rows) {
    const type = r.sr_type_desc || "(no type)";
    const t = byType.get(type) ?? { type, total: 0, closed: 0, duplicates: 0, open: 0, durations: [] };
    t.total++;
    const status = r.sr_status_desc;
    if (status.startsWith("Duplicate")) { t.duplicates++; duplicates++; }
    else if (status.startsWith("Closed") && r.sr_closed_date) {
      const d = days(r.sr_created_date, r.sr_closed_date);
      if (d >= 0) { t.closed++; t.durations.push(d); }
    } else { t.open++; open++; }
    byType.set(type, t);
    const district = r.sr_location_council_district || "";
    const dist = byDistrict.get(district) ?? { district, total: 0, types: new Map() };
    dist.total++;
    dist.types.set(type, (dist.types.get(type) ?? 0) + 1);
    byDistrict.set(district, dist);
    byMethod.set(r.sr_method_received_desc, (byMethod.get(r.sr_method_received_desc) ?? 0) + 1);
    const month = r.sr_created_date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
  }

  const typeRows = [...byType.values()].sort((a, b) => b.total - a.total).slice(0, TOP_TYPES).map((t) => {
    const sorted = t.durations.sort((a, b) => a - b);
    const [key, label] = LABELS[t.type] ?? [t.type, t.type];
    return {
      key, label, type: t.type, total: t.total, closed: t.closed, duplicates: t.duplicates, open: t.open,
      medianDays: round(percentile(sorted, 0.5), 3), p90Days: round(percentile(sorted, 0.9), 3),
      query: queryUrl({ select: "sr_number,sr_status_desc,sr_created_date,sr_closed_date",
        where: `${windowWhere} AND sr_type_desc=${quote(t.type)}`, limit: 100000 }),
      countQuery: queryUrl({ select: "count(*)", where: `${windowWhere} AND sr_type_desc=${quote(t.type)}`, format: "json" })
    };
  });

  const districtRows = [...byDistrict.values()].filter((d) => d.district)
    .sort((a, b) => Number(a.district) - Number(b.district)).map((d) => ({
      district: d.district, total: d.total,
      top: [...d.types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([type, n]) => ({ type, label: (LABELS[type] ?? [type, type])[1], n })),
      query: queryUrl({ select: "sr_type_desc,count(*) as n",
        where: `${windowWhere} AND sr_location_council_district=${quote(d.district)}`,
        group: "sr_type_desc", order: "n DESC", format: "json", limit: 5 })
    }));

  const out = {
    generated: chicagoDate(), from, to,
    dataset: `${HOST}/Utilities-and-City-Services/Austin-311-Public-Data/${DATASET}`,
    total: rows.length, duplicates, open,
    noDistrict: byDistrict.get("")?.total ?? 0,
    totalQuery: queryUrl({ select: "count(*)", format: "json" }),
    statusQuery: queryUrl({ select: "sr_status_desc,count(*) as n", group: "sr_status_desc", order: "n DESC", format: "json" }),
    methodQuery: queryUrl({ select: "sr_method_received_desc,count(*) as n", group: "sr_method_received_desc", order: "n DESC", format: "json" }),
    monthQuery: queryUrl({ select: "date_trunc_ym(sr_created_date) as month,count(*) as n", group: "month", order: "month", format: "json" }),
    methods: [...byMethod.entries()].sort((a, b) => b[1] - a[1]).map(([method, n]) => ({ method, n })),
    months: [...byMonth.entries()].sort().map(([month, n]) => ({ month, n, ...monthLabels(month) })),
    fromLabel: longDate(from), toLabel: longDate(to),
    types: typeRows, districts: districtRows,
    byKey: Object.fromEntries(typeRows.map((t) => [t.key, t]))
  };
  await writeFile("src/_data/feature311.json", `${JSON.stringify(out, null, 2)}\n`);
  console.log(`311: ${out.total} requests ${from}..${to}; ${typeRows.length} types; ${districtRows.length} districts`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
