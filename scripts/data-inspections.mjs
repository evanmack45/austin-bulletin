// Build the food-inspection feature data from the City's public inspection scores.
// Usage: node scripts/data-inspections.mjs [FROM YYYY-MM-DD] [TO YYYY-MM-DD] [--no-chart]
// Default window: the last 12 complete calendar months before today (Chicago).
// Writes src/_data/featureInspections.json, data/inspections-chart.json and the two chart
// images. Every figure on /austin-restaurant-inspection-scores/ comes from that JSON, and
// every count links to a City query that returns the same rows. Only totals by score band and
// by ZIP code are published here. No business is named.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { chicagoDate } from "./chicago-time.mjs";
import { defaultWindow, longDate, monthLabels, parseCsv, percentile } from "./data-311.mjs";

const DATASET = "ecmv-9xxi";
const HOST = "https://data.austintexas.gov";
const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const MIN_ZIP = 100;
const FOLLOW_DAYS = 60;

export const BANDS = [
  { key: "u70", label: "Under 70", lo: 0, hi: 69 },
  { key: "70", label: "70–74", lo: 70, hi: 74 },
  { key: "75", label: "75–79", lo: 75, hi: 79 },
  { key: "80", label: "80–84", lo: 80, hi: 84 },
  { key: "85", label: "85–89", lo: 85, hi: 89 },
  { key: "90", label: "90–94", lo: 90, hi: 94 },
  { key: "95", label: "95–100", lo: 95, hi: 100 }
];

export function queryUrl({ where, select, group, order, format = "csv", limit } = {}) {
  const params = new URLSearchParams();
  if (select) params.set("$select", select);
  if (where) params.set("$where", where);
  if (group) params.set("$group", group);
  if (order) params.set("$order", order);
  if (limit) params.set("$limit", String(limit));
  return `${HOST}/resource/${DATASET}.${format}?${params}`;
}

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const pct = (n, d) => Math.round((n / d) * 100);
const round1 = (n) => Math.round(n * 10) / 10;

/** Sentences and labels that depend on the numbers, built here so a refresh cannot leave them stale. */
export function proseFor(d) {
  const period = `${monthLabels(d.from.slice(0, 7)).label} through ${monthLabels(d.to.slice(0, 7)).label}`;
  const description = `An original Austin Bulletin analysis of ${d.routine.toLocaleString("en-US")} routine ` +
    `food-establishment inspections from ${period}: how scores are spread, how they differ by ZIP code, ` +
    `what happens after a failing score, and what a score means when you pick a place to eat.`;
  const chartAlt = `Bar chart of routine food inspections by score, ${period}: ` +
    `${d.bands.map((b) => `${b.label} ${b.n.toLocaleString("en-US")}`).join(", ")}.`;
  return { period, description, chartAlt };
}

export function chartSpec(d) {
  const top = d.bands.reduce((a, b) => (b.n > a.n ? b : a));
  const short = (iso) => {
    const [y, m] = iso.split("-");
    return `${monthLabels(`${y}-${m}`).short.slice(0, 3).toUpperCase()}. ${y}`;
  };
  return {
    out: "src/images/features/austin-restaurant-inspection-scores",
    even: true,
    kicker: `AUSTIN FOOD INSPECTIONS · ${short(d.from)} TO ${short(d.to)}`,
    bignum: `${d.greenPct}%`,
    qualifier: "of routine inspections scored 90 or higher",
    headline: `${d.redN} of ${d.routine.toLocaleString("en-US")} routine inspections scored under 70, the City's red band.`,
    subtitle: "Routine inspections by score in the City's public data",
    bars: d.bands.map((b) => ({
      label: b.label, value: b.n.toLocaleString("en-US"), n: b.n, ...(b.key === top.key ? { hi: true } : {})
    }))
  };
}

export async function buildInspections(from, to) {
  const where = `inspection_date between '${from}T00:00:00' and '${to}T23:59:59'`;
  const routineWhere = `${where} AND process_description='Routine Inspection'`;
  const fields = "inspectionid,facility_id,inspection_date,score,zip_code,process_description,inspectionscorecategory";
  const fetchRows = async (extra) => {
    const res = await fetch(queryUrl({ select: fields, where: extra, order: "inspection_date", limit: 200000 }), { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`inspection query failed: ${res.status}`);
    return parseCsv(await res.text());
  };
  // The whole three-year file, for "what happened next" and the latest inspection date.
  const all = await fetchRows("inspection_date > '2000-01-01T00:00:00'");
  const inWindow = all.filter((r) => r.inspection_date.slice(0, 10) >= from && r.inspection_date.slice(0, 10) <= to);
  const routineRows = inWindow.filter((r) => r.process_description === "Routine Inspection" && r.score !== "");
  const scores = routineRows.map((r) => Number(r.score)).sort((a, b) => a - b);
  const routine = scores.length;
  const redN = scores.filter((s) => s < 70).length;
  const greenN = scores.filter((s) => s >= 90).length;
  const yellowN = routine - redN - greenN;

  const bands = BANDS.map((b) => {
    const n = scores.filter((s) => s >= b.lo && s <= b.hi).length;
    const clause = b.lo === 0 ? `score < 70` : `score between ${b.lo} and ${b.hi}`;
    return { ...b, n, share: pct(n, routine), query: queryUrl({ select: "count(*)", where: `${routineWhere} AND ${clause}`, format: "json" }) };
  });

  const byZip = new Map();
  for (const r of routineRows) {
    const zip = r.zip_code.slice(0, 5);
    if (!byZip.has(zip)) byZip.set(zip, []);
    byZip.get(zip).push(Number(r.score));
  }
  const zips = [...byZip.entries()].filter(([, v]) => v.length >= MIN_ZIP).sort(([a], [b]) => a.localeCompare(b)).map(([zip, v]) => {
    v.sort((a, b) => a - b);
    return {
      zip, n: v.length, median: percentile(v, 0.5), greenPct: pct(v.filter((s) => s >= 90).length, v.length),
      redN: v.filter((s) => s < 70).length,
      query: queryUrl({ select: "count(*)", where: `${routineWhere} AND zip_code like '${zip}%'`, format: "json" })
    };
  });

  // After a failing routine score (1-69; a score of 0 is not explained by the City), the same
  // facility's next inspection of any kind, for failing scores early enough to have a next one.
  const byFacility = new Map();
  for (const r of all) {
    if (!byFacility.has(r.facility_id)) byFacility.set(r.facility_id, []);
    byFacility.get(r.facility_id).push({ date: r.inspection_date.slice(0, 10), score: r.score === "" ? null : Number(r.score), type: r.process_description });
  }
  const cutoff = addDays(to, -FOLLOW_DAYS);
  const nexts = [];
  let failing = 0;
  for (const r of routineRows) {
    const s = Number(r.score);
    const date = r.inspection_date.slice(0, 10);
    if (!(s > 0 && s < 70) || date > cutoff) continue;
    failing++;
    const later = (byFacility.get(r.facility_id) ?? []).filter((x) => x.date > date && x.score !== null).sort((a, b) => a.date.localeCompare(b.date));
    if (later[0]) nexts.push({ days: (Date.parse(later[0].date) - Date.parse(date)) / 86400000, score: later[0].score });
  }
  const gaps = nexts.map((x) => x.days).sort((a, b) => a - b);
  const next = {
    failing, cutoff, withNext: nexts.length,
    medianDays: gaps.length ? percentile(gaps, 0.5) : null,
    minScore: nexts.length ? Math.min(...nexts.map((x) => x.score)) : null,
    maxScore: nexts.length ? Math.max(...nexts.map((x) => x.score)) : null,
    passed: nexts.filter((x) => x.score >= 70).length,
    within30: nexts.filter((x) => x.days <= 30).length
  };

  const zeros = scores.filter((s) => s === 0).length;
  const facilities = new Set(inWindow.map((r) => r.facility_id)).size;
  const latest = all.map((r) => r.inspection_date.slice(0, 10)).sort().at(-1);
  const out = {
    generated: chicagoDate(), generatedLabel: longDate(chicagoDate()), from, to,
    fromLabel: longDate(from), toLabel: longDate(to), latest, latestLabel: longDate(latest),
    dataset: `${HOST}/Health-and-Community-Services/Food-Establishment-Inspection-Scores/${DATASET}`,
    routine, followUps: inWindow.length - routine, facilities, median: percentile(scores, 0.5),
    greenN, yellowN, redN, zeros, greenPct: pct(greenN, routine), yellowPct: pct(yellowN, routine),
    redOneIn: redN ? Math.round(routine / redN) : null,
    routineQuery: queryUrl({ select: "count(*)", where: routineWhere, format: "json" }),
    categoryQuery: queryUrl({ select: "inspectionscorecategory,count(*) as n", where: routineWhere, group: "inspectionscorecategory", order: "n DESC", format: "json" }),
    zeroQuery: queryUrl({ select: "count(*)", where: `${routineWhere} AND score=0`, format: "json" }),
    failingQuery: queryUrl({ select: "inspectionid,inspection_date,score,process_description", where: `${routineWhere} AND score between 1 and 69`, order: "inspection_date", format: "csv", limit: 1000 }),
    minZip: MIN_ZIP, followDays: FOLLOW_DAYS, bands, zips, next, zipCount: byZip.size,
    spread: { lo: round1(Math.min(...zips.map((z) => z.median))), hi: round1(Math.max(...zips.map((z) => z.median))) }
  };
  Object.assign(out, proseFor(out));
  await writeFile("src/_data/featureInspections.json", `${JSON.stringify(out, null, 2)}\n`);
  console.log(`inspections: ${routine} routine ${from}..${to}; ${zips.length} ZIPs with ${MIN_ZIP}+; latest ${latest}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const [from, to] = args.length >= 2 ? args : defaultWindow();
  const data = await buildInspections(from, to);
  if (!process.argv.includes("--no-chart")) {
    await writeFile("data/inspections-chart.json", `${JSON.stringify(chartSpec(data), null, 2)}\n`);
    execFileSync("node", ["scripts/lead-chart.mjs", "data/inspections-chart.json"], { stdio: "inherit" });
  }
  await readFile("src/_data/featureInspections.json");
}
