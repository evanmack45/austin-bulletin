import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the homepage is one lead, and dated editions keep their own page", () => {
  const html = readFileSync("_site/index.html", "utf8");
  for (const text of [
    "/css/front-cover.css",
    "class=\"front-lead\"",
    "This week",
    "class=\"front-action\""
  ]) assert.ok(html.includes(text), text);
  assert.match(html, /Get the morning email\./);
  assert.doesNotMatch(html, /5 minutes|One email each morning/);
  assert.match(html, /class="results-button"/);
  assert.equal((html.match(/>Election results</g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /class="wordmark"/);
  assert.match(html, /class="masthead-dateline"/);
  assert.doesNotMatch(html, /ill-masthead|masthead-sky|austin-skyline/);
  assert.match(html, /election-results\.webp/);
  assert.doesNotMatch(html, /p-courthouse\.jpg/);
  const srcset = "/images/2026-11-04/election-results-800.webp 800w, " +
    "/images/2026-11-04/election-results.webp 1280w";
  assert.ok(html.includes(`srcset="${srcset}"`));
  assert.match(
    html,
    /sizes="\(max-width: 760px\) calc\(100vw - 32px\), 1280px"/
  );
  assert.match(html, /width="1280" height="1080"/);
  assert.match(html, /loading="eager"/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /Not a photograph/);
  assert.match(html, /Travis County unofficial results/);
  assert.match(html, /creativecommons\.org\/publicdomain\/zero\/1\.0/);
  const imageUrl = "https://theaustinbulletin.com/images/2026-11-04/election-results.webp";
  assert.ok(html.includes(`property="og:image" content="${imageUrl}"`));
  assert.ok(html.includes(`name="twitter:image" content="${imageUrl}"`));
  assert.match(html, /property="og:title" content="Austin approves parks and library bonds/);
  assert.match(html, /property="og:description" content="Both city bond measures are passing/);
  assert.match(html, /Wednesday, Nov\. 4/);
  assert.match(html, /Nov\. 5/);
  assert.doesNotMatch(html, /If you (haven't|want|live|are)\b/);
  assert.doesNotMatch(html, /\bhousing\b/i);
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
  assert.match(page, />Results page</);
  assert.doesNotMatch(page, /November 3 election results\./);
  assert.match(page, /November 4, 2026/);
  assert.doesNotMatch(page, /p-courthouse/);
  assert.match(page, /election-results\.webp/);
  assert.match(page, /fetchpriority="high"/);
  assert.ok(page.includes(`property="og:image" content="${imageUrl}"`));
  assert.doesNotMatch(page, /Unifraktur|class="folio-nav"|class="edition-head"|Vol\. I/);
});
