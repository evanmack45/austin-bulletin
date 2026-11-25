import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { districtMedians } from "../scripts/data-311-visual.mjs";
import { activeStep } from "../src/js/story-311.js";

const base = JSON.parse(readFileSync("src/_data/feature311.json", "utf8"));
const visual = JSON.parse(readFileSync("src/_data/feature311visual.json", "utf8"));
const shapes = JSON.parse(readFileSync("src/_data/councilDistrictShapes.json", "utf8"));

test("district medians leave out duplicates, open requests and rows with no district", () => {
  const row = (district, status, created, closed, type = "TPW - Pothole Repair") => ({
    sr_location_council_district: district, sr_status_desc: status, sr_type_desc: type,
    sr_created_date: created, sr_closed_date: closed
  });
  const out = districtMedians([
    row("1", "Closed", "2026-01-01T00:00:00", "2026-01-02T00:00:00"),
    row("1", "Closed", "2026-01-01T00:00:00", "2026-01-04T00:00:00"),
    row("1", "Duplicate (closed)", "2026-01-01T00:00:00", "2026-01-30T00:00:00"),
    row("1", "Open", "2026-01-01T00:00:00", ""),
    row("", "Closed", "2026-01-01T00:00:00", "2026-01-20T00:00:00")
  ]);
  assert.equal(out.pothole[0].closed, 2);
  assert.equal(out.pothole[0].medianDays, 2);
  assert.equal(out.all[0].medianDays, 2);
  assert.equal(out.vehicle[0].closed, 0);
});

test("the visual's district data covers the same records as the text feature", () => {
  assert.equal(visual.from, base.from);
  assert.equal(visual.to, base.to);
  assert.equal(visual.total, base.total);
  for (const key of ["all", "vehicle", "code", "pothole"]) {
    assert.equal(visual.byDistrict[key].length, 10);
  }
  const ten = Array.from({ length: 10 }, (_, i) => String(i + 1));
  assert.deepEqual(shapes.districts.map((d) => d.district), ten);
});

test("the active step is the last one above the trigger line", () => {
  assert.equal(activeStep([500, 1500, 2500], 600), 0);
  assert.equal(activeStep([-900, 100, 900], 600), 1);
  assert.equal(activeStep([-2000, -1000, -10], 600), 2);
});

test("the built visual page has its numbers and links to the text version", () => {
  const html = readFileSync("_site/austin-311-visual/index.html", "utf8");
  assert.doesNotMatch(html, /NaN|undefined/);
  assert.match(html, new RegExp(base.total.toLocaleString("en-US")));
  assert.match(html, /href="\/austin-311-response-times\/"/);
  assert.match(html, /prefers-reduced-motion|story-311\.css/);
  const text = readFileSync("_site/austin-311-response-times/index.html", "utf8");
  assert.match(text, /href="\/austin-311-visual\/"/);
});
