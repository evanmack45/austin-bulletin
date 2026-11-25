import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { percentile, monthLabels, LABELS, defaultWindow, proseFor } from "../scripts/data-311.mjs";
import { chartSpec } from "../scripts/refresh-311.mjs";

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

test("the district sentence is built from each district's top request", () => {
  const leaders = {};
  for (const d of data.districts) (leaders[d.top[0].label.toLowerCase()] ??= []).push(d.district);
  assert.equal(data.districtSentence, proseFor(data).districtSentence);
  for (const [label, districts] of Object.entries(leaders)) {
    assert.match(data.districtSentence, new RegExp(`${label} in Districts? ${districts[0]}`));
  }
  assert.ok(page.includes("{{ d.districtSentence }}"), "page uses the generated sentence");
});

test("claims written into the page prose still hold for this window", () => {
  const k = data.byKey;
  assert.ok(k.brush.medianDays >= 6.5, "brush takes about a week or longer");
  assert.ok(k.bulk.medianDays >= 6.5, "bulk items take about a week or longer");
  const byP90 = [...data.types].sort((a, b) => b.p90Days - a.p90Days)
    .slice(0, 2).map((t) => t.key).sort();
  assert.deepEqual(byP90, ["code", "vehicle"], "vehicle and code have the longest 9-in-10 times");
  assert.ok(data.duplicates >= 1000, "thousands of reports are duplicates");
});

test("the generated page text and the chart spec agree with the data", () => {
  assert.match(data.description, new RegExp(data.total.toLocaleString("en-US")));
  assert.match(data.chartAlt, /pothole/);
  const spec = chartSpec(data);
  assert.equal(spec.bars.length, 8);
  assert.equal(spec.bars.filter((b) => b.hi).length, 1);
  const ns = spec.bars.map((b) => b.n);
  assert.deepEqual(ns, [...ns].sort((x, y) => x - y));
  const committed = JSON.parse(readFileSync("data/311-chart.json", "utf8"));
  assert.deepEqual(committed, spec, "run node scripts/refresh-311.mjs --force to rebuild");
});

test("the built page has no missing numbers", () => {
  const html = readFileSync("_site/austin-311-response-times/index.html", "utf8");
  assert.doesNotMatch(html, /NaN|undefined|null days/);
  assert.match(html, new RegExp(data.total.toLocaleString("en-US")));
});
