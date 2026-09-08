// Civic utilities — fetch recent, attributable civic records from data.austintexas.gov (Socrata).
//
// Usage:
//   npm run civic -- [--days N] [--category inspections|workzones|all] [--limit N]
//   node scripts/civic.mjs [--days N] [--category inspections|workzones|all] [--limit N]
//
// Notes:
// - FREE only: public Socrata API. If SOCRATA_APP_TOKEN is set in the environment, it will be used.
// - Honest User-Agent per gather policy: TheAustinBulletin/1.0 (+https://theaustinbulletin.com)
// - Austin-proper only: chosen datasets are City of Austin-owned and scoped to Austin systems.
// - Dockets/hearings: no clean, row-level public dataset exists today; the script documents and skips it.
//
// Output: a desk-ready shortlist per category
// - date (or range), what, where/address (if present), source dataset title + id, dataset URL
// - never invent numbers; prints nothing for empty categories
//
// Categories implemented:
// - inspections: Food Establishment Inspection Scores (ecmv-9xxi)
// - workzones: Roadway Work Zones (qyfh-gwei)

const USER_AGENT = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const TIMEOUT_MS = 20000;
const SOCRATA_BASE = "https://data.austintexas.gov";

function parseArgs(argv) {
  const args = { days: 3, category: "all", limit: 25 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (a === "--days") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) fail("days must be a positive integer");
      args.days = Math.floor(v);
    } else if (a === "--limit") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) fail("limit must be a positive integer");
      args.limit = Math.floor(v);
    } else if (a === "--category") {
      const v = (argv[++i] || "").toLowerCase();
      if (!["inspections", "workzones", "all"].includes(v)) {
        fail("category must be one of inspections|workzones|all");
      }
      args.category = v;
    } else {
      fail(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function printHelp() {
  console.log("Usage: node scripts/civic.mjs [--days N] [--category inspections|workzones|all] [--limit N]");
  console.log("");
  console.log("Fetch recent civic records from data.austintexas.gov (Socrata) for Desk to consider.");
  console.log("Categories:");
  console.log("  inspections  Food Establishment Inspection Scores (ecmv-9xxi)");
  console.log("  workzones    Roadway Work Zones (qyfh-gwei)");
  console.log("");
  console.log("Flags:");
  console.log("  --days N       Look back/around window in days (default 3).");
  console.log("                 Inspections: created in the last N days.");
  console.log("                 Work zones: active or starting within ±N days of now.");
  console.log("  --limit N      Max records per category (default 25).");
  console.log("  --category     One of inspections|workzones|all (default all).");
  console.log("");
  console.log("Dockets/hearings: no clean public row-level dataset is available on data.austintexas.gov today.");
  console.log("This script skips that category rather than inventing facts. See EDITORIAL.md and PIPELINE.md.");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function chicagoDateString(d = new Date()) {
  // YYYY-MM-DD in America/Chicago — matches repo style in scripts/today.mjs
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(d);
}

function startOfDayIsoLocalChicago(daysAgo = 0) {
  const dateStr = chicagoDateString(new Date(Date.now() - daysAgo * 86400000));
  // Socrata accepts ISO-like strings with no timezone offset for date filtering.
  return `${dateStr}T00:00:00.000`;
}

function endOfDayIsoLocalChicago(daysAhead = 0) {
  const dateStr = chicagoDateString(new Date(Date.now() + daysAhead * 86400000));
  return `${dateStr}T23:59:59.999`;
}

function safeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<url>";
  }
}

async function fetchJson(url, headers = {}) {
  const appToken = process.env.SOCRATA_APP_TOKEN;
  const finalHeaders = {
    "User-Agent": USER_AGENT,
    ...(appToken ? { "X-App-Token": appToken } : {}),
    ...headers,
  };
  const res = await fetch(url, { headers: finalHeaders, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${safeUrl(url)}${body ? ` — ${body.slice(0, 180)}` : ""}`);
  }
  return res.json();
}

function socrataUrl(resourceId, params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    q.set(k, String(v));
  }
  return `${SOCRATA_BASE}/resource/${resourceId}.json?${q.toString()}`;
}

// --- Category: inspections (Food Establishment Inspection Scores) ----------

const INSPECTIONS = {
  id: "ecmv-9xxi",
  title: "Food Establishment Inspection Scores",
  catalogUrl: `${SOCRATA_BASE}/Health-and-Community-Services/Food-Establishment-Inspection-Scores/ecmv-9xxi`,
};

async function fetchInspections(days, limit) {
  const where = `inspection_date >= '${startOfDayIsoLocalChicago(days)}' AND score IS NOT NULL`;
  const select = [
    "restaurant_name",
    "address",
    "zip_code",
    "inspection_date",
    "score",
    "process_description",
  ].join(", ");
  const url = socrataUrl(INSPECTIONS.id, {
    $select: select,
    $where: where,
    $order: "inspection_date DESC",
    $limit: limit,
  });
  const rows = await fetchJson(url);
  return rows.map((r) => ({
    dataset: INSPECTIONS,
    when: (r.inspection_date || "").slice(0, 10),
    what: `${r.restaurant_name || "Unknown"} — score ${r.score}${r.process_description ? ` (${r.process_description})` : ""}`,
    where: [r.address, r.zip_code].filter(Boolean).join(", "),
  }));
}

// --- Category: workzones (Roadway Work Zones) ------------------------------

const WORKZONES = {
  id: "qyfh-gwei",
  title: "Roadway Work Zones",
  catalogUrl: `${SOCRATA_BASE}/Transportation-and-Mobility/Roadway-Work-Zones/qyfh-gwei`,
};

async function fetchWorkzones(days, limit) {
  // Active now or starting within ±days — intersects the window around "now".
  const where = [
    `end_date >= '${startOfDayIsoLocalChicago(days)}'`,
    `start_date <= '${endOfDayIsoLocalChicago(days)}'`,
    "(vehicle_impact IS NOT NULL)",
  ].join(" AND ");
  const select = [
    "road_names",
    "description",
    "start_date",
    "end_date",
    "vehicle_impact",
    "direction",
  ].join(", ");
  const url = socrataUrl(WORKZONES.id, {
    $select: select,
    $where: where,
    $order: "start_date ASC",
    $limit: limit,
  });
  const rows = await fetchJson(url);
  return rows.map((r) => {
    const start = (r.start_date || "").replace("T", " ").slice(0, 16);
    const end = (r.end_date || "").replace("T", " ").slice(0, 16);
    const range = start && end ? `${start} → ${end}` : start || end || "";
    const what = [r.road_names, r.vehicle_impact].filter(Boolean).join(" — ");
    const extra = r.description ? ` · ${r.description}` : "";
    return {
      dataset: WORKZONES,
      when: range,
      what: what + extra,
      where: r.direction ? r.direction : "",
    };
  });
}

function printSectionHeader(title, dataset) {
  console.log(`\n### ${title}`);
  console.log(`Source: ${dataset.title} (${dataset.id}) — ${dataset.catalogUrl}`);
}

function printItems(items) {
  for (const it of items) {
    const where = it.where ? ` — ${it.where}` : "";
    console.log(`- ${it.when} — ${it.what}${where}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const categories = [];
  if (args.category === "all" || args.category === "inspections") categories.push("inspections");
  if (args.category === "all" || args.category === "workzones") categories.push("workzones");

  let hadAny = false;
  let hadFailure = false;

  for (const cat of categories) {
    try {
      if (cat === "inspections") {
        const items = await fetchInspections(args.days, args.limit);
        if (items.length) {
          printSectionHeader("Inspections", INSPECTIONS);
          printItems(items);
          hadAny = true;
        }
      } else if (cat === "workzones") {
        const items = await fetchWorkzones(args.days, args.limit);
        if (items.length) {
          printSectionHeader("Work zones / street closures", WORKZONES);
          printItems(items);
          hadAny = true;
        }
      }
    } catch (err) {
      hadFailure = true;
      console.error(`${cat}: FAILED ${err && err.message ? err.message : String(err)}`);
    }
  }

  // Dockets/hearings disclosure (documented non-capability by policy).
  if (args.category === "all") {
    console.log("\n### Dockets/hearings");
    console.log("No clean public row-level docket/hearing dataset found on data.austintexas.gov.");
    console.log("Skipping by policy — never invent facts. Caseload summaries exist but are not suitable for daily utility.");
  }

  if (!hadAny && hadFailure) {
    process.exitCode = 1;
  }
}

await main();

