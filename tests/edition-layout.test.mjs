import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cover = readFileSync("src/css/front-cover.css", "utf8");
const style = readFileSync("src/css/style.css", "utf8");

function storiesBeforeSignup(html) {
  const at = html.indexOf('class="signup signup--edition"');
  assert.ok(at > 0, "edition signup");
  const before = html.slice(0, at);
  const lead = /<section\b[^>]*\bbig-story\b/.test(before) ? 1 : 0;
  return lead + (before.split('<div class="river-story"').length - 1);
}

function countdownLabelCount(html) {
  const block = html.match(/<p class="countdown"[^>]*>[\s\S]*?<\/p>/)?.[0] ?? "";
  const text = block.replace(/<[^>]+>/g, " ");
  return text.match(/Countdown/g)?.length ?? 0;
}

test("edition layout is Georgia, with one signup after story three", () => {
  const prose = cover.match(
    /\.edition-page \.big-story p,[\s\S]*?\.edition-page \.good-thing \{[^}]*\}/
  )?.[0] ?? "";
  assert.match(prose, /font-family:\s*Georgia,\s*"Times New Roman",\s*serif/);
  assert.doesNotMatch(prose, /bulletin--2026-11-08/);
  assert.match(
    cover,
    /\.edition-page \.river-story > p:not\(\.source-line\)[\s\S]*?font-size:\s*1\.125rem/
  );
  assert.match(style, /\.countdown:has\(strong\)::before\s*\{\s*content:\s*none/);
  assert.match(
    cover,
    /\.edition-page \.countdown:has\(strong\)::before[\s\S]*?content:\s*none/
  );
  assert.match(
    cover,
    /\.edition-page \.countdown:not\(:has\(strong\)\)::before\s*\{\s*content:\s*"Countdown"/
  );

  const monday = readFileSync("_site/2026/11/09/index.html", "utf8");
  assert.equal(monday.split('class="signup signup--edition"').length - 1, 1);
  assert.equal(storiesBeforeSignup(monday), 3);
  assert.equal(countdownLabelCount(monday), 1);
  assert.doesNotMatch(monday, /Countdown\.\s*Countdown/);
  const mondayNumber = monday.match(/<aside class="the-number">[\s\S]*?<\/aside>/)?.[0] ?? "";
  assert.match(mondayNumber, /<strong>9:00 a\.m\.<\/strong>/);
  assert.equal(mondayNumber.includes("The Number"), false);

  const sunday = readFileSync("_site/2026/11/08/index.html", "utf8");
  assert.equal(storiesBeforeSignup(sunday), 3);
  assert.equal(countdownLabelCount(sunday), 1);

  const friday = readFileSync("_site/2026/11/06/index.html", "utf8");
  assert.equal(storiesBeforeSignup(friday), 3);
  assert.equal(countdownLabelCount(friday), 0);
  assert.match(
    friday,
    /<p class="countdown">The Veterans Day parade starts at 9 a\.m\. Saturday\.<\/p>/
  );
});
