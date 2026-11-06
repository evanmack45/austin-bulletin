import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const STYLE = "src/css/style.css";
const COVER = "src/css/front-cover.css";

const SENTENCE = [
  [STYLE, ".edition-kicker"],
  [STYLE, "h1.edition-kicker"],
  [STYLE, ".skim h2"],
  [STYLE, ".morning-note::before"],
  [STYLE, "h2"],
  [STYLE, ".briefing-meta"],
  [STYLE, ".source-line"],
  [STYLE, "#in-brief + ul strong"],
  [STYLE, "h2.glance-title"],
  [STYLE, ".g-label"],
  [STYLE, ".whats-next strong"],
  [STYLE, ".voice-kind"],
  [STYLE, ".voice-meta"],
  [STYLE, ".voice-foot"],
  [STYLE, ".river h4"],
  [STYLE, ".date-tag"],
  [STYLE, ".river--tiered .brief-slug"],
  [STYLE, ".src"],
  [STYLE, ".standings th"],
  [STYLE, ".the-number::before"],
  [STYLE, ".countdown::before"],
  [STYLE, ".countdown"],
  [STYLE, ".good-thing::before"],
  [STYLE, "h2#the-river"],
  [STYLE, "h2#city-desk"],
  [STYLE, "h2#weather"],
  [STYLE, "h2#the-back-page"],
  [STYLE, ".beat-nav"],
  [STYLE, ".to-top"],
  [STYLE, ".home-front .front-kicker"],
  [STYLE, ".home-front .front-section-label"],
  [STYLE, ".archive-page h2"],
  [COVER, ".cover-chrome .front-masthead .masthead-dateline"],
  [COVER, ".home-front .edited-front .today-top-label"],
  [COVER, ".kicker"],
  [COVER, ".home-front h2.kicker"]
];

const HEADS = [
  [STYLE, "h2"],
  [STYLE, ".skim h2"],
  [STYLE, "h2.glance-title"],
  [STYLE, ".river h4"],
  [STYLE, "h2#the-river"],
  [STYLE, "h2#city-desk"],
  [STYLE, "h2#weather"],
  [STYLE, "h2#the-back-page"],
  [STYLE, ".archive-page h2"],
  [STYLE, ".home-front .front-section-label"],
  [COVER, ".home-front .front-section-head"]
];

function stripped(file) {
  return readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

function declarations(source, selector) {
  const found = [];
  const re = /([^{}@]+)\{([^{}]*)\}/g;
  let match = re.exec(source);
  while (match) {
    const selectors = match[1].split(",").map((part) => part.replace(/\s+/g, " ").trim());
    if (selectors.includes(selector)) found.push(match[2]);
    match = re.exec(source);
  }
  return found.join("\n");
}

test("reader stylesheets do not force uppercase chrome", () => {
  for (const file of [STYLE, COVER]) {
    assert.doesNotMatch(stripped(file), /text-transform:\s*uppercase/i, file);
  }
});

test("kicker and label rules stay sentence case without tracking", () => {
  for (const [file, selector] of SENTENCE) {
    const body = declarations(stripped(file), selector);
    assert.notEqual(body, "", `missing ${selector}`);
    assert.match(body, /text-transform:\s*none/, selector);
    assert.doesNotMatch(body, /letter-spacing:\s*0?\.[0-9]+em/, selector);
  }
});

test("section names use a 30px desktop and 24px phone head", () => {
  const style = stripped(STYLE);
  const desktop = style.match(/:root\s*\{[^}]*\}/);
  assert.ok(desktop, "root tokens");
  assert.match(desktop[0], /--section-head-size:\s*1\.875rem/);
  assert.doesNotMatch(desktop[0], /1\.5rem/);
  assert.match(
    style,
    /@media \(max-width:\s*760px\)\s*\{\s*:root\s*\{\s*--section-head-size:\s*1\.5rem;\s*\}/
  );
  for (const [file, selector] of HEADS) {
    const body = declarations(stripped(file), selector);
    assert.match(body, /font-size:\s*var\(--section-head-size\)/, selector);
    assert.doesNotMatch(body, /text-indent/, selector);
  }
});
