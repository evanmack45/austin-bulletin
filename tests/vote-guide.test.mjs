import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vote2026 from "../src/_data/vote2026.js";

const guide = await readFile(new URL("../src/vote-2026/index.md", import.meta.url), "utf8");

test("registration status uses the endorsed portal with official instruction fallback", () => {
  assert.equal(vote2026.links.myVoterPortal, "https://goelect.txelections.civixapps.com/ivis-mvp-ui/#/login");
  assert.equal(vote2026.links.register, "https://www.votetexas.gov/register-to-vote/");
  assert.match(guide, /If the lookup does not load[\s\S]*vote2026.links.register/);
});

test("sample ballots are routed to the county rather than the registration-status portal", () => {
  const ballotLine = guide.split("\n")
    .find(line => line.startsWith("- Where to vote and sample ballots:"));
  assert.ok(ballotLine);
  assert.match(ballotLine, /vote2026.links.travisCurrentElection/);
  assert.match(ballotLine, /Sample Ballots/);
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
    /Voters registered in Travis County can vote at any Travis County vote center/);
  assert.match(guide, /Hays or Williamson/);
  assert.match(guide, /vote2026.links.cityVoterResources/);
});

test("deadline-day extended hours are dated, location-specific and easy to retire", () => {
  // Routine editors can retire the temporary paragraph after the actual deadline
  // without making later daily checks require expired guidance.
  const deadlinePassed = new Date().toISOString().slice(0, 10) > "2026-10-05";
  if (deadlinePassed && !guide.includes("2433 Ridgepoint Drive")) return;
  assert.match(guide, /Monday, October 5, 2026 only/);
  assert.match(guide, /2433 Ridgepoint Drive/);
  assert.match(guide, /8 a\.m\. to midnight/);
  assert.match(guide, /extended hours apply only to this location/);
  assert.match(guide, /vote2026.links.travisRegistrationDeadline/);
  assert.match(guide, /Remove this deadline-day paragraph after October 5/);
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
