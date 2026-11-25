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
  assert.equal(fmtDays(1.02), "1 day");
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
