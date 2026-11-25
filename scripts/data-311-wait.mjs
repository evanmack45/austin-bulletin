// Data for the 311 particle story (/austin-311-wait/).
// Usage: node scripts/data-311-wait.mjs [--csv rows.csv]
// Uses the window in src/_data/feature311.json (run data-311.mjs first) and the
// same rules as the text feature: a wait is created -> closed for requests whose
// status starts with "Closed"; duplicates and still-open requests have no wait.
// Writes:
//   src/data/311-wait.bin.gz       one record per request, sorted by map position
//   src/_data/feature311wait.json  every number the page prints, plus map outlines
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { chicagoDate } from "./chicago-time.mjs";
import { parseCsv, percentile, days, queryUrl } from "./data-311.mjs";

const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const BOUNDARIES = "https://data.austintexas.gov/resource/w3v2-cj58.geojson";

// Problem groups the page names. Index = code stored per request. 14 = everything else.
export const GROUPS = [
  ["pothole", "Pothole", ["TPW - Pothole Repair"]],
  ["trash", "Missed trash", ["ARR - Garbage"]],
  ["recycling", "Missed recycling", ["ARR - Recycling"]],
  ["compost", "Missed compost", ["ARR - Compost"]],
  ["bulk", "Bulk item pickup", ["ARR - Bulk"]],
  ["brush", "Brush pickup", ["ARR - Brush"]],
  ["code", "Code officer visit", ["DSD - Request Code Officer"]],
  ["vehicle", "Abandoned vehicle", ["APD - Vehicle Abatement Report"]],
  ["parking", "Parking violation", ["TPW - Parking Violation Enforcement"]],
  ["signal", "Traffic signal problem", ["TPW - Traffic Signal - Maintenance"]],
  ["streetlight", "Streetlight out", ["AE Street Light Issue - Address"]],
  ["dog", "Loose dog", ["Animal Protection - Loose Dog"]],
  ["deadAnimal", "Dead animal pickup", ["ARR - Dead Animal Collection"]],
  ["park", "Park grounds", ["Park Maintenance - Grounds"]],
  ["other", "Everything else", []]
];
const OTHER = GROUPS.length - 1;
const groupOf = new Map(GROUPS.flatMap(([, , types], i) => types.map((t) => [t, i])));

// Wait codes: 0..LEVELS log scale from 1 minute to 365 days (about 11% per step).
// DUP duplicate, OPEN still open, NONE no usable wait.
export const LEVELS = 124, DUP = 125, OPEN = 126, NONE = 127;
const LOG_MAX = Math.log(525600);
export const waitCode = (minutes) => (minutes < 1 ? 0 : Math.min(LEVELS, Math.round((Math.log(minutes) / LOG_MAX) * LEVELS)));
export const SLOT = 15, GRID = 2048;

const round = (n, d = 3) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);
const stats = (list) => {
  const s = list.sort((a, b) => a - b);
  return { closed: s.length, medianDays: round(percentile(s, 0.5)), p90Days: round(percentile(s, 0.9)) };
};

function project(frame) {
  const k = Math.cos(((frame.minLat + frame.maxLat) / 2) * Math.PI / 180);
  const w = (frame.maxLon - frame.minLon) * k, h = frame.maxLat - frame.minLat;
  const s = Math.max(w, h);
  // Normalized: x, y in [0, 1] on the long side; aspect kept.
  return { aspect: w / h, fn: (lon, lat) => [((lon - frame.minLon) * k) / s, (frame.maxLat - lat) / s], w: w / s, h: h / s };
}

function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay);
    let max = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = len === 0 ? Math.hypot(px - ax, py - ay) : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > max) { max = d; at = i; }
    }
    if (max > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

function area(r) {
  let s = 0;
  for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; }
  return s / 2;
}
function centroid(r) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    const f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}

export function minutesSince(start, iso) {
  return Math.round((Date.parse(`${iso.slice(0, 19)}Z`) - Date.parse(`${start}T00:00:00Z`)) / 60000);
}

/** Pull the window's rows (or read a saved CSV) and write both output files. */
export async function build311Wait({ csv } = {}) {
  const base = JSON.parse(await readFile("src/_data/feature311.json", "utf8"));
  const where = `sr_created_date between '${base.from}T00:00:00' and '${base.to}T23:59:59'`;
  let text;
  if (csv) text = await readFile(csv, "utf8");
  else {
    const url = queryUrl({ where, order: "sr_number", limit: 2000000, select:
      "sr_number,sr_type_desc,sr_status_desc,sr_created_date,sr_closed_date,sr_location_lat,sr_location_long,sr_location_council_district" });
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`311 query failed: ${res.status}`);
    text = await res.text();
  }
  const rows = parseCsv(text);
  const geo = await (await fetch(BOUNDARIES, { headers: { "User-Agent": UA } })).json();

  // Map frame: the Council district boundaries plus a margin.
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of geo.features) for (const poly of f.geometry.coordinates) for (const [lon, lat] of poly[0]) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  const padLon = (maxLon - minLon) * 0.06, padLat = (maxLat - minLat) * 0.06;
  const frame = { minLon: minLon - padLon, maxLon: maxLon + padLon, minLat: minLat - padLat, maxLat: maxLat + padLat };
  const proj = project(frame);

  const recs = rows.map((r) => {
    const status = r.sr_status_desc;
    let code = NONE, waitDays = null;
    if (status.startsWith("Duplicate")) code = DUP;
    else if (status.startsWith("Closed") && r.sr_closed_date) {
      const d = days(r.sr_created_date, r.sr_closed_date);
      if (d >= 0) { waitDays = d; code = waitCode(d * 1440); }
    } else code = OPEN;
    const lat = Number(r.sr_location_lat), lon = Number(r.sr_location_long);
    const located = r.sr_location_lat !== "" && lat >= frame.minLat && lat <= frame.maxLat && lon >= frame.minLon && lon <= frame.maxLon;
    const [x, y] = located ? proj.fn(lon, lat) : [0, 0];
    const district = Number(r.sr_location_council_district) || 0;
    return { t: minutesSince(base.from, r.sr_created_date), code, waitDays, located, x, y,
      group: groupOf.get(r.sr_type_desc) ?? OTHER, district, hour: Number(r.sr_created_date.slice(11, 13)) };
  });

  // Binary layout, little-endian, one byte plane per field so gzip can find the patterns.
  // Records are sorted by map position (y, then x, then time). Header (16 bytes):
  // "A312", record count, slot minutes, grid size. Then 9 planes of n bytes:
  // y delta lo/hi, x lo/hi (absolute when y changes, else delta), time slot lo/hi,
  // wait code, meta (group << 4 | district), [reserved: none].
  // Grid: GRID - 1 marks "no usable location".
  const n = recs.length;
  for (const r of recs) {
    r.gx = r.located ? Math.min(GRID - 2, Math.round(r.x * (GRID - 2))) : GRID - 1;
    r.gy = r.located ? Math.min(GRID - 2, Math.round(r.y * (GRID - 2))) : GRID - 1;
    r.slot = Math.floor(r.t / SLOT);
  }
  recs.sort((a, b) => a.gy - b.gy || a.gx - b.gx || a.slot - b.slot);
  const buf = Buffer.alloc(16 + n * 8);
  buf.write("A312", 0, "ascii"); buf.writeUInt32LE(n, 4); buf.writeUInt32LE(SLOT, 8); buf.writeUInt32LE(GRID, 12);
  const plane = (i) => 16 + i * n;
  let py = 0, px = 0;
  recs.forEach((r, i) => {
    const dy = r.gy - py, x = r.gy !== py ? r.gx : (r.gx - px) & 0xffff;
    buf[plane(0) + i] = dy & 255; buf[plane(1) + i] = dy >> 8;
    buf[plane(2) + i] = x & 255; buf[plane(3) + i] = x >> 8;
    buf[plane(4) + i] = r.slot & 255; buf[plane(5) + i] = r.slot >> 8;
    buf[plane(6) + i] = r.code;
    buf[plane(7) + i] = (r.group << 4) | r.district;
    py = r.gy; px = r.gx;
  });
  await mkdir("src/data", { recursive: true });
  const gz = gzipSync(buf, { level: 9 });
  await writeFile("src/data/311-wait.bin.gz", gz);

  // Numbers the page prints.
  const closedAll = recs.filter((r) => r.waitDays !== null).map((r) => r.waitDays);
  const within = (d) => closedAll.filter((x) => x <= d).length;
  const groups = GROUPS.map(([key, label], i) => {
    const mine = recs.filter((r) => r.group === i);
    const byDistrict = Array.from({ length: 10 }, (_, j) => {
      const list = mine.filter((r) => r.district === j + 1 && r.waitDays !== null).map((r) => r.waitDays);
      return { district: j + 1, ...stats(list) };
    });
    return { key, label, total: mine.length, ...stats(mine.filter((r) => r.waitDays !== null).map((r) => r.waitDays)), byDistrict };
  });
  const hours = Array.from({ length: 24 }, (_, h) => recs.filter((r) => r.hour === h).length);
  const longest = closedAll.reduce((m, x) => (x > m ? x : m), 0);
  // Requests per calendar day (created dates are Austin local time).
  const perDay = new Map();
  for (const r of rows) { const d = r.sr_created_date.slice(0, 10); perDay.set(d, (perDay.get(d) || 0) + 1); }
  const dayList = [...perDay].map(([date, count]) => ({ date, count, dow: new Date(`${date}T12:00:00Z`).getUTCDay() }));
  const avg = (list) => Math.round(list.reduce((m, x) => m + x.count, 0) / list.length);
  const days7 = {
    weekdayAvg: avg(dayList.filter((d) => d.dow > 0 && d.dow < 6)),
    weekendAvg: avg(dayList.filter((d) => d.dow === 0 || d.dow === 6)),
    quietest: [...dayList].sort((a, b) => a.count - b.count).slice(0, 3).map(({ date, count }) => ({ date, count })),
    busiest: [...dayList].sort((a, b) => b.count - a.count).slice(0, 3).map(({ date, count }) => ({ date, count }))
  };
  // Share of each district's closed requests that took more than a week.
  const overWeekByDistrict = Array.from({ length: 10 }, (_, j) => {
    const list = recs.filter((r) => r.district === j + 1 && r.waitDays !== null);
    const overWeek = list.filter((r) => r.waitDays > 7).length;
    return { district: j + 1, closed: list.length, overWeek, share: round(overWeek / list.length, 4) };
  });
  const outlines = geo.features.map((f) => ({
    district: Number(f.properties.district_number),
    rings: f.geometry.coordinates.map((poly) => simplify(poly[0].map(([lon, lat]) => proj.fn(lon, lat)), 0.0012)
      .map(([x, y]) => [round(x, 4), round(y, 4)])).filter((r) => r.length > 3)
  })).sort((a, b) => a.district - b.district);
  for (const o of outlines) {
    const ring = [...o.rings].sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
    o.label = centroid(ring).map((v) => round(v, 4));
  }
  const out = {
    generated: chicagoDate(), from: base.from, to: base.to, total: n,
    located: recs.filter((r) => r.located).length,
    closed: closedAll.length, duplicates: recs.filter((r) => r.code === DUP).length, open: recs.filter((r) => r.code === OPEN).length,
    overall: stats([...closedAll]),
    withinHour: within(1 / 24), withinDay: within(1), withinWeek: within(7), overMonth: closedAll.length - within(30),
    overQuarter: closedAll.length - within(91), overYear: closedAll.length - within(365),
    overWeekByDistrict, longestDays: round(longest, 1),
    hours, days: days7, busiestHour: hours.indexOf(Math.max(...hours)), quietestHour: hours.indexOf(Math.min(...hours)),
    groups, byKey: Object.fromEntries(groups.map((x) => [x.key, x])), frame, mapW: round(proj.w, 4), mapH: round(proj.h, 4), outlines,
    bytes: { raw: buf.length, gzip: gz.length }, slotMinutes: SLOT, grid: GRID, levels: LEVELS,
    dataset: base.dataset, boundaries: "https://data.austintexas.gov/d/w3v2-cj58",
    query: queryUrl({ where, limit: 400000, select:
      "sr_number,sr_type_desc,sr_status_desc,sr_created_date,sr_closed_date,sr_location_lat,sr_location_long,sr_location_council_district" })
  };
  await writeFile("src/_data/feature311wait.json", `${JSON.stringify(out)}\n`);
  console.log(`311 wait: ${n} requests (${out.located} on the map), ${buf.length} bytes raw, ${gz.length} gzip`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const csvAt = process.argv.indexOf("--csv");
  await build311Wait({ csv: csvAt > 0 ? process.argv[csvAt + 1] : undefined });
}
