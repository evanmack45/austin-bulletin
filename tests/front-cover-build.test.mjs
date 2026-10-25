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
