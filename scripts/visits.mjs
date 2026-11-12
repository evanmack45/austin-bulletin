#!/usr/bin/env node
// Pull the last 7 America/Chicago days of Cloudflare Web Analytics for
// both sites and write metrics/visits.json. The API token stays in the
// environment and is never printed.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chicagoDate } from "./chicago-time.mjs";

export const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
export const ACCOUNTS_URL = "https://api.cloudflare.com/client/v4/accounts";
const WINDOW_DAYS = 7;
const GROUP_LIMIT = 1000;
const HEX = /^[a-f0-9]{32}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const SITES = [
  {
    id: "bulletin",
    name: "The Austin Bulletin",
    host: "theaustinbulletin.com",
    siteTag: "f715e3efc034482ea16a102bcb2c2d36"
  },
  {
    id: "ych",
    name: "Y'all City Hall",
    host: "yallcityhall.org",
    siteTag: "7344ab7bea3140de8c29211155de95fc"
  }
];

const TAG_ENV = {
  bulletin: "BULLETIN_SITE_TAG",
  ych: "YCH_SITE_TAG"
};

export const SAMPLE_NOTE = [
  "Pageviews are the GraphQL count and visits are sum.visits",
  "for human pageloads (bot 0). Cloudflare returns UTC hour buckets;",
  "each date here is an America/Chicago calendar day, the sum of the",
  "hours that fall in it.",
  "sampleInterval is the largest of Cloudflare's hourly sampling",
  "intervals that day: 1 means no hour was sampled down, and a higher",
  "number means the figure is an estimate at that granularity.",
  "\"no rows\" means Cloudflare returned nothing for that day.",
  "Visits and pageviews are stored as the API returned them."
].join(" ");

export const DAY_BASIS =
  "America/Chicago calendar day, summed from Cloudflare UTC hour buckets";

// Used only when Cloudflare rejects the hourly query. The daily query is
// the one this script ran before hour buckets, so a snapshot still lands.
export const FALLBACK_BASIS = "utc-date (hourly query rejected)";

export const FALLBACK_NOTE = [
  "Cloudflare rejected the hourly query, so these figures come from the",
  "daily query: each date is a UTC date, not an America/Chicago day.",
  "Pageviews are the GraphQL count and visits are sum.visits for human",
  "pageloads (bot 0). sampleInterval is Cloudflare's sampling interval for",
  "that date. \"no rows\" means Cloudflare returned nothing for that date."
].join(" ");

export function shiftIsoDate(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// The UTC instant when an America/Chicago calendar day begins. Central is
// UTC-6 or UTC-5, so local midnight is 05:00 or 06:00 UTC.
export function chicagoMidnightUtc(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  for (const offset of [5, 6]) {
    const instant = new Date(Date.UTC(year, month - 1, day, offset));
    const before = new Date(instant.getTime() - 1);
    if (chicagoDate(instant) === iso && chicagoDate(before) !== iso) {
      return instant.toISOString().replace(".000Z", "Z");
    }
  }
  throw new Error(`no Chicago midnight found for ${iso}`);
}

// Half-open UTC range covering the Chicago days start..end inclusive.
export function chicagoRange(start, end) {
  return {
    since: chicagoMidnightUtc(start),
    until: chicagoMidnightUtc(shiftIsoDate(end, 1))
  };
}

export function lastCalendarDays(now = new Date(), count = WINDOW_DAYS) {
  const end = chicagoDate(now);
  const start = shiftIsoDate(end, 1 - count);
  return Array.from({ length: count }, (_, offset) => shiftIsoDate(start, offset));
}

export function sitesFromEnv(env = process.env) {
  return SITES.map((site) => {
    const override = env[TAG_ENV[site.id]];
    return override ? { ...site, siteTag: override } : { ...site };
  });
}

function finiteNumber(value) {
  const number = Number(value == null ? 0 : value);
  return Number.isFinite(number) ? number : 0;
}

function field(object, key) {
  return object == null ? undefined : object[key];
}

// Every Central offset is a whole hour, so a UTC hour bucket lies inside
// exactly one Chicago day.
export function chicagoDayOfHour(hour) {
  const instant = new Date(String(hour || ""));
  return Number.isNaN(instant.getTime()) ? "" : chicagoDate(instant);
}

export function rowFromGroup(group) {
  const sample = field(field(group, "avg"), "sampleInterval");
  const dimensions = field(group, "dimensions");
  const hour = field(dimensions, "datetimeHour");
  // Hour buckets become Chicago days; a daily fallback row keeps its UTC date.
  const date = hour ? chicagoDayOfHour(hour) : field(dimensions, "date") || "";
  return {
    date,
    visits: finiteNumber(field(field(group, "sum"), "visits")),
    pageviews: finiteNumber(field(group, "count")),
    sampleInterval: sample == null ? null : finiteNumber(sample)
  };
}

function zeroDay(date) {
  return { date, visits: 0, pageviews: 0, sampleInterval: null };
}

function addHour(day, row) {
  if (!day) return { ...row };
  const samples = [day.sampleInterval, row.sampleInterval].filter((value) => value != null);
  return {
    date: day.date,
    visits: day.visits + row.visits,
    pageviews: day.pageviews + row.pageviews,
    sampleInterval: samples.length ? Math.max(...samples) : null
  };
}

export function daysFromGroups(groups, windowDays) {
  const byDate = new Map();
  for (const group of groups || []) {
    const row = rowFromGroup(group);
    if (windowDays.includes(row.date)) byDate.set(row.date, addHour(byDate.get(row.date), row));
  }
  return windowDays.map((date) => byDate.get(date) || zeroDay(date));
}

export function totalsFor(days) {
  let visits = 0;
  let pageviews = 0;
  for (const day of days) {
    visits += day.visits;
    pageviews += day.pageviews;
  }
  return { visits, pageviews };
}

export function buildSnapshot({
  sites, groupsById, windowDays, fetchedAt, dayBasis = DAY_BASIS
}) {
  const built = sites.map((site) => {
    const days = daysFromGroups(groupsById[site.id], windowDays);
    return {
      id: site.id,
      name: site.name,
      host: site.host,
      siteTag: site.siteTag,
      days,
      totals: totalsFor(days)
    };
  });
  return {
    fetched_at: fetchedAt,
    timezone: "America/Chicago",
    day_basis: dayBasis,
    window: {
      start: windowDays[0],
      end: windowDays[windowDays.length - 1],
      days: windowDays.length
    },
    sample_interval_note: dayBasis === DAY_BASIS ? SAMPLE_NOTE : FALLBACK_NOTE,
    sites: built
  };
}

export function sameMetrics(left, right) {
  if (!left || !right) return false;
  const rest = ({ fetched_at, ...metrics }) => JSON.stringify(metrics);
  return rest(left) === rest(right);
}

export function stampSnapshot(previous, snapshot) {
  if (!sameMetrics(previous, snapshot)) return snapshot;
  return { ...snapshot, fetched_at: previous.fetched_at };
}

function dayLine(day) {
  // A null interval means Cloudflare returned no rows for that date,
  // which is not the same as a recorded zero.
  const sample = day.sampleInterval == null ? "no rows" : String(day.sampleInterval);
  return `| ${day.date} | ${day.visits} | ${day.pageviews} | ${sample} |`;
}

function siteSection(site) {
  const totals = `${site.totals.visits} visits, ${site.totals.pageviews} pageviews`;
  return [
    `## ${site.name} (${site.host})`,
    "",
    "| Date | Visits | Pageviews | Sample interval |",
    "| --- | ---: | ---: | ---: |",
    ...site.days.map(dayLine),
    "",
    `7-day totals: ${totals}.`,
    ""
  ];
}

export function renderMarkdown(snapshot) {
  const lines = [
    "# Visits",
    "",
    `Pulled ${snapshot.fetched_at}.`,
    `Window ${snapshot.window.start} through ${snapshot.window.end} (${snapshot.timezone}).`,
    `Day basis: ${snapshot.day_basis || DAY_BASIS}.`,
    "",
    snapshot.sample_interval_note,
    "",
    ...snapshot.sites.flatMap(siteSection)
  ];
  return lines.join("\n");
}

function redact(message, token) {
  const text = String(message || "Cloudflare request failed");
  return token ? text.split(token).join("[redacted]") : text;
}

function apiMessage(body) {
  if (!Array.isArray(body?.errors) || body.errors.length === 0) return "";
  return body.errors.map((error) => error.message).filter(Boolean).join("; ");
}

async function readBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

export async function cloudflare(url, token, fetchImpl, init = {}) {
  const response = await fetchImpl(url, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: init.body
  });
  const body = await readBody(response);
  if (!response.ok || body.success === false) {
    const detail = apiMessage(body) || body.raw || `HTTP ${response.status}`;
    const error = new Error(redact(detail, token));
    if (init.accountList) error.code = "ACCOUNTS_UNLISTED";
    throw error;
  }
  return body;
}

export async function listAccounts(token, fetchImpl) {
  const accounts = [];
  let page = 1;
  let pages = 1;
  while (page <= pages) {
    const url = `${ACCOUNTS_URL}?page=${page}&per_page=50`;
    const body = await cloudflare(url, token, fetchImpl, { accountList: true });
    accounts.push(...(body.result || []));
    pages = body.result_info?.total_pages || 1;
    page += 1;
  }
  return accounts;
}

export function missingAccountError() {
  const error = new Error([
    "CLOUDFLARE_ACCOUNT_ID is not set, and this token cannot list accounts.",
    "Add repository secret CLOUDFLARE_ACCOUNT_ID for the account that owns",
    "these Web Analytics sites. docs/routines/owner-weekly.md names",
    "56380d7415cfc386837449682cd00b2d."
  ].join(" "));
  error.code = "ACCOUNT_MISSING";
  return error;
}

async function visibleAccountIds(token, fetchImpl) {
  try {
    const accounts = await listAccounts(token, fetchImpl);
    const ids = accounts.map((account) => account.id).filter(Boolean);
    if (ids.length > 0) return ids;
  } catch (err) {
    if (err.code !== "ACCOUNTS_UNLISTED") throw err;
  }
  throw missingAccountError();
}

function assertShape(label, value, pattern) {
  if (!pattern.test(String(value || ""))) {
    throw new Error(`${label} is not in the expected shape`);
  }
}

function selection(site, bounds, dimension) {
  return `${site.id}: rumPageloadEventsAdaptiveGroups(
    limit: ${GROUP_LIMIT}
    filter: {
      ${bounds}
      bot: 0
      siteTag: "${site.siteTag}"
    }
    orderBy: [${dimension}_ASC]
  ) {
    count
    avg { sampleInterval }
    sum { visits }
    dimensions { ${dimension} }
  }`;
}

function queryShape(basis, start, end) {
  if (basis === "daily") {
    return { dimension: "date", bounds: `date_geq: "${start}"\n      date_leq: "${end}"` };
  }
  const { since, until } = chicagoRange(start, end);
  return {
    dimension: "datetimeHour",
    bounds: `datetime_geq: "${since}"\n      datetime_lt: "${until}"`
  };
}

// basis "hourly" (default) asks for UTC hour buckets across the Chicago
// window. basis "daily" is the older UTC-date query, kept as a fallback.
export function buildQuery({ accountId, sites, start, end, basis = "hourly" }) {
  const { bounds, dimension } = queryShape(basis, start, end);
  const fields = sites.map((site) => selection(site, bounds, dimension)).join("\n");
  return `query {
    viewer {
      accounts(filter: { accountTag: "${accountId}" }) {
        ${fields}
      }
    }
  }`;
}

function graphqlError(body, token) {
  if (!body || !body.errors || body.errors.length === 0) return "";
  const message = apiMessage(body) || "request failed";
  return redact(`Cloudflare GraphQL: ${message}`, token);
}

function accountNode(body) {
  const data = body && body.data;
  const viewer = data && data.viewer;
  const accounts = viewer && viewer.accounts;
  return accounts && accounts[0];
}

function groupsForSite(account, site) {
  const groups = account[site.id] || [];
  if (groups.length >= GROUP_LIMIT) {
    throw new Error(`${site.host} hit the ${GROUP_LIMIT}-row query limit`);
  }
  return groups;
}

export function groupsFromPayload(body, sites, token) {
  const failure = graphqlError(body, token);
  if (failure) throw new Error(failure);
  const account = accountNode(body);
  if (!account) throw new Error("Cloudflare GraphQL returned no account");
  const groupsById = {};
  for (const site of sites) groupsById[site.id] = groupsForSite(account, site);
  return groupsById;
}

export async function queryGroups(options, basis = "hourly") {
  const { token, accountId, sites, start, end, fetchImpl } = options;
  assertShape("account", accountId, HEX);
  assertShape("start", start, DAY);
  assertShape("end", end, DAY);
  for (const site of sites) assertShape(site.id, site.siteTag, HEX);
  const query = buildQuery({ accountId, sites, start, end, basis });
  const body = await cloudflare(GRAPHQL_URL, token, fetchImpl, {
    method: "POST",
    body: JSON.stringify({ query })
  });
  return groupsFromPayload(body, sites, token);
}

// Try the hourly query first. If Cloudflare rejects it (GraphQL errors,
// an unknown field, a non-2xx reply), say so and run the daily UTC-date
// query instead, so a rejected query never costs a snapshot. If the daily
// query fails too, that error is thrown.
export async function queryVisits(options) {
  const log = options.log || ((line) => console.error(line));
  try {
    const groupsById = await queryGroups(options, "hourly");
    return { groupsById, dayBasis: DAY_BASIS };
  } catch (err) {
    log([
      `Hourly visits query rejected: ${err.message}.`,
      "Falling back to the daily UTC-date query;",
      `this snapshot's day_basis is "${FALLBACK_BASIS}".`
    ].join(" "));
  }
  const groupsById = await queryGroups(options, "daily");
  return { groupsById, dayBasis: FALLBACK_BASIS };
}

async function rowsForAccount(accountId, options) {
  try {
    const { groupsById: groups } = await queryVisits({ ...options, accountId });
    return Object.values(groups).reduce((sum, rows) => sum + rows.length, 0);
  } catch (err) {
    return { error: err.message };
  }
}

export async function pickAccount(ids, options) {
  const ranked = [];
  let failure = "query failed";
  for (const id of ids) {
    const result = await rowsForAccount(id, options);
    if (typeof result === "number") ranked.push({ id, rows: result });
    else failure = result.error;
  }
  ranked.sort((left, right) => right.rows - left.rows);
  if (ranked.length === 0) {
    throw new Error([
      "No visible Cloudflare account accepted a Web Analytics query",
      "for these sites. Set repository secret CLOUDFLARE_ACCOUNT_ID.",
      `Last error: ${failure}`
    ].join(" "));
  }
  return ranked[0].id;
}

export async function resolveAccountId(options) {
  const given = String(options.accountId || "").trim();
  if (given) return given;
  const ids = await visibleAccountIds(options.token, options.fetchImpl);
  if (ids.length === 1) return ids[0];
  return pickAccount(ids, options);
}

export function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

async function readSnapshot(file) {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    if (err.code === "ENOENT" || err instanceof SyntaxError) return null;
    throw err;
  }
}

function pullOptions(options) {
  return {
    env: options.env || process.env,
    now: options.now || new Date(),
    fetchImpl: options.fetchImpl || globalThis.fetch,
    root: options.root || repoRoot(),
    dryRun: Boolean(options.dryRun)
  };
}

async function writeMetrics(root, jsonPath, json, markdown) {
  await mkdir(path.dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, json);
  await writeFile(path.join(root, "metrics", "visits.md"), markdown);
}

async function writtenSnapshot(settings, fresh) {
  const jsonPath = path.join(settings.root, "metrics", "visits.json");
  const snapshot = stampSnapshot(await readSnapshot(jsonPath), fresh);
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  const markdown = `${renderMarkdown(snapshot)}\n`;
  if (!settings.dryRun) await writeMetrics(settings.root, jsonPath, json, markdown);
  return { snapshot, json, markdown };
}

export async function pullAndWrite(options = {}) {
  const settings = pullOptions(options);
  const token = settings.env.CLOUDFLARE_ANALYTICS_TOKEN || "";
  if (!token) throw new Error("CLOUDFLARE_ANALYTICS_TOKEN is not set");
  const sites = sitesFromEnv(settings.env);
  const windowDays = lastCalendarDays(settings.now);
  const shared = {
    token,
    sites,
    start: windowDays[0],
    end: windowDays[windowDays.length - 1],
    fetchImpl: settings.fetchImpl
  };
  const accountId = await resolveAccountId({
    ...shared,
    accountId: settings.env.CLOUDFLARE_ACCOUNT_ID
  });
  const { groupsById, dayBasis } = await queryVisits({
    ...shared, accountId, log: options.log
  });
  const fresh = buildSnapshot({
    sites,
    groupsById,
    windowDays,
    fetchedAt: settings.now.toISOString(),
    dayBasis
  });
  const written = await writtenSnapshot(settings, fresh);
  return { ...written, accountId };
}

// Read-only check of the hourly query. Sends only that query (no fallback),
// returns hour-row counts per Chicago day, and writes nothing.
export async function dryRunHourly(options = {}) {
  const settings = pullOptions(options);
  const token = settings.env.CLOUDFLARE_ANALYTICS_TOKEN || "";
  if (!token) throw new Error("CLOUDFLARE_ANALYTICS_TOKEN is not set");
  const sites = sitesFromEnv(settings.env);
  const windowDays = lastCalendarDays(settings.now);
  const start = windowDays[0];
  const end = windowDays[windowDays.length - 1];
  const shared = { token, sites, start, end, fetchImpl: settings.fetchImpl };
  const accountId = await resolveAccountId({
    ...shared, accountId: settings.env.CLOUDFLARE_ACCOUNT_ID
  });
  let groupsById;
  try {
    groupsById = await queryGroups({ ...shared, accountId }, "hourly");
  } catch (err) {
    throw new Error(`Hourly visits query rejected: ${err.message}`);
  }
  return {
    ...chicagoRange(start, end),
    sites: sites.map((site) => {
      const hours = new Map(windowDays.map((date) => [date, 0]));
      for (const group of groupsById[site.id]) {
        const date = rowFromGroup(group).date;
        if (hours.has(date)) hours.set(date, hours.get(date) + 1);
      }
      const days = daysFromGroups(groupsById[site.id], windowDays)
        .map((day) => ({ ...day, hourRows: hours.get(day.date) }));
      return { id: site.id, host: site.host, days };
    })
  };
}

export function renderDryRun(result) {
  const lines = [
    `Dry run, hourly query, nothing written. UTC ${result.since} to ${result.until}.`
  ];
  for (const site of result.sites) {
    lines.push(site.host);
    for (const day of site.days) {
      const rows = day.hourRows === 0 ? "no rows" : `${day.hourRows} hour rows`;
      lines.push(`  ${day.date} ${rows}, ${day.visits} visits, ${day.pageviews} pageviews`);
    }
  }
  return lines.join("\n");
}

function invokedDirectly() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

async function main() {
  if (process.argv.includes("--dry-run")) {
    console.log(renderDryRun(await dryRunHourly()));
    return;
  }
  const { snapshot } = await pullAndWrite();
  const { start, end } = snapshot.window;
  console.log(`Visits ${start} through ${end} (${snapshot.day_basis})`);
  for (const site of snapshot.sites) {
    const { visits, pageviews } = site.totals;
    console.log(`${site.host} ${visits} visits, ${pageviews} pageviews`);
  }
}

if (invokedDirectly()) {
  main().catch((err) => {
    console.error(err.message || "visits pull failed");
    process.exitCode = 1;
  });
}
