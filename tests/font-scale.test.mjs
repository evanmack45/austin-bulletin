import { test } from "node:test";
import assert from "node:assert/strict";
import { pxFontSizeViolations, repoPxFontSizeViolations } from "../scripts/check-font-scale.mjs";

test("px font-size and a px font shorthand fail", () => {
  const css = [
    "a { font-size: 16px; }",
    "b { font: 700 16px/1 Georgia, serif; }"
  ].join("\n");
  const found = pxFontSizeViolations(css);
  assert.equal(found.length, 2);
  assert.equal(found[0].property, "font-size");
  assert.equal(found[1].property, "font");
});

test("rem, em, and clamp bounds in rem pass", () => {
  const css = [
    "a { font-size: 1rem; }",
    "b { font-size: clamp(2rem, 5vw, 3.1rem); }",
    "c { font: 700 1rem/1.3 Hanken, sans-serif; }",
    "d { font-size: 0.82em; }",
    "e { font: inherit; }"
  ].join("\n");
  assert.deepEqual(pxFontSizeViolations(css), []);
});

test("a px bound inside clamp fails", () => {
  const css = "a { font-size: clamp(16px, 4vw, 2rem); }";
  assert.equal(pxFontSizeViolations(css).length, 1);
});

test("comments do not count as declarations", () => {
  const css = "/* font-size: 16px */\na { font-size: 1rem; }";
  assert.deepEqual(pxFontSizeViolations(css), []);
});

test("an allow-list entry permits one exact value", () => {
  const css = "a { font-size: 16px; }\nb { font-size: 13px; }";
  const found = pxFontSizeViolations(css, ["16px"]);
  assert.equal(found.length, 1);
  assert.equal(found[0].value, "13px");
});

test("authored stylesheets declare no px font-size", () => {
  assert.deepEqual(repoPxFontSizeViolations(), []);
});
