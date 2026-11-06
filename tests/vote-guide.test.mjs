import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import vote2026 from "../src/_data/vote2026.js";
import { electionNavOpen } from "../src/_includes/election-nav.js";
import { chicagoDate } from "../scripts/chicago-time.mjs";
import { pageMetadata } from "../scripts/metadata.mjs";

const guide = await readFile(new URL("../src/vote-2026/index.md", import.meta.url), "utf8");

test("the built vote page renders official source urls", {
  skip: !existsSync("_site/vote-2026/index.html")
    && "run npm run build before integration checks"
}, async () => {
  const html = await readFile("_site/vote-2026/index.html", "utf8");
  const keys = new Set([...guide.matchAll(/vote2026\.links\.(\w+)/g)].map(match => match[1]));
  for (const key of keys) {
    assert.ok(html.includes(vote2026.links[key]), key);
  }
  assert.equal(html.includes('href=""'), false);
  const payoff = html.indexOf('class="results-payoff"');
  const after = html.indexOf('id="do-these-first"');
  const ballot = html.indexOf("Austin ballot and measure history (record)");
  const sites = html.indexOf("Early voting sites from the County list (45 sites, record)");
  assert.ok(payoff !== -1 && payoff < after && after < ballot && ballot < sites);
  assert.equal(html.includes("<details"), true);
  assert.equal(html.includes("<details open"), false);
  assert.equal((html.match(/<li>Steven Brown<\/li>/g) || []).length, 1);
});

test("the vote page leads with status and a results button", () => {
  const top = guide.slice(0, guide.search(/\n(?:### |<h3\b)/));
  assert.match(top, /Voting for the November 3, 2026 election is over/);
  assert.match(top, /class="results-payoff"/);
  assert.match(top, /href="\/election\/2026-11-03\/"/);
  assert.match(top, />Election results</);
  assert.ok(top.indexOf("election is over") < top.indexOf("results-payoff"));
  assert.doesNotMatch(top, /registration deadline/);
  assert.doesNotMatch(top, /Early voting/);
  assert.doesNotMatch(top, /Steven Brown|Proposition A|Proposition C/);
});

test("registration status uses the endorsed portal with official instruction fallback", () => {
  assert.equal(vote2026.links.myVoterPortal, "https://goelect.txelections.civixapps.com/ivis-mvp-ui/#/login");
  assert.equal(vote2026.links.register, "https://www.votetexas.gov/register-to-vote/");
  assert.match(guide, /If the lookup does not load[\s\S]*vote2026.links.register/);
});

test("sample ballots stay on the county record, not the registration-status portal", () => {
  const ballotLine = guide.split("\n")
    .find(line => line.startsWith("- Sample ballots for November 3"));
  assert.ok(ballotLine);
  assert.match(ballotLine, /vote2026.links.travisCurrentElection/);
  assert.match(ballotLine, /Sample Ballots/);
  assert.match(ballotLine, /election is closed/);
  assert.doesNotMatch(ballotLine, /myVoterPortal|coming soon/i);
});

test("ordinary new application instructions preserve distinct online routes", () => {
  assert.match(guide, /print, sign, and (?:mail or deliver|return)/i);
  assert.match(guide, /online name\/address updates/);
  assert.match(guide, /qualifying DPS/);
  assert.match(guide, /vote2026.links.registrationInstructions/);
});

test("polling-location guidance is explicitly limited to the registration county", () => {
  assert.match(guide,
    /Voters registered in Travis County could vote at any Travis County vote center/);
  assert.match(guide, /Polls for that election are closed/);
  assert.match(guide, /Hays or Williamson/);
  assert.match(guide, /vote2026.links.cityVoterResources/);
});

test("deadline-day extended hours are dated, location-specific and easy to retire", () => {
  // Routine editors can retire the temporary paragraph after the actual deadline
  // without making later daily checks require expired guidance.
  const deadlinePassed = chicagoDate() > "2026-10-05";
  if (deadlinePassed && !guide.includes("2433 Ridgepoint Drive")) return;
  assert.match(guide, /Monday, October 5, 2026 only/);
  assert.match(guide, /2433 Ridgepoint Drive/);
  assert.match(guide, /8 a\.m\. to midnight/);
  assert.match(guide, /extended hours apply only to this location/);
  assert.match(guide, /vote2026.links.travisRegistrationDeadline/);
  assert.match(guide, /Remove this deadline-day paragraph after October 5/);
});

test("election nav stays on the Chicago calendar through the published window", () => {
  const late = new Date("2026-10-27T01:30:00Z");
  assert.equal(chicagoDate(late), "2026-10-26");
  assert.equal(electionNavOpen(late), true);
  assert.equal(electionNavOpen(new Date("2026-09-15T04:30:00Z")), false);
  assert.equal(electionNavOpen(new Date("2026-09-15T05:00:00Z")), true);
  assert.equal(electionNavOpen(new Date("2026-11-05T05:30:00Z")), true);
  assert.equal(electionNavOpen(new Date("2026-11-05T06:00:00Z")), false);
  assert.equal(vote2026.showNav, electionNavOpen());
});

test("verified election dates and guide navigation window remain unchanged", () => {
  assert.deepEqual(vote2026.window, {
    start: "2026-09-15",
    registrationDeadline: "2026-10-05",
    earlyVoteStart: "2026-10-19",
    earlyVoteEnd: "2026-10-30",
    electionDay: "2026-11-03",
    end: "2026-11-04"
  });
  assert.match(guide, /Monday, October 19 – Friday, October 30, 2026/);
  assert.match(guide, /Tuesday, November 3, 2026/);
});

test("sharing text reads as a closed election, not an active voting guide", () => {
  const description = guide.match(/^description: "(.+)"$/m)?.[1];
  const title = guide.match(/^title: "(.+)"$/m)?.[1];
  assert.equal(description,
    "Voting for the November 3, 2026 election is over. "
    + "Results, the Austin ballot, and the record of dates and polling sites.");
  assert.match(title, /election record/);
  assert.doesNotMatch(title, /official instructions|how to vote|voting guidance/i);
  assert.doesNotMatch(description, /official instructions|how to vote|voting guidance/i);
  const meta = pageMetadata("/vote-2026/", title, "", description);
  assert.equal(meta.description, description);
  assert.match(meta.title, /election record/);
  const fallback = pageMetadata("/vote-2026/", title, "", "");
  assert.equal(fallback.description, description);
  assert.doesNotMatch(fallback.description, /registration links|voting guidance/);
});

test("post-election status replaces deadline how-to and keeps the city runoff calendar", () => {
  assert.doesNotMatch(guide, /### Do these first/);
  assert.doesNotMatch(guide, /Turnout so far/);
  assert.doesNotMatch(guide, /before you go/);
  assert.doesNotMatch(guide, /\b[Oo]ur\b/);
  assert.doesNotMatch(guide, /may vote early/);
  assert.match(guide, /<h3 id="do-these-first" tabindex="-1">After November 3<\/h3>/);
  assert.match(guide, /href="\/election\/2026-11-03\/"/);
  assert.match(guide, /11 a\.m\. on November 17/);
  assert.match(guide, /could be earlier, pending the election returns/);
  assert.match(guide, /https:\/\/services\.austintexas\.gov\/edims\/document\.cfm\?id=472487/);
  assert.match(guide, /November 12 is the last day to register to vote in the runoff/);
  assert.match(guide, /November 30 through December 8/);
  assert.match(guide, /received by December 1, not merely postmarked/);
  assert.match(guide, /Election Day is December 12/);
  assert.match(guide, /Runoff panel, if one is needed: November 20 at 6:30 p\.m\./);
  assert.match(guide, /Those dates have passed/);
  assert.doesNotMatch(guide, /September 17 \(District 5\), September 21/);
  assert.match(guide, /- \*\*District 5:\*\* September 17/);
  assert.match(guide, /- \*\*District 1:\*\* October 15/);
  const early = guide.slice(
    guide.indexOf("### Early voting record"),
    guide.indexOf("### Election Day record")
  );
  assert.match(early, /is closed/);
  assert.match(early, /<details class="record-disclosure">/);
  assert.match(early,
    /<summary>Early voting sites from the County list \(45 sites, record\)<\/summary>/);
  assert.ok(early.indexOf("<summary>Early voting sites")
    < early.indexOf("Turnout through October 21"));
  assert.match(early, /Ben Hur Shrine Center/);
  assert.match(early, /TCC Complex/);
  assert.match(early, /Through Wednesday, October 21/);
  assert.match(early, /a snapshot, not the final count/);
  assert.match(early, /vote2026\.links\.earlyVotingSites/);
  const sites = early.slice(
    early.indexOf("<summary>Early voting sites"),
    early.indexOf("</details>") + 10
  );
  assert.equal(sites.match(/<li>/g).length, 45);
  const registration = guide.slice(guide.indexOf("### Registration for a later election"));
  assert.match(registration, /has passed/);
  assert.match(registration, /Nothing in this section reopens it/);
  const ballot = guide.slice(
    guide.indexOf("<summary>Austin ballot and measure history"),
    guide.indexOf("</details>") + 10
  );
  assert.match(ballot, /<h4>District 1<\/h4>[\s\S]*<li>Steven Brown<\/li>/);
  assert.doesNotMatch(ballot, /Steven Brown, Alexandria Anderson/);
  assert.match(ballot, /<h4>Proposition A<\/h4>/);
  assert.match(ballot, /<h4>Proposition C<\/h4>/);
  assert.match(ballot, /THIS IS A TAX INCREASE/);
  assert.ok(guide.indexOf("results-payoff") < guide.indexOf(">After November 3</h3>"));
  assert.ok(guide.indexOf(">After November 3</h3>")
    < guide.indexOf("<summary>Austin ballot and measure history"));
  assert.ok(guide.indexOf("</details>") < guide.indexOf("### Early voting record"));
  assert.ok(guide.indexOf(">After November 3</h3>") < guide.indexOf("### Early voting record"));
  assert.ok(guide.indexOf("### Early voting record")
    < guide.indexOf("### Registration for a later election"));
  assert.doesNotMatch(guide, /<details[^>]*\sopen/);
});

test("runoff registration deadline is before the scheduled canvass", () => {
  const after = guide.slice(
    guide.indexOf('id="do-these-first"'),
    guide.indexOf("<summary>Austin ballot")
  );
  const deadline = after.indexOf(
    "November 12 is the last day to register to vote in the runoff"
  );
  const beforeCanvass = after.indexOf(
    "It falls before the scheduled November 17 canvass."
  );
  const doNotWait = after.indexOf(
    "Do not wait for a runoff order to register."
  );
  const canvass = after.indexOf("11 a.m. on November 17");
  assert.ok(deadline !== -1 && beforeCanvass > deadline);
  assert.ok(doNotWait > beforeCanvass && canvass > doNotWait);
  assert.match(after, /if the Council orders one/);
  assert.match(after, /could be earlier, pending the election returns/);
  assert.match(after, /If the Council orders a runoff, early voting/);
  assert.match(after, /document\.cfm\?id=472487/);
  assert.doesNotMatch(after, /the same calendar sets these dates/);
  assert.doesNotMatch(after, /7 a\.m\.|10 p\.m\./);
  const registration = guide.slice(
    guide.indexOf("### Registration for a later election")
  );
  assert.match(registration, /has passed/);
  assert.match(registration, /Nothing in this section reopens it/);
  assert.match(registration, /if one is ordered/);
  assert.match(registration,
    /November 12 registration deadline arrives before the scheduled canvass on November 17/);
  assert.match(registration, /Registration cannot wait for that order/);
  assert.match(registration, /City calendar is linked/);
  assert.match(registration, /href="#do-these-first"/);
});
