import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERMIT_COUNTS, shareSvg } from "../src/_data/permit-bars.mjs";

test("January–October permit counts match the city pull", () => {
  const csv = readFileSync("src/_data/charts/house-permits-jan-oct.csv", "utf8").trim();
  const rows = csv.split("\n").slice(1).map((line) => {
    const [year, count] = line.split(",");
    return { year, count: Number(count) };
  });
  assert.deepEqual(
    PERMIT_COUNTS.map((bar) => ({ year: bar.year, count: bar.count })),
    rows
  );
  assert.deepEqual(PERMIT_COUNTS.map((bar) => bar.count), [1348, 1498, 1743, 1845]);
});

test("the share image shows 1,845 above the bars, not on the fill", () => {
  const svg = shareSvg();
  assert.match(svg, /1,845/);
  assert.match(svg, /1,348/);
  assert.match(svg, /1,498/);
  assert.match(svg, /1,743/);
  assert.match(svg, /fill="#0F2A47"/);
  assert.match(svg, /fill="#FFC233"/);
  assert.equal(svg.includes("housing_units"), false);
  assert.equal(svg.includes("homes built"), false);
  const value = svg.match(/<text[^>]*>1,845<\/text>/)?.[0] ?? "";
  assert.match(value, /fill="#FFC233"/);
  assert.doesNotMatch(value, /<rect/);
});
