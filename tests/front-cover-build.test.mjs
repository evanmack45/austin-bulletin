import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the homepage is one lead, and dated editions keep their own page", () => {
  const html = readFileSync("_site/index.html", "utf8");
  for (const text of [
    "/css/front-cover.css",
    "class=\"front-lead\"",
    "Before it closes",
    "This week",
    "class=\"front-action\"",
    "Austin in 5 minutes, every morning. Free."
  ]) assert.ok(html.includes(text), text);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /ill-masthead-v2\.jpg/);
  assert.match(html, /alt="Illustration"/);
  assert.match(html, /p-courthouse\.jpg/);
  assert.match(html, /Travis County Courthouse, 2011/);
  assert.match(html, /Larry D\. Moore, CC BY 4\.0, via Wikimedia Commons/);
  assert.match(html, /ill-before-it-closes\.jpg/);
  assert.match(html, /Tuesday, Oct\. 27/);
  assert.match(html, /30\.62%/);
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
  assert.match(page, /class="edition-lead-title"/);
  assert.doesNotMatch(page, /Unifraktur|class="folio-nav"|class="edition-head"|Vol\. I/);
});
