import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const TODAY = "City records list rent limits ending on hundreds of affordable " +
  "rentals each year from 2027 to 2031. Commissioners meet at 9 a.m. on " +
  "borrowing, STAR Flight and a bond election.";

test("the Nov. 10 card page uses the fact-checked lines", () => {
  const page = readFileSync("_site/2026/11/10/index.html", "utf8").replaceAll("\u00a0", " ");
  const older = readFileSync("_site/2026/11/09/index.html", "utf8").replaceAll("\u00a0", " ");
  assert.match(page, /Rent limits on affordable rentals end in 2027/);
  assert.match(page, /proposed certificates total/);
  assert.match(page, /County weighs adding to fiscal 2027 borrowing/);
  assert.match(page, /Bell Textron/);
  assert.match(page, /highest-ranked respondent/);
  assert.doesNotMatch(page, /highest-ranked bidder/);
  assert.match(page, /County weighs starting a 2027 bond election/);
  assert.match(page, /consider the Nov\. 3 canvass order/);
  assert.match(page, /Nov\. 17 meeting preview on Y'all City Hall/);
  assert.match(page, /79°/);
  assert.ok(page.includes(TODAY), "today line");
  assert.equal(older.includes(TODAY), false);
  assert.doesNotMatch(page, /pending copy check/i);
  assert.match(page, /class="signup signup--edition"/);
  assert.match(page, /aria-label="Share: Rent limits on affordable rentals end in 2027"/);
  assert.match(page, /Chart: Austin affordable rental units/);
  const words = TODAY.trim().split(/\s+/);
  assert.ok(words.length <= 40, words.length);
  assert.equal(words.includes("927"), false);
});
