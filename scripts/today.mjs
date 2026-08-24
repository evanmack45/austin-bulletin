// Today at a glance — fetches six public data points and writes
// src/_data/glance/YYYY-MM-DD.json.
//
// Usage:
//   node scripts/today.mjs [YYYY-MM-DD]
//
// If no date is given, defaults to today in America/Chicago, computed with
// new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date()).
//
// Each of the six modules (weather, air, lake, pollen, grid, sun) is
// independent: a failure leaves that module `null` in the output and
// records the reason in `errors`. The script exits 0 unless ALL six
// modules fail, in which case it exits 1. The pollen module requires
// POLLEN_API_KEY in the environment.

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const NWS_USER_AGENT = "TheAustinBulletin/1.0 (contact@theaustinbulletin.com)";
const TIMEOUT_MS = 20000;

function computeDefaultDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

// URL without its query string, for error messages (never echo API keys).
function safeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<url>";
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${safeUrl(url)}`);
  }
  return res.json();
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${safeUrl(url)}`);
  }
  return res.text();
}

// Formats an ISO datetime string as "<h:mm a.m./p.m.> <Weekday>" in
// America/Chicago time.
function formatChicagoDateTime(iso) {
  const d = new Date(iso);
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const weekdayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
  });
  let time = timeFmt.format(d);
  time = time.replace(/\s?AM$/i, " a.m.").replace(/\s?PM$/i, " p.m.");
  const weekday = weekdayFmt.format(d);
  return `${time} ${weekday}`;
}

// Formats a local ISO-like string with no offset (e.g. "2026-08-23T07:02")
// as "7:02 a.m." without any timezone conversion.
function formatLocalClock(isoLocal) {
  const timePart = isoLocal.split("T")[1];
  const [hStr, mStr] = timePart.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "p.m." : "a.m.";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  const mm = mStr.padStart(2, "0");
  return `${hour12}:${mm} ${period}`;
}

// --- weather -----------------------------------------------------------

async function fetchWeather(date) {
  const headers = { "User-Agent": NWS_USER_AGENT };
  const forecast = await fetchJson(
    "https://api.weather.gov/gridpoints/EWX/156,91/forecast",
    { headers },
  );
  const periods = forecast.properties.periods;
  const highPeriod = periods.find((p) => p.isDaytime === true && p.startTime.startsWith(date));
  const lowPeriod = periods.find((p) => p.isDaytime === false && p.startTime.startsWith(date));
  if (!highPeriod && !lowPeriod) {
    throw new Error(`no forecast period found for ${date}`);
  }
  const high = highPeriod ? highPeriod.temperature : null;
  const low = lowPeriod ? lowPeriod.temperature : null;
  const summary = highPeriod ? highPeriod.shortForecast : lowPeriod.shortForecast;

  let alerts = [];
  try {
    const alertData = await fetchJson(
      "https://api.weather.gov/alerts/active?zone=TXZ192",
      { headers },
    );
    alerts = (alertData.features || []).map((f) => {
      const event = f.properties.event;
      const ends = f.properties.ends;
      if (!ends) return event;
      return `${event} until ${formatChicagoDateTime(ends)}`;
    });
  } catch {
    // Alerts are a secondary signal; missing them shouldn't fail the module.
    alerts = [];
  }

  return {
    high,
    low,
    summary,
    alerts,
    source: "https://www.weather.gov/ewx/",
  };
}

// --- air -----------------------------------------------------------------

function aqiCategory(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

async function fetchAir() {
  const data = await fetchJson(
    "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.2672&longitude=-97.7431&current=us_aqi,pm2_5,ozone&timezone=America/Chicago",
  );
  const current = data.current;
  const aqi = Math.round(current.us_aqi);
  return {
    aqi,
    category: aqiCategory(aqi),
    pm25: current.pm2_5,
    ozone: current.ozone,
    source: "https://open-meteo.com/en/docs/air-quality-api",
  };
}

// --- lake ------------------------------------------------------------------

function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function parseReservoirCsv(text) {
  const lines = text.split("\n").filter((l) => l.trim().length && !l.startsWith("#"));
  const header = lines[0].split(",").map((s) => s.trim());
  const dateIdx = header.indexOf("date");
  const pctIdx = header.indexOf("percent_full");
  const rows = lines
    .slice(1)
    .filter((l) => l.trim().length)
    .map((line) => {
      const cols = line.split(",");
      return { date: cols[dateIdx], percentFull: parseFloat(cols[pctIdx]) };
    });
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

function findRowOnOrBefore(rows, targetDate) {
  let best = null;
  for (const r of rows) {
    if (r.date > targetDate) break;
    best = r;
  }
  return best;
}

function formatWeekNote(diff) {
  const rounded = Math.round(diff * 10) / 10;
  const sign = rounded >= 0 ? "+" : "−";
  const abs = Math.abs(rounded).toFixed(1);
  return `${sign}${abs} pts vs. last week`;
}

async function fetchLake(date) {
  const conditions = await fetchJson("https://www.waterdatafortexas.org/reservoirs/recent-conditions.json");
  // The endpoint returns an object keyed by reservoir short name, not an array.
  const list = Array.isArray(conditions) ? conditions : Object.values(conditions);
  const travis = list.find((r) => r.full_name === "Lake Travis");
  if (!travis) {
    throw new Error('"Lake Travis" not found in recent-conditions.json');
  }
  const percentFull = travis.percent_full;
  const elevationFt = travis.elevation;

  let weekNote = null;
  try {
    const csvText = await fetchText("https://www.waterdatafortexas.org/reservoirs/individual/travis.csv");
    const rows = parseReservoirCsv(csvText);
    const rowToday = findRowOnOrBefore(rows, date);
    const rowWeekAgo = findRowOnOrBefore(rows, addDays(date, -7));
    if (rowToday && rowWeekAgo && Number.isFinite(rowToday.percentFull) && Number.isFinite(rowWeekAgo.percentFull)) {
      weekNote = formatWeekNote(rowToday.percentFull - rowWeekAgo.percentFull);
    }
  } catch {
    weekNote = null;
  }

  return {
    percentFull,
    elevationFt,
    weekNote,
    source: "https://www.waterdatafortexas.org/reservoirs/individual/travis",
  };
}

// --- pollen ----------------------------------------------------------------

const POLLEN_CATEGORIES = ["None", "Very Low", "Low", "Moderate", "High", "Very High"];

const PLANT_NAMES = {
  RAGWEED: "Ragweed",
  GRAMINALES: "Grasses",
  JUNIPER: "Juniper (cedar)",
  ASH: "Ash",
  ELM: "Elm",
  OAK: "Oak",
  PINE: "Pine",
  COTTONWOOD: "Cottonwood",
  MAPLE: "Maple",
  ALDER: "Alder",
  BIRCH: "Birch",
  CYPRESS_PINE: "Cypress",
  HAZEL: "Hazel",
  OLIVE: "Olive",
  MUGWORT: "Mugwort",
  CHENOPOD: "Chenopods",
};

function titleCasePlant(code) {
  if (PLANT_NAMES[code]) return PLANT_NAMES[code];
  const lower = code.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

async function fetchPollen(date) {
  const key = process.env.POLLEN_API_KEY;
  if (!key) {
    throw new Error("POLLEN_API_KEY is not set");
  }
  const data = await fetchJson(
    "https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=30.2672&location.longitude=-97.7431&days=2&plantsDescription=false",
    { headers: { "X-Goog-Api-Key": key } },
  );
  const dailyInfo = data.dailyInfo || [];
  const [year, month, day] = date.split("-").map(Number);
  const dayInfo =
    dailyInfo.find(
      (d) => d.date && d.date.year === year && d.date.month === month && d.date.day === day,
    ) || dailyInfo[0];
  if (!dayInfo) {
    throw new Error("no dailyInfo entries in pollen response");
  }

  const typeValue = (code) => {
    const t = (dayInfo.pollenTypeInfo || []).find((x) => x.code === code);
    return t && t.indexInfo ? t.indexInfo.value : 0;
  };
  const tree = typeValue("TREE");
  const grass = typeValue("GRASS");
  const weed = typeValue("WEED");
  const index = Math.max(tree, grass, weed);
  const category = POLLEN_CATEGORIES[index];

  const plants = (dayInfo.plantInfo || [])
    .filter((p) => p.indexInfo && p.indexInfo.value >= 2)
    .map((p) => ({ code: p.code, value: p.indexInfo.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((p) => titleCasePlant(p.code));

  const note =
    `Tree ${tree} · Grass ${grass} · Weed ${weed}` + (plants.length ? ` · ${plants.join(", ")}` : "");

  return {
    index,
    category,
    tree,
    grass,
    weed,
    plants,
    note,
    source: "https://developers.google.com/maps/documentation/pollen",
  };
}

// --- grid ----------------------------------------------------------------

async function fetchGrid(date) {
  const data = await fetchJson("https://www.ercot.com/api/1/services/read/dashboards/system-wide-demand.json");
  const candidateKeys = Object.keys(data).filter(
    (k) => k !== "lastUpdated" && k !== "previousDay" && data[k] && Array.isArray(data[k].data),
  );
  if (candidateKeys.length === 0) {
    throw new Error("no current-day data key found in ERCOT response");
  }
  let chosenKey = candidateKeys[0];
  if (candidateKeys.length > 1) {
    const dateMatch = candidateKeys.find((k) => data[k].dayDate && data[k].dayDate.startsWith(date));
    if (dateMatch) chosenKey = dateMatch;
  }
  const rows = data[chosenKey].data;

  let peakRow = null;
  let peakVal = -Infinity;
  for (const row of rows) {
    const v = row.currentLoadForecast ?? row.dayAheadForecast;
    if (v != null && v > peakVal) {
      peakVal = v;
      peakRow = row;
    }
  }
  if (!peakRow) {
    throw new Error("no forecast values found in ERCOT data rows");
  }
  const forecastPeakMw = Math.round(peakVal / 100) * 100;
  const peakHourEnding = peakRow.hourEnding;
  const availableRaw = peakRow.currentDayHsl ?? peakRow.dayAheadHsl;
  const availableMw = availableRaw != null ? Math.round(availableRaw / 100) * 100 : null;

  return {
    forecastPeakMw,
    peakHourEnding,
    availableMw,
    source: "https://www.ercot.com/gridmktinfo/dashboards/systemwidedemand",
  };
}

// --- sun -----------------------------------------------------------------

async function fetchSun(date) {
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=30.2672&longitude=-97.7431&daily=sunrise,sunset&timezone=America/Chicago&start_date=${date}&end_date=${date}`,
  );
  const sunrise = data.daily.sunrise[0];
  const sunset = data.daily.sunset[0];
  return {
    sunrise: formatLocalClock(sunrise),
    sunset: formatLocalClock(sunset),
    source: "https://open-meteo.com/",
  };
}

// --- logging ---------------------------------------------------------------

function logSummary(name, value) {
  switch (name) {
    case "weather":
      return `${value.high ?? "?"}/${value.low ?? "?"}`;
    case "air":
      return `${value.aqi} (${value.category})`;
    case "lake":
      return `${value.percentFull}% full`;
    case "pollen":
      return `${value.category} (${value.tree}/${value.grass}/${value.weed})`;
    case "grid":
      return `${value.forecastPeakMw} MW`;
    case "sun":
      return `${value.sunrise} / ${value.sunset}`;
    default:
      return JSON.stringify(value);
  }
}

// --- main ------------------------------------------------------------------

async function main() {
  const date = process.argv[2] || computeDefaultDate();

  const modules = [
    ["weather", fetchWeather],
    ["air", fetchAir],
    ["lake", fetchLake],
    ["pollen", fetchPollen],
    ["grid", fetchGrid],
    ["sun", fetchSun],
  ];

  const output = { date, fetchedAt: new Date().toISOString() };
  const errors = {};
  let successCount = 0;

  for (const [name, fn] of modules) {
    try {
      const value = await fn(date);
      output[name] = value;
      successCount++;
      console.error(`${name}: ok ${logSummary(name, value)}`);
    } catch (err) {
      output[name] = null;
      const reason = err && err.message ? err.message : String(err);
      errors[name] = reason;
      console.error(`${name}: FAILED ${reason}`);
    }
  }

  output.errors = errors;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");
  const outDir = path.join(repoRoot, "src", "_data", "glance");
  const outPath = path.join(outDir, `${date}.json`);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.error(outPath);

  if (successCount === 0) {
    process.exitCode = 1;
  }
}

main();
