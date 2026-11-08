import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tidyEditionChrome } from "../scripts/edition-chrome.mjs";

const HREF = "/about/#trust";

test("a greeting-only morning note and the Briefing heading come off", () => {
  const html = "<nav class=\"skim\"><h2 id=\"skim-title\">Today's items</h2></nav>"
    + "<p class=\"morning-note\">Good morning, Austin.</p>"
    + "<h2 id=\"the-briefing\" tabindex=\"-1\">The Briefing</h2>"
    + "<h3>The lead</h3>";
  const page = tidyEditionChrome(html, HREF);
  assert.equal(page.includes("Good morning, Austin"), false);
  assert.equal(page.includes("the-briefing"), false);
  assert.equal(page.includes("The Briefing"), false);
  assert.match(page, /id="skim-title"[^>]*>Today's items/);
  assert.match(page, /href="\/about\/#trust"/);
  assert.match(page, /How this site is made/);
  assert.equal(page.includes("About our reporting"), false);
  assert.match(page, /<h3>The lead<\/h3>/);
});

test("a morning note keeps the sentence after the greeting", () => {
  const html = "<p class=\"morning-note\">Good morning, Austin. It is sunny.</p>"
    + "<h2 id=\"the-briefing\">The Briefing</h2>";
  const page = tidyEditionChrome(html, HREF);
  assert.match(page, /<p class="morning-note">It is sunny\.<\/p>/);
  assert.equal(page.includes("Good morning"), false);
  assert.match(page, /<p class="briefing-meta">/);
  assert.equal(page.includes("<h2"), false);
});

test("archive pins the Nov 5 meeting and the results page", () => {
  const archive = readFileSync("src/archive.njk", "utf8");
  assert.equal(archive.includes("2026-10-22-preview"), false);
  assert.match(archive, /https:\/\/yallcityhall\.org\/meetings\/2026-11-05\//);
  assert.match(archive, /href="\/election\/2026-11-03\/"/);
});

test("About leads with the publisher and one account of the model", () => {
  const about = readFileSync("src/about.md", "utf8");
  const lead = about.slice(about.indexOf("# About"), about.indexOf("<h2"));
  assert.match(lead, /Evan McMillan, the publisher, is responsible for the site/);
  assert.match(lead, /every fact\s+comes from a source we read that morning/);
  assert.equal(about.includes("What the model does"), false);
  assert.equal((about.match(/An AI system produces/g) || []).length, 1);
  assert.match(about, /id="trust"/);
  assert.match(about, /class="crawler-user-agent"/);
  assert.match(about, /robots\.txt/);
  assert.match(about, /MSN syndication/);
  const gather = about.indexOf("## How we gather");
  const made = about.indexOf("How this site is made");
  assert.ok(gather > made);
});
