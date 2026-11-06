import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { centralTime } from "../src/_includes/chicago-date.js";

const data = JSON.parse(readFileSync("src/_data/election2026.json", "utf8"));
const page = readFileSync("src/_includes/election-results.njk", "utf8");
const home = readFileSync("src/index.njk", "utf8");
const edition = readFileSync("src/_includes/bulletin.njk", "utf8");

const OLD_DESCRIPTION = "Polls are open 7 a.m. to 7 p.m. Central time. " +
  "City of Austin Propositions A-J and one Austin Community College measure, " +
  "with Travis County results links.";
const DESCRIPTION = "Travis County unofficial results for City of Austin " +
  "Propositions A–J and ACC Proposition A, with a link to the county results.";
const AS_OF = "2026-11-04T09:37:00Z";
const AS_OF_DISPLAY = "3:37 a.m. Central on November 4, 2026";
const STATUS = "Unofficial Travis County count, not final";
const SOURCE = "https://results.enr.clarityelections.com/TX/Travis/127492/";

// Full Purpose For/Against, then Limited Purpose where the clerk posted a second contest.
// Limited Purpose is not added into yes/no. The lead uses the Full Purpose contest only.
// Clarity version 385566, posted 3:37 a.m. CST Nov. 4. Full Purpose is yes/no.
// Limited Purpose on C–J is separate and is not added in. Outcomes match 384294.
const COUNTS = {
  "austin-a": { yes: 211842, no: 132911, outcome: "For leads" },
  "austin-b": { yes: 207036, no: 136142, outcome: "For leads" },
  "austin-c": {
    yes: 214141, no: 98455, outcome: "For leads",
    limitedPurposeYes: 6119, limitedPurposeNo: 2777
  },
  "austin-d": {
    yes: 113930, no: 202392, outcome: "Against leads",
    limitedPurposeYes: 3670, limitedPurposeNo: 5350
  },
  "austin-e": {
    yes: 85725, no: 222369, outcome: "Against leads",
    limitedPurposeYes: 2757, limitedPurposeNo: 5976
  },
  "austin-f": {
    yes: 224531, no: 77667, outcome: "For leads",
    limitedPurposeYes: 6187, limitedPurposeNo: 2535
  },
  "austin-g": {
    yes: 189983, no: 108462, outcome: "For leads",
    limitedPurposeYes: 5867, limitedPurposeNo: 2795
  },
  "austin-h": {
    yes: 197179, no: 103862, outcome: "For leads",
    limitedPurposeYes: 5256, limitedPurposeNo: 3463
  },
  "austin-i": {
    yes: 140207, no: 178582, outcome: "Against leads",
    limitedPurposeYes: 5342, limitedPurposeNo: 3792
  },
  "austin-j": {
    yes: 220294, no: 84393, outcome: "For leads",
    limitedPurposeYes: 6390, limitedPurposeNo: 2321
  },
  "acc-a": { yes: 16105, no: 27550, outcome: "Against leads" }
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
  assert.match(page, /Travis County unofficial count, updated/);
  assert.match(page, /Williamson and Hays counties/);
  assert.match(page, /whose votes are not included/);
  assert.match(page, /Counting may continue/);
  assert.match(page, /measure\.summary/);
  assert.match(page, /measure\.source/);
  assert.doesNotMatch(page, /measure\.result\.status/);
  assert.doesNotMatch(page, /measure\.result\.asOfDisplay/);
  assert.match(page, /Voting for November 3, 2026, is over/);
  assert.match(page, /See the count status above/);
  assert.match(page, /election2026\.links\.sosDates/);
  assert.match(page, /election2026\.links\.currentElection/);
  assert.match(page, /election2026\.links\.resultsPage/);
  assert.match(page, /election2026\.links\.voterLookup/);
  assert.match(page, /href="\/vote-2026\/"/);
  assert.doesNotMatch(page, /Polls are open/);
  assert.doesNotMatch(page, /is Election Day/);
  assert.doesNotMatch(page, /cast a ballot/);
  assert.doesNotMatch(page, /electionDaySites/);
  assert.match(home, /href="\/election\/\{\{ election2026\.date \}\}\/"/);
  assert.match(edition, /editionIso == election2026\.date/);
  assert.match(edition, /Results page/);
});

test("the checked time is the data file timestamp in Central time", () => {
  assert.equal(centralTime(data.checkedAt), "3:37 a.m.");
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
  assert.equal(times(visible, /Travis County unofficial count, updated/g), 1);
  assert.equal(times(visible, /Counting may continue/g), 1);
  assert.equal(times(visible, /whose votes are not included/g), 1);
  assert.equal(times(visible, /3:37 a\.m\. Nov\. 4/g), 1);
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

function metaContent(html, attr, name) {
  const match = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`, "i"));
  return match?.[1] ?? "";
}

test("built election pages drop the Election Day polls-open copy once results are listed", () => {
  assert.equal(data.resultsListed, true);
  const pages = [
    "src/election/2026-11-03.njk",
    "src/election/index.njk"
  ];
  for (const file of pages) {
    const source = readFileSync(file, "utf8");
    assert.ok(source.includes(`description: "${DESCRIPTION}"`), file);
    assert.equal(source.includes(OLD_DESCRIPTION), false, file);
    assert.equal(source.includes("Polls are open"), false, file);
  }
  for (const file of [
    "_site/election/2026-11-03/index.html",
    "_site/election/index.html"
  ]) {
    const html = readFileSync(file, "utf8");
    assert.equal(html.includes("Polls are open"), false, file);
    assert.equal(html.includes("is Election Day"), false, file);
    assert.equal(html.includes(OLD_DESCRIPTION), false, file);
    assert.equal(html.includes("cast a ballot"), false, file);
    assert.ok(html.includes("Voting for November 3, 2026, is over."), file);
    assert.ok(html.includes("See the count status above for the county results link."), file);
    assert.equal(metaContent(html, "name", "description"), DESCRIPTION, file);
    assert.equal(metaContent(html, "property", "og:description"), DESCRIPTION, file);
    assert.equal(metaContent(html, "name", "twitter:description"), DESCRIPTION, file);
  }
});
