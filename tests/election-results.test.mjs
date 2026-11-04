import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { centralTime } from "../src/_includes/chicago-date.js";

const data = JSON.parse(readFileSync("src/_data/election2026.json", "utf8"));
const page = readFileSync("src/_includes/election-results.njk", "utf8");
const home = readFileSync("src/index.njk", "utf8");
const edition = readFileSync("src/_includes/bulletin.njk", "utf8");

const AS_OF = "2026-11-04T03:46:01Z";
const AS_OF_DISPLAY = "9:46 p.m. Central on November 3, 2026";
const STATUS = "Unofficial Travis County count, not final";
const SOURCE = "https://results.enr.clarityelections.com/TX/Travis/";

// Full Purpose For/Against, then Limited Purpose where the clerk posted a second contest.
// Limited Purpose is not added into yes/no. The lead uses the Full Purpose contest only.
const COUNTS = {
  "austin-a": { yes: 175774, no: 102653, outcome: "For leads" },
  "austin-b": { yes: 173279, no: 103878, outcome: "For leads" },
  "austin-c": {
    yes: 178142, no: 76369, outcome: "For leads",
    limitedPurposeYes: 4658, limitedPurposeNo: 2051
  },
  "austin-d": {
    yes: 92995, no: 164079, outcome: "Against leads",
    limitedPurposeYes: 2769, limitedPurposeNo: 4031
  },
  "austin-e": {
    yes: 68474, no: 182333, outcome: "Against leads",
    limitedPurposeYes: 2053, limitedPurposeNo: 4544
  },
  "austin-f": {
    yes: 185187, no: 61299, outcome: "For leads",
    limitedPurposeYes: 4699, limitedPurposeNo: 1901
  },
  "austin-g": {
    yes: 153234, no: 90524, outcome: "For leads",
    limitedPurposeYes: 4396, limitedPurposeNo: 2158
  },
  "austin-h": {
    yes: 164533, no: 81267, outcome: "For leads",
    limitedPurposeYes: 4012, limitedPurposeNo: 2580
  },
  "austin-i": {
    yes: 106137, no: 153893, outcome: "Against leads",
    limitedPurposeYes: 3829, limitedPurposeNo: 3091
  },
  "austin-j": {
    yes: 180269, no: 68248, outcome: "For leads",
    limitedPurposeYes: 4860, limitedPurposeNo: 1747
  },
  "acc-a": { yes: 13373, no: 21981, outcome: "Against leads" }
};

function commas(n) {
  return Number(n).toLocaleString("en-US");
}

test("election data lists the unofficial Travis County count", () => {
  assert.equal(data.date, "2026-11-03");
  assert.equal(data.resultsListed, true);
  assert.equal(data.checkedAt, AS_OF);
  assert.equal(data.asOfDisplay, AS_OF_DISPLAY);
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
    const expected = COUNTS[measure.id];
    assert.ok(expected, measure.id);
    assert.equal(measure.result.status, STATUS);
    assert.equal(measure.result.yes, expected.yes);
    assert.equal(measure.result.no, expected.no);
    assert.equal(measure.result.outcome, expected.outcome);
    assert.equal(measure.result.asOf, AS_OF);
    assert.equal(measure.result.asOfDisplay, AS_OF_DISPLAY);
    assert.equal(measure.result.source, SOURCE);
    assert.equal(measure.result.sourceLabel, "Travis County Clerk election results");
    assert.notEqual(measure.result.yes, measure.result.no);
    const lead = measure.result.yes > measure.result.no ? "For leads" : "Against leads";
    assert.equal(measure.result.outcome, lead);
    if (expected.limitedPurposeYes == null) {
      assert.equal(measure.result.limitedPurposeYes, undefined);
      assert.equal(measure.result.limitedPurposeNo, undefined);
    } else {
      assert.equal(measure.result.limitedPurposeYes, expected.limitedPurposeYes);
      assert.equal(measure.result.limitedPurposeNo, expected.limitedPurposeNo);
      assert.notEqual(measure.result.yes, expected.yes + expected.limitedPurposeYes);
      assert.notEqual(measure.result.no, expected.no + expected.limitedPurposeNo);
    }
    const verdict = `${measure.result.status} ${measure.result.outcome}`;
    assert.doesNotMatch(verdict, /\b(passed|failed|approved|rejected)\b/i);
    assert.match(measure.source, /^https:\/\/votetravis\.gov\//);
    assert.ok(measure.summary.length > 20);
    assert.doesNotMatch(measure.summary, /\b(should|vote yes|vote no|support|oppose)\b/i);
  }
});

test("the results template and the home and edition links stay wired to the data file", () => {
  assert.match(page, /election2026\.measures/);
  assert.match(page, /Not posted yet/);
  assert.match(page, /centralTime/);
  assert.match(page, /commas/);
  assert.match(page, /Limited-purpose area: For/);
  assert.match(page, /Williamson and Hays counties/);
  assert.match(page, /whose votes are not included/);
  assert.match(page, /Counting may continue/);
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
  assert.equal(centralTime(data.checkedAt), "9:46 p.m.");
  assert.equal(centralTime("not-a-time"), "");
});

function times(visible, pattern) {
  return (visible.match(pattern) || []).length;
}

function assertLimitedSeparate(visible, measure) {
  if (measure.result.limitedPurposeYes == null) return;
  const yes = commas(measure.result.limitedPurposeYes);
  const no = commas(measure.result.limitedPurposeNo);
  const line = `Limited-purpose area: For ${yes}, Against ${no}.`;
  assert.ok(visible.includes(line), measure.id);
  const summed = commas(measure.result.yes + measure.result.limitedPurposeYes);
  assert.equal(visible.includes(summed), false, `${measure.id} summed ${summed}`);
}

test("the built results page states the unofficial count once", () => {
  const html = readFileSync("_site/election/2026-11-03/index.html", "utf8");
  const visible = html
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", "\"")
    .replaceAll("&amp;", "&");
  assert.equal(times(visible, /Unofficial Travis County election-night totals/g), 1);
  assert.equal(times(visible, /Counting may continue/g), 1);
  assert.equal(times(visible, /whose votes are not included/g), 1);
  assert.equal(times(visible, /9:46 p\.m\. Central, Nov\. 3/g), 1);
  assert.equal(times(visible, /Limited-purpose area:/g), 8);
  assert.equal(times(visible, /Results not posted yet/g), 0);
  assert.equal(times(visible, /Not posted yet/g), 0);
  assert.equal(times(visible, /For leads\./g), 7);
  assert.equal(times(visible, /Against leads\./g), 4);
  assert.doesNotMatch(visible, /\b(passed|failed|approved|rejected)\b/i);
  assert.doesNotMatch(visible, /vote yes|vote no|should vote/i);
  assert.ok(visible.includes(SOURCE));
  for (const measure of data.measures) {
    assert.ok(visible.includes(measure.ballotTitle), measure.ballotTitle);
    assert.ok(visible.includes(measure.summary), measure.id);
    assert.ok(visible.includes(measure.source), measure.source);
    assert.ok(visible.includes(`For ${commas(measure.result.yes)}.`), measure.id);
    const against = `Against ${commas(measure.result.no)}.`;
    assert.ok(visible.includes(against), measure.id);
    assertLimitedSeparate(visible, measure);
  }
});
