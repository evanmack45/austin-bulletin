import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const guide = await readFile(
  new URL("../src/zilker-park-access/index.md", import.meta.url), "utf8");
const home = await readFile(new URL("../src/index.njk", import.meta.url), "utf8");

test("access guide is a discoverable static page with an honest source timestamp", () => {
  assert.match(guide, /permalink: "\/zilker-park-access\/"/);
  assert.match(guide, /Last checked:/);
  assert.match(guide, /America\/Chicago|CDT/);
  assert.match(home, /href="\/zilker-park-access\/"/);
});

test("open amenities preserve the festival entrance and closed parking distinction", () => {
  const amenities = ["Barton Springs Pool", "Butler Hike-and-Bike Trail",
    "Barton Creek Greenbelt", "disc golf", "playscape"];
  for (const amenity of amenities) {
    assert.ok(guide.includes(amenity), amenity);
  }
  assert.match(guide, /Azie Morton/);
  assert.match(guide, /festival weekends/);
  assert.match(guide, /parking lots/);
  assert.match(guide, /parking[^\n]*(?:closed|closure)/i);
});

test("Great Lawn guidance separates posted closure from confirmed public reopening", () => {
  const lawn = guide.split("### When can you return to the Great Lawn?")[1]
    ?.split("### Getting there:")[0];
  assert.ok(lawn);
  assert.match(lawn, /scheduled closure/);
  assert.match(lawn, /not a guarantee/);
  if (lawn.includes("do not confirm a Great Lawn reopening date")) {
    assert.doesNotMatch(lawn, /Great Lawn (?:reopens|will reopen) (?:on )?October/);
  } else {
    // A future sourced reopening announcement must be able to replace uncertainty.
    assert.match(lawn, /confirmed[\s\S]*reopening|reopening[\s\S]*confirmed/i);
    assert.match(lawn, /https:\/\/www\.austintexas\.gov\//);
  }
});

test("current sources and disagreements are visible without an invented Stratford time", () => {
  assert.match(guide, /austintexas\.gov\/parks\/parks-and-recreation-facilities-closures/);
  assert.match(guide, /ACL26-Neighborhood-Letter\.pdf/);
  // Conflicting dates may become reconciled during future daily review.
  if (guide.includes("sources disagree")) {
    assert.match(guide, /does not give one/);
  }
  assert.match(guide, /Stratford/);

  assert.doesNotMatch(guide, /fall-maintenance|AccessMap2024/);
});

test("facility dates and restoration attribution do not promise lawn access", () => {
  assert.match(guide, /Nature.*Science Center/);
  assert.match(guide, /Botanical Garden/);
  assert.match(guide, /main building may remain closed/);
  assert.match(guide, /Parks and Recreation spokesperson told KXAN/);
  assert.match(guide, /damaged sod/);
  assert.doesNotMatch(guide, /we (?:inspected|reviewed) (?:the )?contract/i);
});
