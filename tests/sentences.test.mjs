import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  duplicateSentenceProblems,
  duplicateSentences,
  formatSentenceProblem
} from "../scripts/sentences.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(root, "scripts/check-sentences.mjs");
const REPEATED = "The county opened the comment window on Monday morning.";

function page(body) {
  return `<!doctype html><html><head><title>x</title></head><body>${body}</body></html>`;
}

async function runChecker(dir) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [checker, dir], { cwd: root });
    return { code: 0, output: `${stdout}\n${stderr}` };
  } catch (err) {
    return { code: err.code ?? 1, output: `${err.stdout || ""}\n${err.stderr || ""}` };
  }
}

test("a fixture with a duplicate sentence fails and names the file", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "sentences-"));
  const again = "  the   COUNTY opened the comment window on monday morning. ";
  const html = page(`<p>${REPEATED}</p><p>${again}</p>`);
  await writeFile(path.join(dir, "edition.html"), html);
  try {
    const problems = await duplicateSentenceProblems(dir);
    assert.equal(problems.length, 1);
    assert.equal(problems[0].file, "edition.html");
    assert.match(formatSentenceProblem(problems[0]), /edition\.html/);
    assert.match(problems[0].sentence, /county opened the comment window on monday morning/);
    const { code, output } = await runChecker(dir);
    assert.notEqual(code, 0);
    assert.match(output, /edition\.html/);
    assert.match(output, /county opened the comment window on monday morning/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a sentence under six words can repeat", () => {
  const line = "Polls stay open Friday.";
  assert.deepEqual(duplicateSentences(page(`<p>${line}</p><p>${line}</p>`)), []);
});

test("abbreviations do not split one sentence into a false duplicate", () => {
  const html = page(
    "<p>Early voting runs through Friday, Oct. 30 at the courthouse.</p>" +
    "<p>Election day is Tuesday, Nov. 3 at that courthouse.</p>"
  );
  assert.deepEqual(duplicateSentences(html), []);
});

test("the edition title may repeat the briefing headline", () => {
  const headline = "A quarter of Travis County has voted. " +
    "Saturday was the slowest in-person day yet.";
  const html = page(
    `<h1 class="edition-lead-title">${headline}</h1>` +
    `<h3>${headline}</h3><p>The county posted the daily file.</p>`
  );
  assert.deepEqual(duplicateSentences(html), []);
});

test("the homepage jump list may repeat a card headline", () => {
  const headline = "Sunday crowds at Randalls Brodie nearly matched weekdays.";
  const html = page(
    `<nav class="today-top"><ol><li><a href="#closes-0">${headline}</a></li></ol></nav>` +
    `<article class="card" id="closes-0"><h2><a href="https://example.org">${headline}</a></h2></article>`
  );
  assert.deepEqual(duplicateSentences(html), []);
});

test("the signup line may repeat in the mobile bar", () => {
  const line = "Early voting numbers, council votes, road closures. "
    + "Free, weekday mornings.";
  const embed = "<div class=\"signup-embed\"><noscript>"
    + "<a href=\"https://example.com\">Subscribe by email</a></noscript></div>";
  const note = "One email each morning, after you confirm.";
  const html = page(
    `<section class="signup signup--lead"><h2>The morning edition</h2>` +
    `<p class="signup-value">${line}</p>${embed}` +
    `<p class="signup-note">${note} <a href="/feed.xml">Or follow by RSS</a>.</p></section>` +
    `<section class="signup signup--bar"><p class="signup-value">${line}</p>` +
    `<button type="button">Close</button>${embed}` +
    `<p class="signup-note">${note}</p></section>`
  );
  assert.deepEqual(duplicateSentences(html), []);
});

test("the same sentence in two paragraphs still fails when the title repeats it", () => {
  const html = page(
    `<h1 class="edition-lead-title">${REPEATED} Five days remain.</h1>` +
    `<p>${REPEATED}</p><p>${REPEATED}</p>`
  );
  assert.equal(duplicateSentences(html).length, 1);
});

test("the current build has no duplicate sentence on a page", async () => {
  const problems = await duplicateSentenceProblems(path.join(root, "_site"));
  assert.deepEqual(problems, [], problems.map(formatSentenceProblem).join("\n"));
});
