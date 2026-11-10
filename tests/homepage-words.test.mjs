import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { budgetProblems } from "../scripts/homepage-words.mjs";

const limits = JSON.parse(readFileSync("src/_data/homepageBudget.json", "utf8"));

test("the homepage stays inside the word budget", () => {
  for (const file of ["_site/index.html"]) {
    const result = budgetProblems(readFileSync(file, "utf8"), limits);
    assert.deepEqual(result.problems, [], `${file} fold ${result.fold} page ${result.page}`);
    assert.ok(result.fold <= limits.aboveFoldMax);
    assert.ok(result.page <= limits.pageMax);
    assert.ok(result.fold > 0, file);
  }
});

test("the budget fails a page that calls 2027 the peak", () => {
  const html = "<main><p data-fold>2027 is the peak year for rent limits ending.</p></main>";
  const result = budgetProblems(html, limits);
  assert.ok(result.problems.some((item) => /peak/.test(item)));
});
