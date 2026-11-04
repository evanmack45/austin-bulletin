// Fail when an archive line is empty, mostly a percentage, a copy of the
// previous edition, or — from 2026-11-04 — missing its archive_title field.
// Usage: node scripts/check-archive-titles.mjs [bulletin-dir]

import path from "node:path";
import { fileURLToPath } from "node:url";
import { archiveTitleProblems, editionArchiveTitles } from "./archive-titles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const dir = path.resolve(root, process.argv[2] || path.join("src", "bulletins"));
  const editions = await editionArchiveTitles(dir);
  const problems = archiveTitleProblems(editions);
  if (problems.length === 0) {
    console.log(`archive titles ok (${editions.length} editions)`);
    return;
  }
  for (const problem of problems) console.error(problem);
  console.error(`archive titles: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`archive titles: ${err && err.message ? err.message : String(err)}`);
  process.exitCode = 1;
});
