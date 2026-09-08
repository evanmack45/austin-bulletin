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

async function runCheck(date, dir) {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [checkScript, date, "--no-links", "--dir", dir],
      { cwd: repoRoot }
    );
    return { code: 0, output: `${stdout}\n${stderr}` };
  } catch (err) {
    return { code: err.code ?? 1, output: `${err.stdout || ""}\n${err.stderr || ""}` };
  }
}

function withSyntheticFrontMatter(body, date) {
  const [, y, m, d] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const permalink = `/${y}/${m}/${d}/`;
  return body
    .replace(/^date:\s*.*$/m, `date: ${date}`)
    .replace(/^permalink:\s*.*$/m, `permalink: "${permalink}"`);
}

async function withTempDir(run) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "growth-gate-"));
  try {
    await run(tmpDir);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

const FIXTURE_SRC = path.join(liveBulletinDir, "2026-09-03.md"); // a new-shape edition
const FIXTURE_DATE = "2099-01-03";

test('fails when the "Growth & infrastructure" beat heading is missing', async () => {
  await withTempDir(async (tmpDir) => {
    const body = await readFile(FIXTURE_SRC, "utf8");
    const mutated = withSyntheticFrontMatter(
      body.replace(/^####\s+Growth & infrastructure\s*$/m, ""),
      FIXTURE_DATE
    );
    await writeFile(path.join(tmpDir, `${FIXTURE_DATE}.md`), mutated, "utf8");

    const { code, output } = await runCheck(FIXTURE_DATE, tmpDir);
    assert.notEqual(
      code,
      0,
      "expected failure when the Growth & infrastructure heading is missing"
    );
    assert.match(
      output,
      /Growth & infrastructure.*heading is missing/,
      "expected a clear failure naming the missing beat"
    );
  });
});

test('passes when Growth has only the exact empty-state notice', async () => {
  await withTempDir(async (tmpDir) => {
    const body = await readFile(FIXTURE_SRC, "utf8");
    // Replace the entire Growth beat body with just the one-line notice, and pad
    // City Hall with two brief items so the edition still clears the 20-item floor.
    let mutated = body.replace(
      /^(####\s+Growth & infrastructure\s*\n)([\s\S]*?)(?=^####\s+|\{% endriver %\})/m,
      `$1\nNo new closures or openings today\n\n`
    );
    mutated = mutated.replace(
      /^(####\s+City Hall & county\s*\n)/m,
      (() => {
        const filler1 =
          'Austin added filler. ' +
          '<span class="src"><a href="https://www.austintexas.gov/">City of Austin</a></span>';
        const filler2 =
          'Austin added another filler. ' +
          '<span class="src"><a href="https://www.austintexas.gov/">City of Austin</a></span>';
        return `$1\n${filler1}\n\n${filler2}\n\n`;
      })()
    );
    // Keep the real date for a clean front-matter pass.
    const outDate = "2026-09-03";
    await writeFile(path.join(tmpDir, `${outDate}.md`), mutated, "utf8");

    const { code, output } = await runCheck(outDate, tmpDir);
    assert.equal(
      code,
      0,
      `expected the checker to pass with the Growth empty-state notice; got:\n${output}`
    );
  });
});

test('fails when Growth is declared but empty (no items, no notice)', async () => {
  await withTempDir(async (tmpDir) => {
    const body = await readFile(FIXTURE_SRC, "utf8");
    // Strip everything under the Growth heading, leaving the heading itself.
    const mutated = withSyntheticFrontMatter(
      body.replace(
        /^(####\s+Growth & infrastructure\s*\n)([\s\S]*?)(?=^####\s+|\{% endriver %\})/m,
        `$1\n`
      ),
      FIXTURE_DATE
    );
    await writeFile(path.join(tmpDir, `${FIXTURE_DATE}.md`), mutated, "utf8");

    const { code, output } = await runCheck(FIXTURE_DATE, tmpDir);
    assert.notEqual(code, 0, "expected the checker to fail an empty Growth beat");
    assert.match(
      output,
      /Growth & infrastructure is a declared beat with zero items/,
      "expected the empty-beat failure to name Growth & infrastructure"
    );
  });
});

