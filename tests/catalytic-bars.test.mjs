import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHART_ALT, CHART_SOURCE, THEFT_COUNTS, barShare, shareSvg
} from "../src/_data/catalytic-bars.mjs";

test("January–October theft counts match the city pull", () => {
  const csv = readFileSync("src/_data/charts/catalytic-converter-jan-oct.csv", "utf8").trim();
  const rows = csv.split("\n").slice(1).map((line) => {
    const [year, count] = line.split(",");
    return { year, count: Number(count) };
  });
  assert.deepEqual(
    THEFT_COUNTS.map((bar) => ({ year: bar.year, count: bar.count })),
    rows
  );
  assert.deepEqual(
    THEFT_COUNTS.map((bar) => bar.count),
    [220, 1522, 1763, 438, 29, 32, 297]
  );
});

test("the share image shows 297 above the bars, not on the fill", () => {
  const svg = shareSvg();
  for (const bar of THEFT_COUNTS) {
    assert.match(svg, new RegExp(`>${bar.text}<`));
    assert.match(svg, new RegExp(`>${bar.year}<`));
  }
  assert.match(svg, /fill="#0F2A47"/);
  assert.match(svg, /fill="#FFC233"/);
  assert.equal(svg.includes("arrest"), false);
  const value = svg.match(/<text[^>]*>297<\/text>/g) ?? [];
  assert.ok(value.length >= 2, svg);
  for (const node of value) {
    assert.match(node, /fill="#FFC233"/);
    assert.doesNotMatch(node, /<rect/);
  }
});

test("edition bars use the same shares as the city counts", () => {
  const cards = JSON.parse(readFileSync("src/_data/editionCardData.json", "utf8"));
  const lead = cards["2026-11-14"].cards.find((card) => card.lead);
  assert.equal(lead.bignum, "297");
  assert.equal(lead.chartAlt, CHART_ALT);
  assert.equal(lead.chartSource, CHART_SOURCE);
  assert.deepEqual(
    lead.bars.map((bar) => ({ label: bar.label, value: bar.value, p: bar.p, hi: Boolean(bar.hi) })),
    THEFT_COUNTS.map((bar) => ({
      label: bar.year,
      value: bar.text,
      p: barShare(bar.count),
      hi: bar.hi
    }))
  );
});
