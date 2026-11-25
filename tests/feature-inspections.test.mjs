import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BANDS, chartSpec, proseFor, queryUrl } from "../scripts/data-inspections.mjs";

const data = JSON.parse(readFileSync("src/_data/featureInspections.json", "utf8"));
const page = readFileSync("src/austin-restaurant-inspection-scores/index.md", "utf8");

test("score bands cover 0 to 100 with no gaps or overlaps", () => {
  assert.equal(BANDS[0].lo, 0);
  assert.equal(BANDS.at(-1).hi, 100);
  for (let i = 1; i < BANDS.length; i++) assert.equal(BANDS[i].lo, BANDS[i - 1].hi + 1);
});

test("band counts add up to the routine total", () => {
  assert.equal(data.bands.reduce((sum, b) => sum + b.n, 0), data.routine);
  assert.equal(data.bands[0].n, data.redN);
  assert.equal(data.greenN + data.yellowN + data.redN, data.routine);
  assert.equal(data.bands.filter((b) => b.lo >= 90).reduce((sum, b) => sum + b.n, 0), data.greenN);
});

test("every figure on the page links to a City query", () => {
  assert.match(queryUrl({ select: "count(*)", where: "score=0", format: "json" }),
    /^https:\/\/data\.austintexas\.gov\/resource\/ecmv-9xxi\.json\?/);
  for (const b of data.bands) assert.match(b.query, /ecmv-9xxi/);
  for (const z of data.zips) {
    assert.match(z.query, /ecmv-9xxi/);
    assert.ok(z.n >= data.minZip, `${z.zip} has at least ${data.minZip}`);
  }
});

test("the generated text and chart agree with the data", () => {
  const prose = proseFor(data);
  assert.equal(data.description, prose.description);
  assert.equal(data.chartAlt, prose.chartAlt);
  assert.match(data.description, new RegExp(data.routine.toLocaleString("en-US")));
  const spec = chartSpec(data);
  assert.equal(spec.bars.length, BANDS.length);
  assert.equal(spec.bars.filter((b) => b.hi).length, 1);
  const committed = JSON.parse(readFileSync("data/inspections-chart.json", "utf8"));
  assert.deepEqual(committed, spec, "run node scripts/data-inspections.mjs to rebuild");
});

test("claims written into the page prose still hold for this window", () => {
  assert.ok(data.yellowPct >= 20 && data.yellowPct <= 45, "Yellow is common");
  assert.ok(data.greenPct >= 50, "90 or more is the usual result");
  assert.ok(data.redN > 0 && data.redN / data.routine < 0.02, "under 70 is rare");
  assert.ok(data.next.withNext > 0 && data.next.withNext <= data.next.failing);
  assert.ok(data.spread.hi - data.spread.lo <= 10, "ZIP medians differ by only a few points");
  assert.ok(!/restaurant_name|address/.test(JSON.stringify(data)), "no business is named");
  assert.ok(page.includes("No business is named"));
});

test("the built page has no missing numbers", () => {
  const html = readFileSync("_site/austin-restaurant-inspection-scores/index.html", "utf8");
  assert.doesNotMatch(html, /NaN|undefined/);
  assert.match(html, new RegExp(data.routine.toLocaleString("en-US")));
});
