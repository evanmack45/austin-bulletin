// Integration test for the date gate in scripts/check.mjs.
//
// Everything else in tests/ exercises river.mjs and acronyms.mjs directly,
// but nothing asserts check.mjs's own newShape gate. Without this, a bad
// merge that flipped one of the four newShape/!newShape conditions would
// still pass `npm test` and CI (CI's bulletin-check step only checks
// bulletins added or modified in a PR, and every published edition predates
// the cutover) — the bug would only surface live at 6:07 a.m.
//
// This runs the real checker as a subprocess against a temporary fixture
// dated 2099-01-01, unambiguously post-cutover and obviously synthetic if it
// ever leaks. It must not use 2026-08-29: the live cloud routine writes that
// file for real, and a crash-leaked fixture must not collide with it.
//
// Fixtures live in a per-test os.tmpdir() directory, passed to check.mjs via
// its --dir flag — never in src/bulletins/. That directory is the live
// content Eleventy scans on every build; earlier versions of this suite
// wrote and deleted fixtures there directly, and a build running
// concurrently with the tests could glob a fixture mid-run or 404 on one
// this suite had just deleted (an ENOENT was reproduced this way against
// 2099-01-02.md). A temp directory makes that collision structurally
// impossible instead of merely unlikely.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const checkScript = path.join(repoRoot, "scripts", "check.mjs");
const liveBulletinDir = path.join(repoRoot, "src", "bulletins");

const FIXTURE_DATE = "2099-01-01";

async function runCheck(date, dir) {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [checkScript, date, "--no-links", "--dir", dir],
      { cwd: repoRoot }
    );
    return { code: 0, output: `${stdout}\n${stderr}` };
  } catch (err) {
    // execFile rejects on a non-zero exit code; the error still carries
    // stdout/stderr and the numeric exit code.
    return { code: err.code ?? 1, output: `${err.stdout || ""}\n${err.stderr || ""}` };
  }
}

// A fixture copied verbatim from a real edition carries that edition's real
// date/permalink in its front matter. Rewriting just these two front-matter
// lines to the fixture's own synthetic date keeps a temp-dir fixture
// self-consistently synthetic. Deliberately not a full YAML parse — front
// matter here is always flat `key: value` lines, and the body (River, cards,
// video shortcodes) must be left untouched since the test depends on its
// content.
function withSyntheticFrontMatter(body, date) {
  const [, y, m, d] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const permalink = `/${y}/${m}/${d}/`;
  return body
    .replace(/^date:\s*.*$/m, `date: ${date}`)
    .replace(/^permalink:\s*.*$/m, `permalink: "${permalink}"`);
}

async function withTempDir(run) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "bulletin-gate-"));
  try {
    await run(tmpDir);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

test("a post-cutover edition fails under the new rules, not the old ones", async () => {
  await withTempDir(async (tmpDir) => {
    // Known to fail the new rules many ways and pass the old ones — see
    // task-5-report.md for the full breakdown at its real date.
    const body = await readFile(path.join(liveBulletinDir, "2026-08-28.md"), "utf8");
    await writeFile(path.join(tmpDir, `${FIXTURE_DATE}.md`), withSyntheticFrontMatter(body, FIXTURE_DATE), "utf8");

    const { code, output } = await runCheck(FIXTURE_DATE, tmpDir);

    assert.notEqual(code, 0, "expected the checker to fail a post-cutover edition");
    assert.match(output, /brief is \d+ words \(cap \d+\)/, "expected the new brief-length cap to fire");
    assert.match(output, /voice card/, "expected the new visual-budget check to fire");
    assert.match(
      output,
      /is used before its expansion/,
      "expected the new acronym-expansion check to fire"
    );
    assert.doesNotMatch(
      output,
      /cap 100\)/,
      "the old per-item 100-word cap must not run post-cutover"
    );
    assert.doesNotMatch(
      output,
      /wants 25–40/,
      "the old 25–40 item-count check must not run post-cutover"
    );
  });
});

test("a pre-cutover edition still runs under the old rules only", async () => {
  await withTempDir(async (tmpDir) => {
    // Copied verbatim, same date — this edition is already pre-cutover, so
    // no front-matter rewrite is needed. Copying it into the temp dir (
    // rather than pointing --dir at src/bulletins/ for just this one test)
    // keeps every test in this file off the live directory, with no
    // exceptions to remember.
    const body = await readFile(path.join(liveBulletinDir, "2026-08-28.md"), "utf8");
    await writeFile(path.join(tmpDir, "2026-08-28.md"), body, "utf8");

    const { code } = await runCheck("2026-08-28", tmpDir);
    assert.equal(code, 0, "the real 2026-08-28 edition should still pass the mechanical gate");
  });
});

test("the old numeric rules do not leak into a post-cutover edition", async () => {
  // 2026-08-28 satisfies the old per-item word cap and item-count range
  // already, so gating those two checks the wrong way is invisible against
  // it — a mutation check confirmed this. 2026-08-24 actually violates both
  // (see task-5-report.md: two items over 100 words, only 23 items), so if
  // the gate ever let the old checks run post-cutover, this fixture would
  // still trip them and this test would catch it.
  await withTempDir(async (tmpDir) => {
    const fixtureDate = "2099-01-02";
    const body = await readFile(path.join(liveBulletinDir, "2026-08-24.md"), "utf8");
    await writeFile(path.join(tmpDir, `${fixtureDate}.md`), withSyntheticFrontMatter(body, fixtureDate), "utf8");

    const { output } = await runCheck(fixtureDate, tmpDir);

    // The old cap ("item is N words (cap 100)") is worded differently from
    // checkRiver's own brief-length cap ("brief is N words (cap 35)"), so its
    // absence is an unambiguous signal the old check did not run.
    assert.doesNotMatch(
      output,
      /cap 100\)/,
      "the old per-item 100-word cap must not run post-cutover"
    );

    // The old item-count check and checkRiver's own itemsMin/itemsMax check
    // share the same 25-40 bounds and therefore emit byte-identical text
    // ("N items, EDITORIAL wants 25–40") — its mere presence does not prove
    // a leak, since checkRiver is supposed to report it too. What proves a
    // leak is a DUPLICATE: if both the old check and checkRiver fired, the
    // line would appear twice.
    const occurrences = output.match(/\d+ items, EDITORIAL wants 25–40/g) || [];
    assert.equal(
      occurrences.length,
      1,
      `expected exactly one item-count message (from checkRiver only), got ${occurrences.length}: ${occurrences.join(" | ")}`
    );
  });
});
