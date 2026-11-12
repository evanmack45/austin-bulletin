import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  buildQuery, buildSnapshot, chicagoMidnightUtc, chicagoRange, DAY_BASIS,
  daysFromGroups, dryRunHourly, FALLBACK_BASIS, lastCalendarDays,
  missingAccountError, pullAndWrite, renderDryRun, renderMarkdown,
  resolveAccountId, SITES, sitesFromEnv, stampSnapshot
} from "../scripts/visits.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts/visits.mjs");
const TOKEN = "analytics-token";
const ACCOUNT = "56380d7415cfc386837449682cd00b2d";
const OTHER = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NOON = new Date("2026-11-05T12:00:00.000Z");
const LATE = new Date("2026-11-05T04:30:00.000Z");

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}

function hourGroup(datetimeHour, visits, pageviews, sampleInterval) {
  return {
    count: pageviews,
    avg: { sampleInterval },
    sum: { visits },
    dimensions: { datetimeHour }
  };
}

// One hour bucket at 18:00 UTC, which is noon or 1 p.m. Central that date.
function dayGroup(date, visits, pageviews, sampleInterval) {
  return hourGroup(`${date}T18:00:00Z`, visits, pageviews, sampleInterval);
}

function payloadFor(accountId) {
  return {
    data: {
      viewer: {
        accounts: [{
          bulletin: [
            dayGroup("2026-11-04", 2, 4, 1),
            dayGroup("2026-11-05", "3", "8", 10),
            hourGroup("2026-11-04T20:00:00Z", 7, 5, 1)
          ],
          ych: [dayGroup("2026-11-03", 1, 1, 1)]
        }]
      }
    },
    accountId
  };
}

function graphql(body, accountId) {
  const query = JSON.parse(body).query;
  assert.equal(query.includes(TOKEN), false);
  assert.match(query, /bot: 0/);
  assert.match(query, /datetime_geq: "2026-10-30T05:00:00Z"/);
  assert.match(query, /datetime_lt: "2026-11-06T06:00:00Z"/);
  assert.match(query, /dimensions \{ datetimeHour \}/);
  assert.match(query, /f715e3efc034482ea16a102bcb2c2d36/);
  assert.match(query, /7344ab7bea3140de8c29211155de95fc/);
  if (accountId && !query.includes(accountId)) {
    return jsonResponse({ errors: [{ message: "account not found" }] });
  }
  return jsonResponse(payloadFor(accountId).data ? {
    data: payloadFor(accountId).data
  } : {});
}

function fetchOk(accountId) {
  return async (url, init) => {
    assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`);
    if (String(url).includes("/accounts?")) {
      throw new Error("account list was not needed");
    }
    return graphql(init.body, accountId);
  };
}

test("an env site tag replaces that site's default", () => {
  const sites = sitesFromEnv({
    BULLETIN_SITE_TAG: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  });
  const bulletin = sites.find((site) => site.id === "bulletin");
  const ych = sites.find((site) => site.id === "ych");
  assert.equal(bulletin.siteTag, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(ych.siteTag, "7344ab7bea3140de8c29211155de95fc");
  assert.equal(SITES[0].siteTag, "f715e3efc034482ea16a102bcb2c2d36");
});

test("the Chicago window ends today and holds seven dates", () => {
  const atNoon = lastCalendarDays(NOON);
  assert.deepEqual(atNoon[0], "2026-10-30");
  assert.equal(atNoon.at(-1), "2026-11-05");
  assert.equal(atNoon.length, 7);
  assert.equal(new Set(atNoon).size, 7);
  const beforeMidnight = lastCalendarDays(LATE);
  assert.equal(beforeMidnight.at(-1), "2026-11-04");
  assert.equal(beforeMidnight[0], "2026-10-29");
});

test("hours in one Chicago day add up and days outside the window are dropped", () => {
  const windowDays = lastCalendarDays(NOON);
  const days = daysFromGroups([
    dayGroup("2026-11-04", 2, 4, 1),
    hourGroup("2026-11-04T20:00:00Z", 7, 5, 1),
    dayGroup("2026-10-01", 50, 50, 1)
  ], windowDays);
  assert.equal(days.length, 7);
  const nov4 = days.find((day) => day.date === "2026-11-04");
  assert.equal(nov4.visits, 9);
  assert.equal(nov4.pageviews, 9);
  assert.equal(days.some((day) => day.date === "2026-10-01"), false);
  assert.equal(days.filter((day) => day.date === "2026-11-04").length, 1);
  const empty = days.find((day) => day.date === "2026-10-30");
  assert.deepEqual(empty, {
    date: "2026-10-30", visits: 0, pageviews: 0, sampleInterval: null
  });
});

test("Chicago midnight is 05:00 UTC in daylight time and 06:00 UTC in standard time", () => {
  assert.equal(chicagoMidnightUtc("2026-10-30"), "2026-10-30T05:00:00Z");
  assert.equal(chicagoMidnightUtc("2026-11-01"), "2026-11-01T05:00:00Z");
  assert.equal(chicagoMidnightUtc("2026-11-02"), "2026-11-02T06:00:00Z");
  assert.equal(chicagoMidnightUtc("2026-03-08"), "2026-03-08T06:00:00Z");
  assert.equal(chicagoMidnightUtc("2026-03-09"), "2026-03-09T05:00:00Z");
  assert.deepEqual(chicagoRange("2026-11-05", "2026-11-11"), {
    since: "2026-11-05T06:00:00Z",
    until: "2026-11-12T06:00:00Z"
  });
});

test("evening Central hours stay on the Chicago day, not the next UTC date", () => {
  const windowDays = ["2026-11-10", "2026-11-11", "2026-11-12"];
  const days = daysFromGroups([
    // 11:00 p.m. Central Nov 10 is 05:00 UTC Nov 11.
    hourGroup("2026-11-11T05:00:00Z", 1, 1, 1),
    // Midnight Central Nov 11 is 06:00 UTC Nov 11.
    hourGroup("2026-11-11T06:00:00Z", 2, 2, 1),
    // 8:00 p.m. Central Nov 11 is 02:00 UTC Nov 12.
    hourGroup("2026-11-12T02:00:00Z", 3, 4, 10),
    // 11:00 p.m. Central Nov 11 is 05:00 UTC Nov 12.
    hourGroup("2026-11-12T05:00:00Z", 1, 1, 1)
  ], windowDays);
  assert.deepEqual(days, [
    { date: "2026-11-10", visits: 1, pageviews: 1, sampleInterval: 1 },
    { date: "2026-11-11", visits: 6, pageviews: 7, sampleInterval: 10 },
    { date: "2026-11-12", visits: 0, pageviews: 0, sampleInterval: null }
  ]);
});

test("the fall-back day holds 25 UTC hours, all on Nov. 1", () => {
  const groups = [];
  for (let hour = 5; hour < 30; hour += 1) {
    const at = new Date(Date.UTC(2026, 10, 1, hour)).toISOString();
    groups.push(hourGroup(at, 1, 1, 1));
  }
  const days = daysFromGroups(groups, ["2026-10-31", "2026-11-01", "2026-11-02"]);
  assert.equal(days[0].pageviews, 0);
  assert.equal(days[1].pageviews, 25);
  assert.equal(days[2].pageviews, 0);
});

test("the query asks for UTC hours across the Chicago window", () => {
  const query = buildQuery({
    accountId: ACCOUNT, sites: SITES, start: "2026-11-06", end: "2026-11-12"
  });
  assert.match(query, /datetime_geq: "2026-11-06T06:00:00Z"/);
  assert.match(query, /datetime_lt: "2026-11-13T06:00:00Z"/);
  assert.match(query, /orderBy: \[datetimeHour_ASC\]/);
  assert.doesNotMatch(query, /date_geq|date_leq|dimensions \{ date \}/);
});

test("a day with no Cloudflare rows says no rows, and the basis is named", () => {
  const snapshot = buildSnapshot({
    sites: SITES,
    groupsById: { bulletin: [dayGroup("2026-11-11", 1, 1, 1)], ych: [] },
    windowDays: ["2026-11-11"],
    fetchedAt: "2026-11-12T12:00:00.000Z"
  });
  assert.equal(snapshot.day_basis, DAY_BASIS);
  assert.match(DAY_BASIS, /America\/Chicago calendar day/);
  const markdown = renderMarkdown(snapshot);
  assert.match(markdown, /\| 2026-11-11 \| 1 \| 1 \| 1 \|/);
  assert.match(markdown, /\| 2026-11-11 \| 0 \| 0 \| no rows \|/);
  assert.match(markdown, /America\/Chicago calendar day/);
});

test("an unchanged snapshot keeps its fetched_at", () => {
  const windowDays = lastCalendarDays(NOON);
  const groupsById = {
    bulletin: [dayGroup("2026-11-05", 3, 8, 10)],
    ych: []
  };
  const first = buildSnapshot({
    sites: SITES, groupsById, windowDays, fetchedAt: "2026-11-05T12:00:00.000Z"
  });
  const second = buildSnapshot({
    sites: SITES, groupsById, windowDays, fetchedAt: "2026-11-05T18:00:00.000Z"
  });
  assert.equal(stampSnapshot(first, second).fetched_at, first.fetched_at);
  const changed = buildSnapshot({
    sites: SITES,
    groupsById: { bulletin: [dayGroup("2026-11-05", 4, 8, 10)], ych: [] },
    windowDays,
    fetchedAt: "2026-11-05T18:00:00.000Z"
  });
  assert.equal(stampSnapshot(first, changed).fetched_at, changed.fetched_at);
});

test("markdown names both sites and the seven-day totals", () => {
  const windowDays = lastCalendarDays(NOON);
  const snapshot = buildSnapshot({
    sites: SITES,
    groupsById: {
      bulletin: [dayGroup("2026-11-05", 3, 8, 1)],
      ych: [dayGroup("2026-11-05", 1, 2, 1)]
    },
    windowDays,
    fetchedAt: "2026-11-05T12:00:00.000Z"
  });
  const markdown = renderMarkdown(snapshot);
  assert.match(markdown, /theaustinbulletin\.com/);
  assert.match(markdown, /yallcityhall\.org/);
  assert.match(markdown, /7-day totals: 3 visits, 8 pageviews/);
  assert.match(markdown, /7-day totals: 1 visits, 2 pageviews/);
  assert.match(markdown, /sampleInterval/);
});

test("a provided account id is used without listing accounts", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "visits-"));
  const result = await pullAndWrite({
    now: NOON,
    root: dir,
    env: { CLOUDFLARE_ANALYTICS_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT },
    fetchImpl: fetchOk(ACCOUNT)
  });
  assert.equal(result.accountId, ACCOUNT);
  assert.equal(result.json.includes(TOKEN), false);
  const saved = JSON.parse(await readFile(path.join(dir, "metrics/visits.json"), "utf8"));
  const bulletin = saved.sites.find((site) => site.id === "bulletin");
  const nov4 = bulletin.days.find((day) => day.date === "2026-11-04");
  assert.equal(bulletin.days.length, 7);
  assert.equal(nov4.visits, 9);
  assert.equal(nov4.pageviews, 9);
  assert.equal(bulletin.totals.visits, 12);
  assert.equal(bulletin.totals.pageviews, 17);
  const ych = saved.sites.find((site) => site.id === "ych");
  const nov3 = ych.days.find((day) => day.date === "2026-11-03");
  assert.equal(nov3.visits, 1);
  assert.equal(nov3.sampleInterval, 1);
  const nov5 = bulletin.days.find((day) => day.date === "2026-11-05");
  assert.equal(nov5.sampleInterval, 10);
  assert.equal(nov5.visits, 3);
  assert.equal(nov5.pageviews, 8);
});

test("running again overwrites that day instead of appending", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "visits-"));
  const env = { CLOUDFLARE_ANALYTICS_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT };
  await pullAndWrite({ now: NOON, root: dir, env, fetchImpl: fetchOk(ACCOUNT) });
  const later = new Date("2026-11-05T13:00:00.000Z");
  const second = await pullAndWrite({
    now: later, root: dir, env, fetchImpl: fetchOk(ACCOUNT)
  });
  const bulletin = second.snapshot.sites[0];
  assert.equal(bulletin.days.length, 7);
  assert.equal(second.snapshot.fetched_at, NOON.toISOString());
  const text = await readFile(path.join(dir, "metrics/visits.json"), "utf8");
  assert.equal(text.includes(TOKEN), false);
});

test("a missing account list names the secret to add", async () => {
  const fetchImpl = async () => jsonResponse({
    success: false,
    errors: [{ message: "Authentication error" }]
  }, 403);
  await assert.rejects(
    () => resolveAccountId({
      token: TOKEN,
      accountId: "",
      fetchImpl,
      sites: SITES,
      start: "2026-10-30",
      end: "2026-11-05"
    }),
    (err) => {
      assert.match(err.message, /CLOUDFLARE_ACCOUNT_ID/);
      assert.equal(err.message.includes(TOKEN), false);
      return true;
    }
  );
  assert.match(missingAccountError().message, /56380d7415cfc386837449682cd00b2d/);
});

test("several accounts resolve to the one that owns the sites", async () => {
  const fetchImpl = async (url, init) => {
    assert.equal(init.headers.Authorization.includes(TOKEN), true);
    if (String(url).includes("/accounts?")) {
      return jsonResponse({
        success: true,
        result: [{ id: OTHER }, { id: ACCOUNT }],
        result_info: { total_pages: 1 }
      });
    }
    return graphql(init.body, ACCOUNT);
  };
  const accountId = await resolveAccountId({
    token: TOKEN,
    accountId: "  ",
    fetchImpl,
    sites: SITES,
    start: "2026-10-30",
    end: "2026-11-05"
  });
  assert.equal(accountId, ACCOUNT);
});

test("the script exits when the token is missing and does not print one", async () => {
  const env = { ...process.env };
  delete env.CLOUDFLARE_ANALYTICS_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  try {
    await execFileAsync(process.execPath, [script], { cwd: root, env });
    assert.fail("expected the script to exit");
  } catch (err) {
    assert.equal(err.code, 1);
    const output = `${err.stdout || ""}\n${err.stderr || ""}`;
    assert.match(output, /CLOUDFLARE_ANALYTICS_TOKEN is not set/);
    assert.equal(output.includes("Bearer"), false);
  }
});

const UNKNOWN_FIELD = {
  data: null,
  errors: [{ message: "unknown field \"datetimeHour\"", path: ["viewer"] }]
};

function dailyPayload() {
  return {
    data: {
      viewer: {
        accounts: [{
          bulletin: [{
            count: 4, avg: { sampleInterval: 1 }, sum: { visits: 3 },
            dimensions: { date: "2026-11-05" }
          }],
          ych: []
        }]
      }
    }
  };
}

// Answers the hourly query with `hourly` and the daily query with `daily`,
// and records which kind of query each call was.
function fallbackFetch(hourly, daily, calls) {
  return async (url, init) => {
    const query = JSON.parse(init.body).query;
    const kind = query.includes("datetimeHour") ? "hourly" : "daily";
    calls.push(kind);
    if (kind === "daily") {
      assert.match(query, /date_geq: "2026-10-30"/);
      assert.match(query, /date_leq: "2026-11-05"/);
      assert.match(query, /dimensions \{ date \}/);
    }
    return kind === "hourly" ? hourly() : daily();
  };
}

const ENV = { CLOUDFLARE_ANALYTICS_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT };

test("a rejected hourly query falls back to the daily query and still writes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "visits-"));
  const calls = [];
  const logged = [];
  const result = await pullAndWrite({
    now: NOON,
    root: dir,
    env: ENV,
    log: (line) => logged.push(line),
    fetchImpl: fallbackFetch(
      () => jsonResponse(UNKNOWN_FIELD),
      () => jsonResponse(dailyPayload()),
      calls
    )
  });
  assert.deepEqual(calls, ["hourly", "daily"]);
  assert.equal(logged.length, 1);
  assert.match(logged[0], /Hourly visits query rejected: .*unknown field "datetimeHour"/);
  assert.match(logged[0], /utc-date \(hourly query rejected\)/);
  assert.equal(logged[0].includes(TOKEN), false);
  const saved = JSON.parse(await readFile(path.join(dir, "metrics/visits.json"), "utf8"));
  assert.equal(saved.day_basis, FALLBACK_BASIS);
  assert.equal(FALLBACK_BASIS, "utc-date (hourly query rejected)");
  assert.match(saved.sample_interval_note, /UTC date/);
  const nov5 = saved.sites[0].days.find((day) => day.date === "2026-11-05");
  assert.deepEqual(nov5, { date: "2026-11-05", visits: 3, pageviews: 4, sampleInterval: 1 });
  const markdown = await readFile(path.join(dir, "metrics/visits.md"), "utf8");
  assert.match(markdown, /Day basis: utc-date \(hourly query rejected\)\./);
  assert.match(markdown, /\| 2026-11-04 \| 0 \| 0 \| no rows \|/);
  assert.equal(result.snapshot.day_basis, FALLBACK_BASIS);
});

test("a non-2xx reply to the hourly query also falls back", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "visits-"));
  const calls = [];
  const result = await pullAndWrite({
    now: NOON,
    root: dir,
    env: ENV,
    log: () => {},
    fetchImpl: fallbackFetch(
      () => jsonResponse({ errors: [{ message: "bad filter datetime_lt" }] }, 400),
      () => jsonResponse(dailyPayload()),
      calls
    )
  });
  assert.deepEqual(calls, ["hourly", "daily"]);
  assert.equal(result.snapshot.day_basis, FALLBACK_BASIS);
});

test("an accepted hourly query never runs the daily query", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "visits-"));
  const calls = [];
  const logged = [];
  const result = await pullAndWrite({
    now: NOON,
    root: dir,
    env: ENV,
    log: (line) => logged.push(line),
    fetchImpl: fallbackFetch(
      () => jsonResponse({ data: payloadFor(ACCOUNT).data }),
      () => assert.fail("daily query should not run"),
      calls
    )
  });
  assert.deepEqual(calls, ["hourly"]);
  assert.deepEqual(logged, []);
  assert.equal(result.snapshot.day_basis, DAY_BASIS);
  const markdown = await readFile(path.join(dir, "metrics/visits.md"), "utf8");
  assert.match(markdown, /Day basis: America\/Chicago calendar day/);
});

test("when both queries are rejected the run fails and writes nothing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "visits-"));
  const calls = [];
  await assert.rejects(
    () => pullAndWrite({
      now: NOON,
      root: dir,
      env: ENV,
      log: () => {},
      fetchImpl: fallbackFetch(
        () => jsonResponse(UNKNOWN_FIELD),
        () => jsonResponse({ errors: [{ message: "daily broke too" }] }),
        calls
      )
    }),
    /daily broke too/
  );
  assert.deepEqual(calls, ["hourly", "daily"]);
  assert.deepEqual(await readdir(dir), []);
});

test("the dry run sends only the hourly query, counts hour rows, and writes nothing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "visits-"));
  const calls = [];
  const hourly = {
    data: {
      viewer: {
        accounts: [{
          bulletin: [
            hourGroup("2026-11-04T18:00:00Z", 2, 4, 1),
            hourGroup("2026-11-05T02:00:00Z", 1, 1, 1)
          ],
          ych: []
        }]
      }
    }
  };
  const result = await dryRunHourly({
    now: NOON,
    root: dir,
    env: ENV,
    fetchImpl: fallbackFetch(
      () => jsonResponse(hourly),
      () => assert.fail("dry run must not fall back"),
      calls
    )
  });
  assert.deepEqual(calls, ["hourly"]);
  assert.deepEqual(await readdir(dir), []);
  assert.equal(result.since, "2026-10-30T05:00:00Z");
  assert.equal(result.until, "2026-11-06T06:00:00Z");
  const nov4 = result.sites[0].days.find((day) => day.date === "2026-11-04");
  assert.equal(nov4.hourRows, 2);
  assert.equal(nov4.pageviews, 5);
  const text = renderDryRun(result);
  assert.match(text, /nothing written/);
  assert.match(text, /2026-11-04 2 hour rows, 3 visits, 5 pageviews/);
  assert.match(text, /yallcityhall\.org\n {2}2026-10-30 no rows/);
});

test("a rejected hourly query fails the dry run without falling back", async () => {
  const calls = [];
  await assert.rejects(
    () => dryRunHourly({
      now: NOON,
      env: ENV,
      fetchImpl: fallbackFetch(
        () => jsonResponse(UNKNOWN_FIELD),
        () => assert.fail("dry run must not fall back"),
        calls
      )
    }),
    /Hourly visits query rejected: .*unknown field/
  );
  assert.deepEqual(calls, ["hourly"]);
});

test("--dry-run exits without a token and prints none", async () => {
  const env = { ...process.env };
  delete env.CLOUDFLARE_ANALYTICS_TOKEN;
  try {
    await execFileAsync(process.execPath, [script, "--dry-run"], { cwd: root, env });
    assert.fail("expected the dry run to exit");
  } catch (err) {
    assert.equal(err.code, 1);
    assert.match(`${err.stdout}\n${err.stderr}`, /CLOUDFLARE_ANALYTICS_TOKEN is not set/);
  }
});
