// RENDER-LEVEL regression test for scripts/graphic.mjs's output.
//
// The previous review round wrapped graphic.mjs's output in
// <figure class="graphic"> so the gate (scripts/check.mjs / river.mjs)
// could tell an original graphic apart from a bare photo, but kept the
// image itself as `![alt](path)` — Markdown image syntax — inside that
// figure. markdown-it treats a block that OPENS with a block-level HTML
// tag as a raw HTML block and does not process Markdown inside it, so the
// `![alt](path)` line rendered as literal text, never an <img>. The gate
// still counted it as a satisfied graphic requirement (it only checks the
// figure wrapper, not the rendered page), so this shipped invisibly: every
// generated chart, timeline and map would have appeared to readers as raw
// Markdown source.
//
// tests/gate.test.mjs caught the *gate* counting the graphic; nothing
// caught the *page* failing to render it, because nothing here had ever
// built the page. This test does: it runs the real `node scripts/graphic.mjs`
// to produce the actual current output (not a hand-typed stand-in), embeds
// it verbatim in a fixture bulletin, runs the real Eleventy build, and
// checks the built HTML for a real <img> and the absence of any literal
// "![" — so a regression back to Markdown image syntax fails here, at
// render time, the way it should have the first time.
//
// Everything lives in a temporary directory copied from the real `src/`,
// the same isolation gate.test.mjs uses — never src/bulletins/ itself,
// which is the live content a concurrent build could glob or 404 on.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const graphicScript = path.join(repoRoot, "scripts", "graphic.mjs");
const eleventyBin = path.join(repoRoot, "node_modules", ".bin", "eleventy");
const eleventyConfig = path.join(repoRoot, "eleventy.config.js");

// Obviously synthetic and far from any real edition or gate.test.mjs's own
// fixture dates (2099-01-01, 2099-01-02), so a crash-leaked fixture can
// never collide with live content or another suite's temp fixture.
const FIXTURE_DATE = "2099-01-03";
const FIXTURE_SLUG = "test-chart";

const SPEC = {
  type: "bars",
  date: FIXTURE_DATE,
  slug: FIXTURE_SLUG,
  // Deliberately loaded with the punctuation the real alt text in
  // src/bulletins/2026-08-28.md carries (colons, semicolons, commas,
  // quotes) plus HTML-significant characters, so the test also proves the
  // alt attribute is actually escaped, not just present.
  alt: 'Storms, outages: 7,000 customers; officials said "restored" & <safe> now',
  source: "Test source & Co.",
  title: "Test Chart",
  unit: "",
  bars: [
    { label: "A", value: 1 },
    { label: "B", value: 2 }
  ]
};

async function withTempSite(run) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "bulletin-graphic-render-"));
  try {
    await cp(path.join(repoRoot, "src"), path.join(tmpDir, "src"), { recursive: true });
    await rm(path.join(tmpDir, "src", "bulletins"), { recursive: true, force: true });
    await mkdir(path.join(tmpDir, "src", "bulletins"), { recursive: true });
    await run(tmpDir);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function runGraphic(tmpDir) {
  const specPath = path.join(tmpDir, "spec.json");
  await writeFile(specPath, JSON.stringify(SPEC), "utf8");
  // cwd matters: graphic.mjs writes its PNG to a path relative to the
  // process's cwd (src/images/<date>/<slug>.png), and running it from
  // tmpDir keeps that write inside the fixture, never the real repo.
  const { stdout } = await execFileAsync(process.execPath, [graphicScript, "spec.json"], {
    cwd: tmpDir
  });
  return stdout.trim();
}

async function buildSite(tmpDir) {
  // Eleventy's own bulletins collection globs the literal path
  // "src/bulletins/**/*.md", resolved against the process's cwd — so cwd
  // must be tmpDir (whose src/ we just populated), not repoRoot.
  await execFileAsync(process.execPath, [eleventyBin, `--config=${eleventyConfig}`], {
    cwd: tmpDir
  });
}

test("graphic.mjs's output renders a real <img>, not literal Markdown, on the page", async () => {
  await withTempSite(async (tmpDir) => {
    const figureBlock = await runGraphic(tmpDir);

    // Sanity on the raw output itself before it ever touches Eleventy.
    assert.match(figureBlock, /^<figure class="graphic">/);
    assert.match(figureBlock, /<img src="\/images\/2099-01-03\/test-chart\.png" alt="/);
    assert.doesNotMatch(figureBlock, /!\[/, "graphic.mjs must not emit Markdown image syntax");

    const bulletinPath = path.join(tmpDir, "src", "bulletins", `${FIXTURE_DATE}.md`);
    const fixture = [
      "---",
      "layout: bulletin.njk",
      'title: "Fixture"',
      `date: ${FIXTURE_DATE}`,
      `permalink: "/${FIXTURE_DATE.replaceAll("-", "/")}/"`,
      "---",
      "",
      figureBlock,
      ""
    ].join("\n");
    await writeFile(bulletinPath, fixture, "utf8");

    await buildSite(tmpDir);

    const builtHtmlPath = path.join(tmpDir, "_site", "2099", "01", "03", "index.html");
    const html = await readFile(builtHtmlPath, "utf8");

    assert.match(
      html,
      new RegExp(`<img src="/images/${FIXTURE_DATE}/${FIXTURE_SLUG}\\.png" alt="[^"]+">`),
      "expected a real <img> tag with the graphic's src on the built page"
    );
    assert.doesNotMatch(
      html,
      /!\[/,
      "no literal Markdown image syntax should survive onto the built page"
    );
    // The escaped punctuation from SPEC.alt should show up as HTML entities,
    // not the raw characters — proof the alt text actually went through
    // escaping rather than being dropped or truncated at the first quote.
    assert.match(html, /officials said &quot;restored&quot; &amp; &lt;safe&gt;/);
  });
});
