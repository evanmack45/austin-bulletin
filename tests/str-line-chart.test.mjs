import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lineChartHtml, shareSvg } from "../src/_data/str-line-chart.mjs";

const csv = readFileSync("src/_data/charts/str-daily-total.csv", "utf8");

test("the license line ends at 3,663 and marks Sept. 30", () => {
  const html = lineChartHtml(csv);
  assert.match(html, />3,663</);
  assert.match(html, />3,015</);
  assert.match(html, /Sept\. 30/);
  assert.match(html, />Nov\. 10</);
  assert.match(html, /Sept\. 1, 2025/);
  assert.match(html, /Nov\. 10, 2026/);
  assert.equal(html.includes("…"), false);
  assert.equal(html.includes("..."), false);
  assert.equal(html.includes("listings"), false);
  assert.equal(html.includes("peak"), false);
  assert.equal(/letter-spacing:\s*-0\.0[5-9]/.test(html), false);
  assert.match(html, /stroke="#FFC233"/);
  assert.match(html, /class="end-dot"/);
  assert.match(html, /class="mark-dot"/);
});

test("the share image names the lead number and both dates", () => {
  const svg = shareSvg(csv);
  assert.match(svg, /3,663/);
  assert.match(svg, /3,015/);
  assert.match(svg, /Sept\. 30/);
  assert.match(svg, /Licensed short-term rentals/);
  assert.match(svg, /fill="#0F2A47"/);
  assert.equal(svg.includes("…"), false);
});
