// Fail when a built page repeats a sentence of six or more words.
// Usage: node scripts/check-sentences.mjs [site-dir]
// Default site dir is _site, next to this repo's root.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { duplicateSentenceProblems, formatSentenceProblem } from "./sentences.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const dir = path.resolve(root, process.argv[2] || "_site");
  const problems = await duplicateSentenceProblems(dir);
  if (problems.length === 0) {
    console.error("check: no duplicate sentences");
    return;
  }
  for (const problem of problems) console.error(formatSentenceProblem(problem));
  console.error(`check: ${problems.length} duplicate sentence${problems.length === 1 ? "" : "s"}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`check: ${err && err.message ? err.message : String(err)}`);
  process.exitCode = 1;
});
