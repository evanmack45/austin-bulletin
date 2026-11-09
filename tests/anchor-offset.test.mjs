import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { wrapRiverStories } from "../scripts/edition-chrome.mjs";

const style = readFileSync("src/css/style.css", "utf8");
const cover = readFileSync("src/css/front-cover.css", "utf8");

test("in-page anchors keep 16px of breathing room", () => {
  assert.match(style, /--anchor-breathing-room:\s*16px/);
  const rule = style.match(
    /:where\(h1, h2, h3, h4, h5, h6, p, figure, li\)\[id\] \{[^}]*\}/
  )?.[0] ?? "";
  assert.match(rule, /scroll-margin-top:\s*var\(--anchor-breathing-room\)/);
});

test("wide editions pair story runs and center a single column at 44rem", () => {
  assert.match(cover, /@media \(min-width:\s*1024px\)/);
  const grid = cover.match(/\.river--pair \{[^}]*\}/)?.[0] ?? "";
  assert.match(grid, /display:\s*grid/);
  assert.match(grid, /grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\)/);
  assert.match(grid, /column-gap:\s*24px/);
  assert.match(grid, /row-gap:\s*24px/);
  const centered = cover.match(/\.river--measure,[\s\S]*?\{[^}]*\}/)?.[0] ?? "";
  assert.match(centered, /max-width:\s*44rem/);
  assert.match(centered, /margin-inline:\s*auto/);
});

test("river stories stay with their headline and full-width breaks stay outside", () => {
  const html = [
    '<div class="river river--tiered">',
    '<nav class="beat-nav"><a href="#hall">Hall</a></nav>',
    '<h4 id="hall">Hall</h4>',
    '<h5 id="one">One</h5><div class="story-share"></div><p>First.</p>',
    '<section class="signup signup--edition">Mail</section>',
    '<h3 id="two">Two</h3><p>Second.</p>',
    '<p class="to-top"><a href="#top">Back to top</a></p>',
    '<p class="source-line">Sources: <a href="https://example.com">City</a></p>',
    "</div>"
  ].join("");
  const wrapped = wrapRiverStories(html);
  assert.match(wrapped, /<div class="river-story"><h5 id="one">/);
  assert.match(wrapped, /<p>First\.<\/p><\/div>/);
  assert.match(wrapped, /<div class="river-story"><h3 id="two">/);
  assert.match(wrapped, /<p>Second\.<\/p><p class="source-line">/);
  assert.match(wrapped, /<\/p><\/div><p class="to-top">/);
  assert.match(wrapped, /<\/nav><h4 id="hall">Hall<\/h4><div class="river-story">/);
  assert.match(wrapped, /class="river river--tiered river--pair"/);
  assert.ok(wrapped.indexOf('class="signup') < wrapped.indexOf('id="two"'));
  assert.match(wrapped, /<\/div><p class="to-top">/);
  assert.equal(wrapRiverStories(wrapped), wrapped);
  const paired = wrapRiverStories(
    '<div class="river"><h5 id="a">A</h5><p>One.</p><h5 id="b">B</h5><p>Two.</p></div>'
  );
  assert.match(paired, /class="river river--pair"/);
  assert.equal(wrapRiverStories(paired), paired);
  assert.equal(wrapRiverStories("<p>No river.</p>"), "<p>No river.</p>");
});
