import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const STRIP = [
  ".cover-chrome .masthead-strip .wordmark,",
  ".cover-chrome .masthead-strip .masthead-dateline a"
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
  assert.doesNotMatch(rule[0], /\.home-front|\.edition-page|\.site-menu-button/);
});

test("phone menu is one text link and its tap target does not stretch the strip", () => {
  const css = readFileSync("src/css/front-cover.css", "utf8");
  const menuRule = [
    "\\.cover-chrome \\.masthead-strip\\.front-masthead",
    " \\.site-menu-button \\{([^}]*)\\}"
  ].join("");
  const rule = css.match(new RegExp(`@media \\(max-width: 640px\\) \\{[\\s\\S]*?${menuRule}`));
  assert.ok(rule, "shared phone menu rule");
  assert.match(rule[1], /border:\s*0/);
  assert.match(rule[1], /text-decoration:\s*underline/);
  assert.match(rule[1], /font-family:\s*var\(--font-display\)/);
  assert.match(rule[1], /padding:\s*0\.625rem 0\.15rem/);
  assert.match(rule[1], /margin-block:\s*-0\.625rem/);
  assert.match(rule[1], /min-height:\s*44px/);
  assert.doesNotMatch(rule[1], /48px|\.home-front|\.edition-page/);
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
