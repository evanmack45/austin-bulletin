import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { percentile, monthLabels, LABELS, defaultWindow } from "../scripts/data-311.mjs";

const data = JSON.parse(readFileSync("src/_data/feature311.json", "utf8"));
const page = readFileSync("src/austin-311-response-times/index.md", "utf8");

test("percentile interpolates like a median", () => {
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentile([5], 0.9), 5);
  assert.equal(percentile([], 0.5), null);
});

test("the default window is the last 12 complete months", () => {
  assert.deepEqual(defaultWindow("2026-11-24"), ["2025-11-01", "2026-10-31"]);
  assert.deepEqual(defaultWindow("2026-01-05"), ["2025-01-01", "2025-12-31"]);
});

test("month labels read as words", () => {
  assert.deepEqual(monthLabels("2026-05"), { label: "May 2026", short: "May 26" });
});

test("every type the page names by key exists in the data", () => {
  for (const [, key] of page.matchAll(/k\.([a-zA-Z]+)\./g)) assert.ok(data.byKey[key], key);
  for (const t of data.types) assert.ok(LABELS[t.type], `label for ${t.type}`);
});

test("the district sentence matches each district's top request", () => {
  const leaders = {};
  for (const d of data.districts) (leaders[d.top[0].label] ??= []).push(d.district);
  const list = "([\\d ,and]+)";
  const sentence = page.match(new RegExp(`Parking-violation reports lead in Districts ${list}\\. ` +
    `Code-officer requests lead in Districts ${list}\\. Trash leads in Districts ${list}\\.`));
  assert.ok(sentence, "district sentence present");
  const split = (s) => s.split(/,\s*|\s+and\s+/).filter(Boolean).sort();
  assert.deepEqual(split(sentence[1]), [...leaders["Parking violation"]].sort());
  assert.deepEqual(split(sentence[2]), [...leaders["Code officer visit"]].sort());
  assert.deepEqual(split(sentence[3]), [...leaders["Trash"]].sort());
});

test("the built page has no missing numbers", () => {
  const html = readFileSync("_site/austin-311-response-times/index.html", "utf8");
  assert.doesNotMatch(html, /NaN|undefined|null days/);
  assert.match(html, new RegExp(data.total.toLocaleString("en-US")));
});
