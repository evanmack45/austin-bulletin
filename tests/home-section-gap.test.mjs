import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function rule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`))?.[0] ?? "";
}

test("homepage sections are 48px apart and stories stay 24px apart", () => {
  const css = readFileSync("src/css/front-cover.css", "utf8");
  const section = rule(css, ".home-front .front-section + .front-section");
  const story = rule(css, ".home-front .front-story + .front-story");
  assert.match(section, /margin-top:\s*3rem;/);
  assert.doesNotMatch(section, /padding-top:/);
  assert.match(section, /border-top:\s*1px solid var\(--rule\)/);
  assert.match(story, /margin-top:\s*1\.5rem;/);
  assert.doesNotMatch(story, /3rem|padding-top/);
});
