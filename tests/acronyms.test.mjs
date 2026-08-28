import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAcronyms } from "../scripts/acronyms.mjs";

const DICT = {
  ERCOT: "Electric Reliability Council of Texas",
  ISD: "Independent School District",
  AISD: "Austin Independent School District"
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

// Pins the right bound's actual extent: the abbreviation-first form
// ("ERCOT (Electric Reliability Council of Texas)") must also pass — the
// expansion sits within 140 characters AFTER first use, not before it, so
// this only passes if the right bound still reaches past the token itself.
test("passes when the abbreviation appears first and the expansion follows immediately", () => {
  const text = "ERCOT (Electric Reliability Council of Texas) expects enough to go around.";
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

// --- Additional coverage: spec 3.3 says first use is anywhere in the
// edition — the expansion may come well before the initialism (e.g. spelled
// out in the Big Story, then abbreviated later in the River). The left side
// of the window must therefore be unbounded: a real-writing case like this
// must NOT be flagged.
test("does not flag an initialism whose expansion appeared ~500 characters earlier", () => {
  const filler = "x".repeat(500);
  const text = `The Electric Reliability Council of Texas said reserves were adequate. ${filler} ERCOT expects enough to go around.`;
  const { problems } = checkAcronyms(text, DICT);
  assert.equal(problems.length, 0);
});

// --- Additional coverage: the proximity window must not be so wide on the
// right that an expansion appearing much later in the document satisfies
// "first use." (This also pins the 140-character right bound: widening it
// to something like 10000 would let this pass incorrectly.)
test("flags an initialism whose expansion arrives ~500 characters later as not expanded on first use", () => {
  const filler = "x".repeat(500);
  const text = `ERCOT expects enough to go around. ${filler} Electric Reliability Council of Texas.`;
  const { problems } = checkAcronyms(text, DICT);
  assert.ok(problems.some((p) => /ERCOT/.test(p.message)));
});

// --- Additional coverage: word-boundary fix (fix round 2). The problems
// loop used to do a raw substring search, so "AISD" would falsely trip the
// "ISD" dictionary entry (indexOf finds "ISD" inside "AISD") and report a
// token the writer never wrote. It must now be word-boundary aware, matching
// the warnings loop's \b[A-Z]{2,5}\b behavior.
test("does not raise an ISD problem when the text only contains AISD", () => {
  const text = "AISD said campuses would stay closed through Friday for storm cleanup across every affected building.";
  const { problems } = checkAcronyms(text, DICT);
  assert.ok(!problems.some((p) => p.message.includes('"ISD" is used')));
});

test("raises an ISD problem for a standalone \"Austin ISD\" token", () => {
  const text = "Austin ISD said campuses would reopen Monday after storm cleanup finished ahead of schedule.";
  const { problems } = checkAcronyms(text, DICT);
  assert.ok(problems.some((p) => p.message.includes('"ISD" is used')));
});

test("passes when AISD's own expansion sits beside it", () => {
  const text = "The Austin Independent School District (AISD) said campuses would reopen Monday.";
  const { problems } = checkAcronyms(text, DICT);
  assert.equal(problems.length, 0);
});

test("still finds ESD as a standalone token", () => {
  const dict = { ESD: "Emergency Services District" };
  const { problems } = checkAcronyms("ESD 5 responded to the call.", dict);
  assert.ok(problems.some((p) => p.message.includes('"ESD" is used')));
});

test("still finds mixed-case dictionary keys like MoPac and TxDOT", () => {
  const dict = { MoPac: "Loop 1", TxDOT: "Texas Department of Transportation" };
  const { problems } = checkAcronyms("MoPac and TxDOT crews cleared the debris.", dict);
  assert.ok(problems.some((p) => p.message.includes('"MoPac" is used')));
  assert.ok(problems.some((p) => p.message.includes('"TxDOT" is used')));
});

// --- Additional coverage: IGNORE list expansion (fix round 2). Texas road
// designators are not the local jargon this check exists to catch.
test("does not warn on Texas road designators", () => {
  const text = "Drivers used SH 130, FM 1626, and CR 280 to avoid the closure.";
  const { warnings } = checkAcronyms(text, DICT);
  assert.equal(warnings.length, 0);
});

// --- Additional coverage (final review, I6): brand names like Flock and
// Axon are mixed-case, so the unknown-token scan (\b[A-Z]{2,5}\b) structurally
// cannot see them — it only matches all-caps tokens. Adding a mixed-case key
// to the dictionary must still enforce expansion through the "problems" loop,
// which matches on the literal key, not the warnings scan.
test("catches a mixed-case dictionary key like Flock when unexpanded", () => {
  const dict = { Flock: "Flock Safety" };
  const { problems } = checkAcronyms("Flock cameras lined the street.", dict);
  assert.ok(problems.some((p) => p.message.includes('"Flock" is used')));
});

test("passes when a mixed-case dictionary key like Flock is expanded beside first use", () => {
  const dict = { Flock: "Flock Safety" };
  const { problems } = checkAcronyms("Flock Safety cameras lined the street.", dict);
  assert.equal(problems.length, 0);
});
