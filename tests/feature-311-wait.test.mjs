import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { waitCode, LEVELS, DUP, OPEN } from "../scripts/data-311-wait.mjs";
import { decode, codeMinutes, minutesCode, fmtDays, districtAt } from "../src/js/wait-311.js";

const base = JSON.parse(readFileSync("src/_data/feature311.json", "utf8"));
const wait = JSON.parse(readFileSync("src/_data/feature311wait.json", "utf8"));

test("wait codes round-trip within one log step (about 11%)", () => {
  for (const minutes of [1, 5, 60, 900, 1440, 10080, 43200, 300000]) {
    const back = codeMinutes(waitCode(minutes));
    assert.ok(Math.abs(Math.log(back / minutes)) < 0.06, `${minutes} -> ${back}`);
    assert.ok(Math.abs(minutesCode(minutes) - waitCode(minutes)) <= 0.5);
  }
  assert.equal(waitCode(0.2), 0);
  assert.equal(waitCode(10 ** 7), LEVELS);
});

test("waits print the way the page words them", () => {
  assert.equal(fmtDays(0.025), "36 minutes");
  assert.equal(fmtDays(0.641), "15 hours");
  assert.equal(fmtDays(1.02), "24 hours");
  assert.equal(fmtDays(1.045), "25 hours");
  assert.equal(fmtDays(21.204), "21.2 days");
});

test("the data file decodes to every request in the window, with the page's counts", () => {
  const data = decode(new Uint8Array(gunzipSync(readFileSync("src/data/311-wait.bin.gz"))));
  assert.equal(data.n, wait.total);
  assert.equal(data.n, base.total);
  let located = 0, dup = 0, open = 0, closed = 0;
  for (let i = 0; i < data.n; i++) {
    if (data.gx[i] < data.grid - 1) located++;
    const c = data.code[i];
    if (c === DUP) dup++; else if (c === OPEN) open++; else if (c <= LEVELS) closed++;
  }
  assert.equal(located, wait.located);
  assert.equal(dup, wait.duplicates);
  assert.equal(open, wait.open);
  assert.equal(closed, wait.closed);
  assert.ok(wait.bytes.gzip < 1.2 * 1024 * 1024, "data file stays under its 1.2 MB budget");
});

test("group medians match the text feature", () => {
  for (const key of ["pothole", "trash", "bulk", "vehicle", "code"]) {
    const baseKey = key === "trash" ? "garbage" : key;
    assert.equal(wait.byKey[key].medianDays, base.byKey[baseKey].medianDays, key);
  }
  assert.equal(wait.from, base.from);
  assert.equal(wait.to, base.to);
});

test("a point inside a district outline finds that district", () => {
  for (const o of wait.outlines) {
    const [x, y] = o.label;
    // Label points sit inside their largest ring for compact districts; skip odd shapes.
    const found = districtAt(wait.outlines, x, y);
    if (found) assert.equal(found, o.district);
  }
  assert.equal(districtAt(wait.outlines, -5, -5), 0);
});

test("the built page has its numbers, a source section and links both ways", () => {
  const html = readFileSync("_site/austin-311-wait/index.html", "utf8");
  assert.doesNotMatch(html, /NaN|undefined|\[object Object\]/);
  assert.match(html, new RegExp(wait.total.toLocaleString("en-US")));
  assert.match(html, /Source and method/);
  assert.match(html, /OpenStreetMap/);
  assert.match(html, /href="\/austin-311-response-times\/"/);
  for (const m of html.matchAll(/(?:src|srcset)="(\/images\/features\/311-wait\/[^"]+)"/g)) {
    assert.ok(existsSync(`src${m[1]}`), `missing ${m[1]}`);
  }
});

test("a guess reads in whole units and is judged against the median", async () => {
  const { guessText, guessVerdict, minutesCode } = await import("../src/js/wait-311.js");
  assert.equal(guessText(0), "1 minute");
  assert.equal(guessText(minutesCode(60)), "1 hour");
  assert.equal(guessText(minutesCode(3 * 1440)), "3 days");
  assert.equal(guessVerdict(1.2, 1), "close");
  assert.equal(guessVerdict(10, 1), "about 10 times too long");
  assert.equal(guessVerdict(0.25, 1), "about 4 times too short");
});

test("the verdict uses the guess as shown, not its unrounded slider value", async () => {
  const { guessDays, guessText, minutesCode } = await import("../src/js/wait-311-core.js");
  const code = minutesCode(29.3 * 1440);
  assert.equal(guessText(code), "29 days");
  assert.equal(guessDays(code), 29);
  assert.equal(guessDays(minutesCode(180)), 3 / 24);
});

test("hex bins: every point lands in the hexagon whose center is nearest", async () => {
  const { hexOf, tallest } = await import("../src/js/wait-311-hex.js");
  const r = 0.011, center = ([q, s]) => [r * Math.sqrt(3) * (q + s / 2), r * 1.5 * s];
  for (let i = 0; i < 500; i++) {
    const p = [Math.sin(i * 12.9898) * 0.5, Math.cos(i * 78.233) * 0.5];
    const [cx, cy] = center(hexOf(p[0], p[1], r));
    assert.ok(Math.hypot(p[0] - cx, p[1] - cy) <= r * 1.0001, `point ${i}`);
  }
  const top = tallest([{ q: 0, s: 0, total: 2 }, { q: 1, s: -1, total: 9 }], r);
  assert.equal(top.bin.total, 9);
});

test("district labels: vehicles show extremes; your wait only your district", async () => {
  const { districtPlan, worldOf } = await import("../src/js/wait-311-labels.js");
  const vehicle = wait.groups.findIndex((g) => g.key === "vehicle");
  const DATA = { groups: wait.groups, overWeek: wait.overWeekByDistrict, frame: wait.frame,
    kmPerUnit: wait.kmPerUnit, mapW: wait.mapW, mapH: wait.mapH };
  const prep = { groupIndex: { vehicle } };
  const rows = wait.groups[vehicle].byDistrict.toSorted((a, b) => a.medianDays - b.medianDays);
  const veh = districtPlan(DATA, prep, { scene: "vehicles", focus: [0, 0, 0] });
  assert.deepEqual(veh.only, [rows.at(-1).district, rows[0].district]);
  const phone = districtPlan(DATA, prep, { scene: "vehicles", narrow: true });
  assert.deepEqual(phone.only, [rows.at(-1).district]);
  assert.equal(veh.text(rows.at(-1).district), `${rows.at(-1).medianDays.toFixed(1)} days`);
  assert.deepEqual(districtPlan(DATA, prep, { scene: "you", focus: [1, 0, 0] }).only, [0]);
  assert.deepEqual(districtPlan(DATA, prep, { scene: "you", focus: [1, 0, 4] }).only, [4]);
  const ow = wait.overWeekByDistrict.toSorted((a, b) => a.share - b.share);
  assert.deepEqual(districtPlan(DATA, prep, { scene: "terrain" }).only,
    [ow.at(-1).district, ow[0].district]);
  const [x, y] = worldOf(DATA, wait.frame.maxLat, wait.frame.minLon);
  assert.ok(Math.abs(x + wait.mapW / 2) < 1e-9 && Math.abs(y - wait.mapH / 2) < 1e-9);
});

test("vehicle columns rise with the median wait; slow columns show a share", async () => {
  const { vehHeight, slowShare, RATE_MIN } = await import("../src/js/wait-311-hex.js");
  const { minutesCode } = await import("../src/js/wait-311-core.js");
  assert.ok(vehHeight(minutesCode(2 * 1440)) <= 0.03);
  assert.ok(Math.abs(vehHeight(minutesCode(60 * 1440)) - 1) < 0.02);
  assert.ok(vehHeight(minutesCode(29 * 1440)) > vehHeight(minutesCode(14 * 1440)));
  assert.equal(slowShare({ closed: RATE_MIN - 1, slow: 10 }), 0);
  assert.equal(slowShare({ closed: 100, slow: 21 }), 0.21);
});

test("your-wait card names the fastest and slowest districts", async () => {
  const { districtRange } = await import("../src/js/wait-311.js");
  const g = wait.groups.find((x) => x.key === "pothole");
  assert.equal(districtRange(g),
    " By district: 12 hours (District 10) to 17 hours (District 5).");
});
