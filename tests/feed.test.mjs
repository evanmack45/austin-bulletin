import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { elements, one, parseXml } from "./feed-xml.mjs";

const built = existsSync("_site/feed.xml");
const skip = !built && "run npm run build before integration checks";
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ORIGIN = "https://theaustinbulletin.com";

function bulletinDays() {
  return readdirSync("src/bulletins")
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .map((name) => name.slice(0, 10))
    .sort()
    .reverse();
}

function zoned(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type).value;
  const hour = value("hour") === "24" ? "00" : value("hour");
  return {
    day: `${value("year")}-${value("month")}-${value("day")}`,
    midnight: hour === "00" && value("minute") === "00" && value("second") === "00"
  };
}

function editionMidnight(stamp, day) {
  assert.match(stamp, STAMP, stamp);
  const date = new Date(stamp);
  assert.equal(Number.isNaN(date.getTime()), false, stamp);
  const utc = zoned(date, "UTC");
  const chicago = zoned(date, "America/Chicago");
  const utcMidnight = utc.day === day && utc.midnight;
  const chicagoMidnight = chicago.day === day && chicago.midnight;
  assert.equal(utcMidnight || chicagoMidnight, true, stamp);
}

function siteUrl(url, label) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, ORIGIN, label);
  assert.equal(/\s/.test(url), false, label);
}

function markupUrls(html) {
  return [...html.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
    .map((match) => match[1] ?? match[2]);
}

function absoluteUrl(url, label) {
  assert.match(url, /^(?:https?:\/\/|mailto:)/, `${label} ${url}`);
  assert.equal(/\s/.test(url), false, label);
}

function checkEntry(entry, day) {
  const id = one(entry, "id").text;
  const link = elements(entry, "link")[0];
  assert.ok(link, day);
  siteUrl(id, "entry id");
  siteUrl(link.attrs.href, "entry link");
  assert.equal(id, `${ORIGIN}/${day.replaceAll("-", "/")}/`);
  assert.equal(link.attrs.href, id);
  editionMidnight(one(entry, "updated").text, day);
  assert.ok(one(entry, "title").text.length > 0, day);
  const content = one(entry, "content");
  assert.equal(content.attrs.type, "html");
  assert.ok(content.text.includes("id=\"the-briefing\"") || content.text.length > 40, day);
  for (const url of markupUrls(content.text)) absoluteUrl(url, id);
}

test("a minimal atom document parses and a broken one does not", () => {
  const root = parseXml(`<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>A &amp; B</title>
      <link href="https://theaustinbulletin.com/feed.xml" rel="self" />
      <updated>2026-10-27T00:00:00Z</updated>
    </feed>`);
  assert.equal(one(root, "title").text, "A & B");
  assert.equal(elements(root, "link")[0].attrs.rel, "self");
  assert.throws(() => parseXml("<feed><title>A & B</title></feed>"));
  assert.throws(() => parseXml(""));
});

test("built atom feed is current, absolute, and non-empty", { skip }, () => {
  const xml = readFileSync("_site/feed.xml", "utf8");
  assert.ok(xml.trim().length > 0);
  const root = parseXml(xml);
  const days = bulletinDays();
  assert.equal(root.name, "feed");
  assert.equal(root.attrs.xmlns, "http://www.w3.org/2005/Atom");
  assert.equal(one(root, "title").text, "The Austin Bulletin");
  assert.equal(one(root, "id").text, `${ORIGIN}/`);
  siteUrl(one(root, "id").text, "feed id");
  const self = elements(root, "link").find((link) => link.attrs.rel === "self");
  assert.equal(self?.attrs.href, `${ORIGIN}/feed.xml`);
  assert.equal(one(one(root, "author"), "name").text, "The Austin Bulletin");
  const entries = elements(root, "entry");
  assert.equal(entries.length, Math.min(10, days.length));
  assert.ok(entries.length > 0);
  editionMidnight(one(root, "updated").text, days[0]);
  assert.equal(one(root, "updated").text, one(entries[0], "updated").text);
  entries.forEach((entry, index) => checkEntry(entry, days[index]));
});

test("rss.xml is the same atom document as feed.xml", { skip }, () => {
  const feed = readFileSync("_site/feed.xml", "utf8");
  const rss = readFileSync("_site/rss.xml", "utf8");
  assert.equal(rss, feed);
  assert.equal(one(parseXml(rss), "id").text, `${ORIGIN}/`);
});
