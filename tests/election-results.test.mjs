import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { centralTime } from "../src/_includes/chicago-date.js";

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
  assert.match(page, /Not posted yet/);
  assert.match(page, /centralTime/);
  assert.match(page, /measure\.summary/);
  assert.match(page, /measure\.source/);
  assert.doesNotMatch(page, /measure\.result\.status/);
  assert.doesNotMatch(page, /measure\.result\.asOfDisplay/);
  assert.match(page, /7 a\.m\. to 7 p\.m\./);
  assert.match(page, /any polling site in the county/);
  assert.match(home, /href="\/election\/\{\{ election2026\.date \}\}\/"/);
  assert.match(edition, /editionIso == election2026\.date/);
  assert.match(edition, /Results page/);
});

test("the checked time is the data file timestamp in Central time", () => {
  assert.equal(centralTime(data.checkedAt), "9:48 a.m.");
  assert.equal(centralTime("not-a-time"), "");
});

test("the built results page states the status once", () => {
  const html = readFileSync("_site/election/2026-11-03/index.html", "utf8");
  assert.equal((html.match(/Results not posted yet/g) || []).length, 1);
  assert.equal((html.match(/Last checked:/g) || []).length, 1);
  assert.equal((html.match(/9:48 a\.m\./g) || []).length, 1);
  assert.equal((html.match(/Not posted yet/g) || []).length, data.measures.length);
  assert.doesNotMatch(html, /Results not yet posted/);
  assert.doesNotMatch(html, /vote yes|vote no|should vote/i);
  const visible = html.replaceAll("&#39;", "'").replaceAll("&quot;", "\"").replaceAll("&amp;", "&");
  for (const measure of data.measures) {
    assert.ok(visible.includes(measure.ballotTitle), measure.ballotTitle);
    assert.ok(visible.includes(measure.summary), measure.id);
    assert.ok(visible.includes(measure.source), measure.source);
  }
});
