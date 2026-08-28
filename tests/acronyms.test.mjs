import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAcronyms } from "../scripts/acronyms.mjs";

const DICT = {
  ERCOT: "Electric Reliability Council of Texas",
  ISD: "Independent School District"
};

test("fails an initialism used with no expansion", () => {
  const { problems } = checkAcronyms("ERCOT expects enough to go around.", DICT);
  assert.ok(problems.some((p) => /ERCOT/.test(p.message)));
});

test("passes when the expansion sits beside first use", () => {
  const text = "The Electric Reliability Council of Texas (ERCOT) expects enough. ERCOT said so again.";
  const { problems } = checkAcronyms(text, DICT);
  assert.equal(problems.length, 0);
});

test("ignores initialisms that only appear as attribution", () => {
  const text = 'Council voted Thursday. <span class="src">KXAN</span>';
  const { warnings } = checkAcronyms(text, DICT);
  assert.ok(!warnings.some((w) => /KXAN/.test(w.message)));
});

test("warns on an unknown all-caps token in body text", () => {
  const { warnings } = checkAcronyms("The LCRA released water.", DICT);
  assert.ok(warnings.some((w) => /LCRA/.test(w.message)));
});

test("does not warn on allowlisted everyday abbreviations", () => {
  const { warnings } = checkAcronyms("The CEO said the AI system uses US data.", DICT);
  assert.equal(warnings.length, 0);
});

// --- Additional coverage: attribution stripping must actually run, not just
// rely on outlet names already being in IGNORE. WFAA is a real outlet
// (Dallas) that is deliberately NOT in IGNORE or the dict, so this only
// passes if the <span class="src"> stripping itself removes it.
test("strips <span class=\"src\"> attribution before warning on unknown tokens", () => {
  const text = 'Neighbors met Tuesday night. <span class="src">WFAA</span>';
  const { warnings } = checkAcronyms(text, DICT);
  assert.ok(!warnings.some((w) => /WFAA/.test(w.message)));
});

test("strips figcaption attribution before warning on unknown tokens", () => {
  const text = 'Neighbors met Tuesday night. <figcaption>Photo via WFAA</figcaption>';
  const { warnings } = checkAcronyms(text, DICT);
  assert.ok(!warnings.some((w) => /WFAA/.test(w.message)));
});

test("strips source-line paragraphs before warning on unknown tokens", () => {
  const text = 'Neighbors met Tuesday night. <p class="source-line">Source: WFAA</p>';
  const { warnings } = checkAcronyms(text, DICT);
  assert.ok(!warnings.some((w) => /WFAA/.test(w.message)));
});

// --- Additional coverage: the proximity window must not be so wide that an
// expansion appearing much later in the document satisfies "first use."
test("flags an initialism whose expansion arrives ~500 characters later as not expanded on first use", () => {
  const filler = "x".repeat(500);
  const text = `ERCOT expects enough to go around. ${filler} Electric Reliability Council of Texas.`;
  const { problems } = checkAcronyms(text, DICT);
  assert.ok(problems.some((p) => /ERCOT/.test(p.message)));
});
