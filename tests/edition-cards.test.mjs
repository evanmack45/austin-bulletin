import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const TODAY = "Rent limits end each year from 2027 to 2031. Outcomes from the " +
  "Tuesday meetings are in this edition.";

test("the Nov. 10 card page uses the fact-checked lines", () => {
  const page = readFileSync("_site/2026/11/10/index.html", "utf8").replaceAll("\u00a0", " ");
  const older = readFileSync("_site/2026/11/09/index.html", "utf8").replaceAll("\u00a0", " ");
  assert.match(page, /Rent limits on affordable rentals end in 2027/);
  assert.match(page, /approved certificates total/);
  assert.match(page, /County certificates approved/);
  assert.match(page, /Bell Textron/);
  assert.match(page, /in the amount of \$67,757,745\.12/);
  assert.doesNotMatch(page, /highest-ranked bidder/);
  assert.match(page, /No action on bond committee/);
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
  for (const line of [
    "Balcones Canyonlands Preserve",
    "Pease Park Conservancy",
    "Approved Nov. 10, 4\u20110.",
    "Kaskade Origin event Nov. 20\u201121 at 8509 Burleson Road",
    "by $13.5 million, to $197.1 million",
    "The judge called it unanimous, according to the meeting video.",
    "The county has not yet posted the vote record.",
    "took no action, according to the meeting video.",
    "County vote record (consent motion)",
    ">Meeting video<",
    ">Agenda<"
  ]) {
    assert.equal(page.includes(line), true, line);
  }
  assert.equal(page.includes("https://"), true);
  const visible = page
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ");
  assert.equal(visible.includes("https://"), false);
  const kaskade = page.match(/id="kaskade-origin-permit"[\s\S]*?<\/details>/)?.[0] ?? "";
  assert.match(kaskade, /Kaskade Origin/);
  assert.equal(kaskade.includes("Cascade"), false);
  assert.equal(page.includes("three helicopters"), false);
  assert.equal(page.includes("Leonardo"), false);
  assert.equal(page.includes("ceiling"), false);
  assert.equal(page.includes("Shea"), false);
  assert.equal(page.includes("CivicClerk"), false);
  assert.equal(page.includes("5-0"), false);
  assert.equal(page.includes("Listed for consideration, not approval"), false);
  assert.doesNotMatch(page, /would award|will consider approving|may decide a permit/);
  const star = page.match(/id="678-million-contract[\s\S]*?<\/details>/)?.[0] ?? "";
  assert.equal(star.includes("4-0"), false);
  assert.equal(star.includes("5-0"), false);
  assert.match(page, /Mobility Committee meets at 1/);
});
