import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function assertLeadComparisonSources(html) {
  const leadHtml = html.match(/<section class="front-lead"[\s\S]*?<\/section>/)?.[0] ?? "";
  const hrefs = [
    "https://www.austintexas.gov/police/news/homicide-investigation-3909-guadalupe-street",
    "https://www.austintexas.gov/police/news/homicide-investigation-intersection-e-5th-st-and-trinity-st",
    "https://www.kxan.com/news/local/austin/austin-homicide-map-2025/"
  ];
  for (const href of hrefs) assert.equal(leadHtml.split(href).length - 1, 1, href);
  const group = '<span class="source-group"><span class="source-label">Sources:</span> ';
  const marker = `${group}Bulletin comparison of <a href="${hrefs[0]}"`;
  assert.ok(leadHtml.includes(marker), marker);
  assert.match(leadHtml, /APD release, Nov\. 17, 2025/);
  assert.match(leadHtml, /KXAN 2025 homicide map/);
  assert.doesNotMatch(leadHtml, /Sources:\s*Source/);
  assert.doesNotMatch(leadHtml, /class="num"/);
  assert.doesNotMatch(leadHtml, /lead-photo/);
}

test("the homepage lead is headline, dek, then source", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const lead = html.match(/<section class="front-lead"[\s\S]*?<\/section>/)?.[0] ?? "";
  const h1 = lead.indexOf("<h1");
  const dek = lead.indexOf('class="front-deck"');
  const source = lead.indexOf('class="src front-sources"');
  assert.ok(h1 !== -1 && dek > h1 && source > dek, lead.slice(0, 400));
  assert.equal(lead.includes("lead-photo"), false);
  assert.doesNotMatch(lead, /results-button/);
  assert.doesNotMatch(lead, /CHART · NOT A PHOTOGRAPH/);
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
  assert.match(html, /Austin&#39;s 48th homicide of 2026 came a week before 2025&#39;s\./);
  assert.match(html, /class="wordmark"/);
  assert.match(html, /class="masthead-dateline"/);
  assert.doesNotMatch(html, /ill-masthead|masthead-sky|austin-skyline/);
  assert.doesNotMatch(html, /parking-311\.webp/);
  assert.doesNotMatch(html, /p-courthouse\.jpg/);
  assert.doesNotMatch(html, /election-results\.webp/);
  assert.doesNotMatch(html, /lead-photo/);
  assert.match(html, /Circle K at 3909 Guadalupe St\./);
  assertLeadComparisonSources(html);
  const imageUrl = "https://theaustinbulletin.com/icon-512.png";
  assert.ok(html.includes(`property="og:image" content="${imageUrl}"`));
  assert.ok(html.includes(`name="twitter:image" content="${imageUrl}"`));
  assert.match(html, /property="og:title" content="Austin&#39;s 48th homicide/);
  assert.match(
    html,
    /property="og:description" content="Austin police are investigating Thursday/
  );
  assert.match(html, /name="twitter:title" content="Austin&#39;s 48th homicide/);
  assert.match(html, /Saturday, Nov\. 7/);
  assert.match(html, /href="\/2026\/11\/06\/"/);
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
  assert.match(page, /How this site is made/);
  assert.match(page, /class="ai-disclosure"/);
  assert.match(page, /<a href="\/about\/#trust">An AI system produces this site\.<\/a>/);
  assert.doesNotMatch(page, /About our reporting/);
  assert.doesNotMatch(html, /About our reporting/);
  assert.match(html, /class="ai-disclosure"/);
  const lead = page.match(/<h3\b[^>]*\bid="([^"]+)"/);
  assert.ok(lead, "edition lead heading");
  assert.match(page, new RegExp(`<nav class="skim"[\\s\\S]*href="#${lead[1]}"`));
  const h1 = page.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? "";
  assert.equal(h1.includes(lead[1]), false);
  assert.doesNotMatch(page, />Results page</);
  assert.doesNotMatch(page, /November 3 election results\./);
  assert.match(page, /November 7, 2026/);
  assert.doesNotMatch(page, /p-courthouse/);
  assert.doesNotMatch(page, /parking-311\.webp/);
  assert.match(page, /class="story-share"/);
  assert.match(page, /Bruce Williams, 61/);
  assert.match(page, /3909 Guadalupe St\./);
  assert.match(page, /No charges have been filed/);
  assert.doesNotMatch(page, /December 3, 2027/);
  assert.doesNotMatch(page, /Editor notes/);
  assert.ok(page.includes(`property="og:image" content="${imageUrl}"`));
  assert.match(page, /property="og:title" content="Austin&#39;s 48th homicide/);
  assert.doesNotMatch(page, /Unifraktur|class="folio-nav"|class="edition-head"|Vol\. I/);
});
