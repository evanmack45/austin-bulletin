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
  assert.match(html, /p-courthouse\.jpg/);
  assert.match(
    html,
    /srcset="\/images\/p-courthouse-800\.jpg 800w, \/images\/p-courthouse\.jpg 1280w"/
  );
  assert.match(
    html,
    /sizes="\(max-width: 760px\) calc\(100vw - 32px\), 1280px"/
  );
  assert.match(html, /width="1280" height="853"[^>]*loading="eager" fetchpriority="high"/);
  assert.match(html, /Travis County Courthouse, 2011/);
  assert.match(html, /Larry D\. Moore, CC BY 4\.0, via Wikimedia Commons/);
  assert.match(html, /Tuesday, Nov\. 3/);
  assert.match(html, /Nov\. 16/);
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
  assert.match(page, /In 60 seconds/);
  const lead = page.match(/<h3\b[^>]*\bid="([^"]+)"/);
  assert.ok(lead, "edition lead heading");
  assert.match(page, new RegExp(`<nav class="skim"[\\s\\S]*href="#${lead[1]}"`));
  const h1 = page.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? "";
  assert.equal(h1.includes(lead[1]), false);
  assert.match(page, />Results page</);
  assert.doesNotMatch(page, /November 3 election results\./);
  assert.match(page, /November 3, 2026/);
  assert.doesNotMatch(page, /Unifraktur|class="folio-nav"|class="edition-head"|Vol\. I/);
});
