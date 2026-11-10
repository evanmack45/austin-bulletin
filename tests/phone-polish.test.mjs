import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const STRIP = [
  ".cover-chrome .masthead-strip .wordmark,",
  ".cover-chrome .masthead-strip .masthead-dateline a,",
  ".cover-chrome .masthead-strip .site-menu-button"
].join("\\s*");

test("home and edition mastheads share one strip rule", () => {
  const home = readFileSync("_site/index.html", "utf8");
  const edition = readFileSync("_site/2026/11/10/index.html", "utf8");
  const older = readFileSync("_site/2026/11/09/index.html", "utf8");
  for (const html of [home, edition, older]) {
    assert.match(html, /<header class="front-masthead masthead-strip">/);
  }
  const css = readFileSync("src/css/front-cover.css", "utf8");
  const rule = css.match(new RegExp(`${STRIP}\\s*\\{[^}]*\\}`));
  assert.ok(rule, "shared masthead rule");
  assert.match(rule[0], /min-height:\s*48px/);
  assert.doesNotMatch(rule[0], /\.home-front|\.edition-page/);
});

test("older editions render edition cards", () => {
  for (const route of ["2026/11/09", "2026/11/05"]) {
    const page = readFileSync(`_site/${route}/index.html`, "utf8");
    assert.match(page, /<body[^>]*\bedition-cards\b/);
    assert.match(page, /class="edition-wrap"/);
    assert.match(page, /<article class="card/);
    assert.doesNotMatch(page, /<nav class="skim"/);
    assert.doesNotMatch(page, /Today's items/);
  }
});
