import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chicagoDate, deadlineStillOpen } from "../scripts/chicago-time.mjs";
import { forecastAlerts } from "../scripts/frontpage.mjs";
import {
  isoDate, longDate, monthDay, readableDate, shortMonthDay, weekdayName
} from "../scripts/edition-dates.mjs";

const LATE = new Date("2026-10-27T01:30:00Z");

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && !entry.name.startsWith(".")) {
        out.push(...listFiles(full));
      }
    } else if (/\.(mjs|js|njk)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function takesUtcCalendarDay(text) {
  return /new Date\(\)\.toISOString\(\)\.slice\(\s*0\s*,\s*10\s*\)/.test(text)
    || /new Date\(\)\.getUTC(?:FullYear|Month|Date)/.test(text);
}

function localeWithoutChicago(text) {
  const calls = text.match(/new Date\(\)\.toLocaleDateString\([\s\S]*?\)/g) || [];
  return calls.some((call) => !call.includes("America/Chicago"));
}

function bulletinDays() {
  return readdirSync("src/bulletins")
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, 10));
}

function chicagoWeekday(instant) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long"
  }).format(new Date(instant));
}

test("a build at 2026-10-27T01:30:00Z treats today as October 26, 2026", () => {
  assert.equal(chicagoDate(LATE), "2026-10-26");
  assert.equal(LATE.toISOString().slice(0, 10), "2026-10-27");
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(LATE);
  assert.equal(label, "October 26, 2026");
  assert.equal(deadlineStillOpen("2026-10-26", LATE), true);
  assert.equal(deadlineStillOpen("2026-10-25", LATE), false);
  const midnight = new Date("2026-10-27T05:00:00Z");
  assert.equal(chicagoDate(midnight), "2026-10-27");
  assert.equal(deadlineStillOpen("2026-10-26", midnight), false);
});

test("a weather snapshot fetched at that instant still belongs to October 26", () => {
  const glance = {
    date: "2026-10-26",
    fetchedAt: LATE.toISOString(),
    weather: {
      source: "https://www.weather.gov/ewx/",
      alerts: ["Wind Advisory"]
    }
  };
  assert.deepEqual(forecastAlerts(glance, chicagoDate(LATE)), ["Wind Advisory"]);
  assert.deepEqual(forecastAlerts(glance, LATE.toISOString().slice(0, 10)), []);
});

test("edition file dates stay on their calendar day at UTC midnight", () => {
  const edition = "2026-10-26T00:00:00.000Z";
  assert.equal(isoDate(edition), "2026-10-26");
  assert.equal(longDate(edition), "October 26, 2026");
  assert.equal(weekdayName(edition), "Monday");
  assert.equal(shortMonthDay(edition), "Oct. 26");
  assert.equal(monthDay(edition), "October 26");
  assert.equal(readableDate(edition), "Monday, October 26, 2026");
  assert.equal(isoDate(LATE), "2026-10-27");
  assert.equal(longDate(LATE), "October 27, 2026");
  assert.notEqual(weekdayName(edition), chicagoWeekday(edition));
});

test("clock-derived calendar days are not taken from UTC", () => {
  const files = [...listFiles("src"), ...listFiles("scripts"), "eleventy.config.js"];
  const hits = files.filter((file) => {
    const text = readFileSync(file, "utf8");
    return takesUtcCalendarDay(text) || localeWithoutChicago(text);
  });
  assert.deepEqual(hits, []);
});

test("the build and the gather scripts take today from the Chicago helper", () => {
  const config = readFileSync("eleventy.config.js", "utf8");
  assert.match(config, /today:\s*chicagoDate\(\)/);
  for (const file of [
    "scripts/today.mjs", "scripts/video.mjs", "scripts/card.mjs",
    "scripts/voices.mjs", "scripts/alert.mjs", "scripts/check.mjs",
    "scripts/civic.mjs", "scripts/frontpage.mjs"
  ]) assert.match(readFileSync(file, "utf8"), /chicagoDate/, file);
});

test("the visit-day script uses Chicago and the footer has no build date", () => {
  const layout = readFileSync("src/_includes/layout.njk", "utf8");
  assert.match(layout, /var tz = "America\/Chicago"/);
  assert.doesNotMatch(layout, /toISOString/);
  const footer = layout.match(/<footer[\s\S]*?<\/footer>/)[0];
  assert.doesNotMatch(footer, /Site built|new Date|<time/);
});

test("homepage and edition dates follow the file name, not Chicago-shifted midnight", () => {
  const home = readFileSync("_site/index.html", "utf8");
  const edition = home.match(/data-edition="(\d{4}-\d{2}-\d{2})"/)[1];
  const instant = `${edition}T00:00:00.000Z`;
  const dateline = home.match(/class="masthead-dateline">([^<]+)/)[1];
  const fileWeekday = weekdayName(instant);
  assert.notEqual(fileWeekday, chicagoWeekday(instant));
  assert.ok(dateline.startsWith(`${fileWeekday}, ${shortMonthDay(instant)}`));
  const pagePath = `_site/${edition.replaceAll("-", "/")}/index.html`;
  const page = readFileSync(pagePath, "utf8");
  assert.match(page, new RegExp(`datetime="${edition}"`));
  assert.match(page, new RegExp(longDate(instant)));
});

test("the archive dates the first edition from its file name", () => {
  const archive = readFileSync("_site/archive/index.html", "utf8");
  const oldest = bulletinDays().sort()[0];
  const label = readableDate(`${oldest}T00:00:00.000Z`);
  assert.match(archive, new RegExp(`since ${label}`));
});

test("feed timestamps are edition midnights, not the build clock", () => {
  const feed = readFileSync("_site/feed.xml", "utf8");
  const days = new Set(bulletinDays());
  const stamps = [...feed.matchAll(/<updated>([^<]+)<\/updated>/g)].map((match) => match[1]);
  assert.ok(stamps.length > 1);
  for (const stamp of stamps) {
    assert.match(stamp, /^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
    assert.ok(days.has(stamp.slice(0, 10)), stamp);
  }
});

test("deadlines, this week, and the countdown are the edition's own words", () => {
  const home = readFileSync("_site/index.html", "utf8");
  const edition = home.match(/data-edition="(\d{4}-\d{2}-\d{2})"/)[1];
  const md = readFileSync(`src/bulletins/${edition}.md`, "utf8");
  const markers = [...md.matchAll(/<!--\s*desk:(?:closes|week)\s+(.+?)\s*-->/g)];
  assert.ok(markers.length > 0);
  for (const marker of markers) assert.ok(home.includes(marker[1].trim()), marker[1]);
  const countdown = md.match(/<p class="countdown">([\s\S]*?)<\/p>/);
  const page = readFileSync(`_site/${edition.replaceAll("-", "/")}/index.html`, "utf8");
  assert.ok(countdown);
  assert.ok(page.includes(countdown[1].trim()));
});
