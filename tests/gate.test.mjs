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
  return runCheckArgs([date, "--no-links", "--dir", dir]);
}

// Like runCheck, but takes the raw argv instead of assuming the (date,
// --no-links, --dir, dir) shape — needed to exercise malformed --dir
// invocations where --dir is missing its value or is followed by another
// flag instead of a path.
async function runCheckArgs(args) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [checkScript, ...args], {
      cwd: repoRoot,
    });
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
    await writeFile(
      path.join(tmpDir, `${FIXTURE_DATE}.md`),
      withSyntheticFrontMatter(body, FIXTURE_DATE),
      "utf8"
    );

    const { code, output } = await runCheck(FIXTURE_DATE, tmpDir);

    assert.notEqual(code, 0, "expected the checker to fail a post-cutover edition");
    assert.match(
      output,
      /brief is \d+ words \(cap \d+\)/,
      "expected the new brief-length cap to fire"
    );
    assert.match(output, /voice card/, "expected the new visual-budget check to fire");
    assert.match(
      output,
      /is used before its expansion/,
      "expected the new acronym-expansion check to fire"
    );
    // The old-shape Big Story (~650 words, no in-page links) must be judged
    // by The Briefing rules post-cutover, not the old 400-700 article rule.
    assert.match(output, /briefing/, "expected The Briefing checks to fire post-cutover");
    // Old-shape items carry plain source tags; post-cutover the tag must be
    // the link (Evan, 2026-08-29), so these must now be flagged.
    assert.match(output, /source tag is not linked/, "expected the linked-tag rule to fire");
    assert.doesNotMatch(
      output,
      /big story/,
      "the old Big Story checks must not run post-cutover"
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
    await writeFile(
      path.join(tmpDir, `${fixtureDate}.md`),
      withSyntheticFrontMatter(body, fixtureDate),
      "utf8"
    );

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
      `expected exactly one item-count message (from checkRiver only), got ` +
        `${occurrences.length}: ${occurrences.join(" | ")}`
    );
  });
});

test("--dir as the final argument fails loudly, not silently against the default dir", async () => {
  // Reproduces a Copilot review comment on PR #4: --dir with no value used to
  // fall through to the default bulletin dir (args.dir undefined) and check
  // the live src/bulletins instead of the fixture directory the caller
  // intended — a green result from production content, not the temp fixture.
  const { code, output } = await runCheckArgs(["2026-08-28", "--no-links", "--dir"]);

  assert.notEqual(code, 0, "expected a non-zero exit when --dir has no value");
  assert.match(output, /--dir/, "expected the error message to mention --dir");
  assert.doesNotMatch(
    output,
    /passes the mechanical gate/,
    "must not report success when --dir has no value"
  );
  assert.doesNotMatch(
    output,
    /\d+ problems? in 2026-08-28/,
    "must not silently fall back to checking the default directory"
  );
});

// scripts/graphic.mjs emits a real <img> inside <figure class="graphic">
// instead of Markdown image syntax (markdown-it does not process Markdown
// inside a raw HTML block, so the Markdown form rendered as literal text
// there). These four tests exercise the HTML-<img> half of the image gate
// added to cover that — a Copilot review comment on PR #4 — alongside the
// pre-existing Markdown-image half, appending a snippet to a verbatim,
// already-passing 2026-08-28 fixture so only the appended image can affect
// the result.
async function runWithAppendedSnippet(snippet) {
  let result;
  await withTempDir(async (tmpDir) => {
    const body = await readFile(path.join(liveBulletinDir, "2026-08-28.md"), "utf8");
    await writeFile(path.join(tmpDir, "2026-08-28.md"), `${body}\n\n${snippet}\n`, "utf8");
    result = await runCheck("2026-08-28", tmpDir);
  });
  return result;
}

test("an HTML <img> pointing at a missing file fails with 'file not found'", async () => {
  const { code, output } = await runWithAppendedSnippet(
    '<figure class="graphic"><img src="/images/2026-08-28/DOES-NOT-EXIST.png" ' +
      'alt="Test chart"></figure>'
  );
  assert.notEqual(code, 0, "expected the checker to fail on a missing HTML <img> file");
  assert.match(
    output,
    /file not found: src\/images\/2026-08-28\/DOES-NOT-EXIST\.png/,
    "expected the missing-file message to name the HTML image's src"
  );
});

test("an HTML <img> with empty alt text fails with the empty-alt message", async () => {
  // alt before src (reversed from the missing-file test above) — attribute
  // order must not matter — pointing at a file that genuinely exists, so
  // only the empty alt can be the failure.
  const { code, output } = await runWithAppendedSnippet(
    '<figure class="graphic"><img alt="" ' +
      'src="/images/2026-08-25/aisd-takeover-timeline.png"></figure>'
  );
  assert.notEqual(code, 0, "expected the checker to fail on an HTML <img> with empty alt");
  assert.match(
    output,
    /image has empty alt text: \/images\/2026-08-25\/aisd-takeover-timeline\.png/,
    "expected the empty-alt message to name the HTML image's src"
  );
});

test("an HTML <img> with a real file and real alt text passes", async () => {
  // Single quotes, alt before src, and an HTML-escaped alt (&quot; / &mdash;
  // — the form scripts/graphic.mjs actually emits) — the checker must treat
  // an escaped-but-non-empty alt as valid without unescaping it.
  const { code, output } = await runWithAppendedSnippet(
    "<figure class=\"graphic\"><img " +
      "alt='AISD enrollment &mdash; a timeline of &quot;takeover&quot; milestones' " +
      "src='/images/2026-08-25/aisd-takeover-timeline.png'></figure>"
  );
  assert.equal(code, 0, `expected a valid HTML <img> to pass; got: ${output}`);
});

test("the existing Markdown image check is unaffected by the new HTML <img> check", async () => {
  const { code, output } = await runWithAppendedSnippet(
    "![missing](/images/2026-08-28/DOES-NOT-EXIST.png)"
  );
  assert.notEqual(code, 0, "expected the checker to still fail a missing Markdown image");
  assert.match(
    output,
    /file not found: src\/images\/2026-08-28\/DOES-NOT-EXIST\.png/,
    "expected the pre-existing Markdown-image message to still fire"
  );
});

test("--dir followed by another flag fails loudly with the same clear message", async () => {
  // The other malformed form: --dir consumes the next flag as its value
  // (e.g. --no-links), which used to produce a confusing "no bulletin at
  // --no-links/<date>.md" and silently drop the --no-links the caller asked
  // for. --dir's value must not itself look like a flag.
  const { code, output } = await runCheckArgs(["2026-08-28", "--dir", "--no-links"]);

  assert.notEqual(code, 0, "expected a non-zero exit when --dir's value looks like a flag");
  assert.match(output, /--dir/, "expected the error message to mention --dir");
});

// EDITORIAL "Write like a person" (2026-08-29): the gate rejects phrase-level
// AI tells and trailing "-ing analysis" clauses in any edition, any date.
test("an AI-tell phrase fails the language check", async () => {
  const { code, output } = await runWithAppendedSnippet(
    'The opening stands as a testament to growth. <span class="src">KXAN</span>'
  );
  assert.notEqual(code, 0, "expected the checker to fail on an AI-tell phrase");
  assert.match(output, /AI-tell phrase/, "expected the AI-tell message to fire");
});

test('a trailing "-ing analysis" clause fails the language check', async () => {
  const { code, output } = await runWithAppendedSnippet(
    'Attendance rose to 4,000, highlighting the event\'s growing appeal. ' +
    '<span class="src">KXAN</span>'
  );
  assert.notEqual(code, 0, "expected the checker to fail on a gerund analysis clause");
  assert.match(output, /-ing analysis/, "expected the gerund-clause message to fire");
});
