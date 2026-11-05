import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function assertOneDatasetLink(html) {
  const leadHtml = html.match(/<section class="front-lead"[\s\S]*?<\/section>/)?.[0] ?? "";
  const datasetUrl = "https://data.austintexas.gov/d/xwdj-i9he";
  assert.equal(leadHtml.split(datasetUrl).length - 1, 1);
  const source = leadHtml.match(
    /<p class="src front-sources">Source: <a href="([^"]+)"[^>]*>([^<]+)<\/a><\/p>/
  );
  assert.equal(source?.[1], datasetUrl);
  assert.equal(source?.[2], "Austin 311 public data, City of Austin Open Data");
  assert.doesNotMatch(leadHtml, /class="num"/);
}

test("the homepage lead is headline, dek, chart, then source", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const lead = html.match(/<section class="front-lead"[\s\S]*?<\/section>/)?.[0] ?? "";
  const h1 = lead.indexOf("<h1");
  const dek = lead.indexOf('class="front-deck"');
  const figure = lead.indexOf("lead-photo");
  const source = lead.indexOf('class="src front-sources"');
  assert.ok(h1 !== -1 && dek > h1 && figure > dek && source > figure, lead.slice(0, 400));
  assert.doesNotMatch(lead, /results-button/);
  assert.match(lead, /CHART · NOT A PHOTOGRAPH/);
  const template = readFileSync("src/index.njk", "utf8");
  const stat = template.indexOf("lead-stat");
  const results = template.indexOf("results-row");
  const photo = template.indexOf("leadHtml");
  const sourceSlot = template.indexOf("front-sources");
  assert.ok(stat < results && results < photo && photo < sourceSlot);
  assert.match(template, /class="results-link"/);
  assert.match(
    template,
    /editionDate == election2026\.date or editionDate == election2026\.homepageThrough/
  );
  assert.doesNotMatch(template, /results-button/);
  const css = readFileSync("src/css/front-cover.css", "utf8");
  assert.match(css, /\.home-front \.front-lead h1 \{[\s\S]*?font-size:\s*3rem;/);
  assert.match(css, /font-size:\s*2\.125rem;/);
  assert.match(css, /\.home-front \.results-link \{[\s\S]*?background:\s*transparent;/);
  assert.doesNotMatch(css, /position:\s*absolute/);
  assert.doesNotMatch(css, /padding-top:\s*(268|420)px/);
  assert.doesNotMatch(css, /#c8102e;\s*\n\s*color:\s*#fff/);
});

test("the homepage is one lead, and dated editions keep their own page", () => {
  const html = readFileSync("_site/index.html", "utf8");
  for (const text of [
    "/css/front-cover.css",
    "class=\"front-lead\"",
    "class=\"front-stories\"",
    ">News<",
    ">Notices<",
    "class=\"src front-sources\""
  ]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /week-block|Before it closes|id="week-title"/);
  assert.match(html, /Get the morning email\./);
  assert.doesNotMatch(html, /5 minutes|One email each morning/);
  assert.doesNotMatch(html, /class="results-button"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /Parking complaints are now Austin(?:'|&#39;)s top 311 request\./);
  assert.match(html, /class="wordmark"/);
  assert.match(html, /class="masthead-dateline"/);
  assert.doesNotMatch(html, /ill-masthead|masthead-sky|austin-skyline/);
  assert.match(html, /parking-311\.webp/);
  assert.doesNotMatch(html, /p-courthouse\.jpg/);
  assert.doesNotMatch(html, /election-results\.webp/);
  const srcset = "/images/2026-11-05/parking-311-800.webp 800w, " +
    "/images/2026-11-05/parking-311.webp 1280w";
  assert.ok(html.includes(`srcset="${srcset}"`));
  assert.match(
    html,
    /sizes="\(max-width: 760px\) calc\(100vw - 32px\), 1280px"/
  );
  assert.match(html, /width="1280" height="960"/);
  assert.match(html, /loading="eager"/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /CHART · NOT A PHOTOGRAPH/);
  assert.match(html, /311 counts show how often people report a problem/);
  assertOneDatasetLink(html);
  assert.match(html, /creativecommons\.org\/publicdomain\/zero\/1\.0/);
  const imageUrl = "https://theaustinbulletin.com/images/2026-11-05/parking-311.webp";
  assert.ok(html.includes(`property="og:image" content="${imageUrl}"`));
  assert.ok(html.includes(`name="twitter:image" content="${imageUrl}"`));
  assert.match(html, /property="og:title" content="Parking complaints are now Austin/);
  assert.match(
    html,
    /property="og:description" content="Austinites filed 2,437 parking enforcement requests/
  );
  assert.match(html, /name="twitter:title" content="Parking complaints are now Austin/);
  assert.match(html, /Thursday, Nov\. 5/);
  assert.match(html, /href="\/2026\/11\/04\/"/);
  assert.doesNotMatch(html, /If you (haven't|want|live|are)\b/);
  assert.ok(!html.includes("front-news-rail"), "the rail is gone");
  assert.ok(!html.includes("Austin, up close."));
  assert.ok(!html.includes("Original illustration"));
  assert.ok(!html.includes("Keep these close"));
  assert.ok(!html.includes("barton-springs-960.webp"));
  const edition = html.match(/data-edition="([0-9-]+)"/)?.[1];
  assert.ok(edition);
  const page = readFileSync(`_site/${edition.replaceAll("-", "/")}/index.html`, "utf8");
  assert.match(page, /class="wordmark"/);
  assert.match(page, /class="site-menu"/);
  assert.match(page, /<h1 class="edition-kicker"/);
  assert.doesNotMatch(page, /class="edition-lead-title"/);
  assert.match(page, /Today's items/);
  assert.doesNotMatch(page, /In 60 seconds/);
  assert.doesNotMatch(page, /Good morning, Austin/);
  assert.doesNotMatch(page, /<h2[^>]*>\s*The Briefing/);
  assert.match(page, /About our reporting/);
  const lead = page.match(/<h3\b[^>]*\bid="([^"]+)"/);
  assert.ok(lead, "edition lead heading");
  assert.match(page, new RegExp(`<nav class="skim"[\\s\\S]*href="#${lead[1]}"`));
  const h1 = page.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? "";
  assert.equal(h1.includes(lead[1]), false);
  assert.doesNotMatch(page, />Results page</);
  assert.doesNotMatch(page, /November 3 election results\./);
  assert.match(page, /November 5, 2026/);
  assert.doesNotMatch(page, /p-courthouse/);
  assert.match(page, /parking-311\.webp/);
  assert.match(page, /fetchpriority="high"/);
  assert.match(page, /CHART · NOT A PHOTOGRAPH/);
  assert.ok(page.includes(`property="og:image" content="${imageUrl}"`));
  assert.doesNotMatch(page, /Unifraktur|class="folio-nav"|class="edition-head"|Vol\. I/);
});
