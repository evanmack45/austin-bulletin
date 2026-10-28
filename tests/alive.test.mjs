import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { aliveProblems, htmlImageProblems, startsWithIfYou } from "../scripts/alive.mjs";

const files = {
  exists: (rel) => existsSync(rel),
  sizeOf: (rel) => statSync(rel).size
};

function catalog() {
  return JSON.parse(readFileSync("src/_data/imageCredits.json", "utf8"));
}

test("If you at the start of an item is the formula", () => {
  assert.equal(startsWithIfYou("If you haven't voted: polls are open."), true);
  assert.equal(startsWithIfYou("Polls are open if you have not voted."), false);
  assert.equal(startsWithIfYou(""), false);
});

test("a bare chart caption is a credit and a blank one is not", () => {
  const credited = "<figure><img src=\"/images/chart.png\" alt=\"Bars\">" +
    "<figcaption>Chart: The Austin Bulletin</figcaption></figure>";
  assert.deepEqual(htmlImageProblems(credited), []);
  const blank = credited.replace("Chart: The Austin Bulletin", "");
  assert.match(htmlImageProblems(blank).join(" "), /lacks a credit/);
  const art = "<img src=\"/images/ill.jpg\" alt=\"Illustration\">";
  assert.deepEqual(htmlImageProblems(art), []);
});

test("October 26 copy and the image catalog pass", () => {
  const markdown = readFileSync("src/bulletins/2026-10-26.md", "utf8");
  assert.deepEqual(aliveProblems(markdown, catalog(), files), []);
});

test("a photo record with no credit fails", () => {
  const credits = catalog();
  credits.courthouse.credit = "";
  const problems = aliveProblems("## x", credits, files);
  assert.ok(problems.some((item) => /courthouse lacks a credit/.test(item)));
});

test("an illustration record without the label fails", () => {
  const credits = catalog();
  credits.closes.alt = "Skyline";
  credits.closes.caption = "Austin";
  const problems = aliveProblems("## x", credits, files);
  assert.ok(problems.some((item) => /closes lacks an illustration label/.test(item)));
});

test("a homepage headline over 10 words fails", () => {
  const headline = "One two three four five six seven eight nine ten eleven.";
  const markdown = `{% bigstory %}\n### ${headline}\n{% endbigstory %}`;
  const problems = aliveProblems(markdown, catalog(), files);
  assert.ok(problems.some((item) => /over 10 words/.test(item)));
});
