import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { foldLegacyCopy } from "../scripts/legacy-edition-cards.mjs";

const FIVE = [
  "Project Completed",
  "Certified",
  "Under Construction",
  "Loan Awarded",
  "Loan Closed"
];

function barValues(html) {
  return [...html.matchAll(/<span class="bar-value([^"]*)"[^>]*>(\d+)<\/span>/g)]
    .map((match) => ({
      highlight: match[1].includes("is-hi"),
      units: Number(match[2])
    }));
}

test("the hero, 2027 bar, and summary line are the same unit count", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const lead = html.match(
    /<section class="[^"]*story-card--lead[^"]*"[\s\S]*?<\/section>/
  )?.[0] ?? "";
  const hero = lead.match(/<p class="bignum">([^<]+)/);
  assert.ok(hero);
  assert.match(hero[1], /297/);
  assert.doesNotMatch(lead, />927</);
  assert.doesNotMatch(lead, /\$67\.8M/);
  assert.match(lead, /1,522/);
  assert.match(lead, /1,763/);
  assert.match(lead, /class="bar bar-hi"/);

  const edition = readFileSync("_site/2026/11/10/index.html", "utf8");
  assert.match(edition, /<p class="bignum">927<\/p>/);
  const editionBars = barValues(edition);
  assert.equal(editionBars.find((bar) => bar.highlight).units, 927);
  assert.deepEqual(editionBars.map((bar) => bar.units), [927, 268, 637, 953, 358]);
  const story = readFileSync("_site/lead-story/index.html", "utf8");
  for (const page of [edition, story]) {
    assert.match(page, /Each chart bar sums affordable units/);
    for (const status of FIVE) assert.match(page, new RegExp(status));
  }
});

test("every chart bar matches the five-status inventory query", () => {
  const lead = JSON.parse(readFileSync("src/_data/lead.json", "utf8"));
  const evidence = JSON.parse(readFileSync(
    "data/affordable-housing-inventory-2027-2031.json",
    "utf8"
  ));
  assert.equal(evidence.dataset_id, "ifzc-3xz8");
  assert.match(evidence.soql.$where, /housing_tenure='Rental'/);
  for (const status of FIVE) assert.match(evidence.soql.$where, new RegExp(status));
  assert.deepEqual(
    lead.series_by_year.map((point) => ({ year: point.year, units: point.units })),
    evidence.years.map((year) => ({ year: year.year, units: year.units }))
  );
  const html = readFileSync("_site/2026/11/10/index.html", "utf8");
  assert.deepEqual(
    barValues(html).map((bar) => bar.units),
    evidence.years.map((year) => year.units)
  );
});

test("reduced motion paints the final count and does not run the count-up", () => {
  const js = readFileSync("src/js/reset-home.js", "utf8");
  assert.match(js, /prefers-reduced-motion:\s*reduce/);
  const reduced = js.split("if (reduce)")[1].split("else")[0];
  assert.doesNotMatch(reduced, /countTo\(/);
  assert.match(js, /paintCount\(node, end\)/);
  assert.match(reduced, /is-in/);
});

test("a legacy card keeps the headline, art, and first line, and the rest", () => {
  const folded = foldLegacyCopy([
    "<h3 id=\"lead\">Parking complaints are now Austin's top 311 request.</h3>",
    "<figure class=\"lead-photo\"><img alt=\"chart\"></figure>",
    "<p>Austinites filed 2,437 parking enforcement requests.</p>",
    "<figure class=\"lead-photo lead-photo--flat\"><img alt=\"later photo\"></figure>",
    "<figure class=\"graphic\"><img alt=\"later chart\"></figure>",
    "<p class=\"whats-next\">Later pulls can differ.</p>",
    "<p class=\"source-line\">Sources: <a href=\"https://data.austintexas.gov/d/xwdj-i9he\">Austin 311</a></p>"
  ].join("\n"));
  assert.match(folded.headingHtml, /Parking complaints/);
  assert.match(folded.artHtml, /alt="chart"/);
  assert.match(folded.artHtml, /later photo/);
  assert.doesNotMatch(folded.artHtml, /graphic/);
  assert.doesNotMatch(folded.moreHtml, /lead-photo/);
  assert.match(folded.ledeHtml, /2,437 parking/);
  assert.match(folded.moreHtml, /class="graphic"/);
  assert.match(folded.moreHtml, /Later pulls/);
  assert.match(folded.moreHtml, /href="https:\/\/data\.austintexas\.gov\/d\/xwdj-i9he"/);
  assert.doesNotMatch(folded.ledeHtml, /Later pulls/);
});
