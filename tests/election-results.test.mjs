import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync("src/_data/election2026.json", "utf8"));
const page = readFileSync("src/_includes/election-results.njk", "utf8");
const home = readFileSync("src/index.njk", "utf8");
const edition = readFileSync("src/_includes/bulletin.njk", "utf8");

test("election data lists confirmed measures with blank official results", () => {
  assert.equal(data.date, "2026-11-03");
  assert.equal(data.resultsListed, false);
  assert.equal(data.measures.length, 11);
  const titles = data.measures.map((measure) => measure.ballotTitle);
  assert.deepEqual(titles.slice(0, 10), [
    "City of Austin Proposition A",
    "City of Austin Proposition B",
    "City of Austin Proposition C",
    "City of Austin Proposition D",
    "City of Austin Proposition E",
    "City of Austin Proposition F",
    "City of Austin Proposition G",
    "City of Austin Proposition H",
    "City of Austin Proposition I",
    "City of Austin Proposition J"
  ]);
  assert.equal(titles[10], "Austin Community College District Proposition A");
  for (const measure of data.measures) {
    assert.equal(measure.result.status, "Results not yet posted");
    assert.equal(measure.result.yes, null);
    assert.equal(measure.result.no, null);
    assert.equal(measure.result.outcome, null);
    assert.match(measure.result.asOf, /^\d{4}-\d{2}-\d{2}T/);
    assert.match(measure.result.source, /^https:\/\//);
    assert.match(measure.source, /^https:\/\/votetravis\.gov\//);
    assert.ok(measure.summary.length > 20);
    assert.doesNotMatch(measure.summary, /\b(should|vote yes|vote no|support|oppose)\b/i);
  }
});

test("the results template and the home and edition links stay wired to the data file", () => {
  assert.match(page, /election2026\.measures/);
  assert.match(page, /measure\.result\.status/);
  assert.match(page, /7 a\.m\. to 7 p\.m\./);
  assert.match(page, /any polling site in the county/);
  assert.match(home, /href="\/election\/2026-11-03\/"/);
  assert.match(edition, /editionIso == "2026-11-03"/);
  assert.match(edition, /href="\/election\/2026-11-03\/"/);
});
