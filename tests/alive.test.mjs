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
  credits.sample = {
    ...credits.courthouse,
    alt: "Skyline",
    caption: "Austin",
    credit: "",
    kind: "illustration"
  };
  const problems = aliveProblems("## x", credits, files);
  assert.ok(problems.some((item) => /sample lacks an illustration label/.test(item)));
});

test("a homepage headline over 10 words fails", () => {
  const headline = "One two three four five six seven eight nine ten eleven.";
  const markdown = `{% bigstory %}\n### ${headline}\n{% endbigstory %}`;
  const problems = aliveProblems(markdown, catalog(), files);
  assert.ok(problems.some((item) => /over 10 words/.test(item)));
});

test("the Nov. 8 publisher dek is the one allowed If you opener", () => {
  const dek = "If you need to register to vote in a possible Dec. 12 city runoff, " +
    "the deadline is Thursday, Nov. 12.";
  const markdown = "{% bigstory %}\n### Thursday is the registration deadline.\n\n" +
    `${dek}\n{% endbigstory %}`;
  const problems = aliveProblems(markdown, catalog(), files);
  assert.equal(problems.some((item) => /starts with "If you"/.test(item)), false);
  const other = markdown.replace(dek, "If you want a ballot, register Thursday.");
  const rejected = aliveProblems(other, catalog(), files);
  assert.equal(rejected.some((item) => /starts with "If you"/.test(item)), true);
});

test("the Nov. 4 publisher headline is allowed past 10 words", () => {
  const headline = "Parks and library bonds lead; " +
    "three council races head to Dec. 12 runoffs.";
  const markdown = `{% bigstory %}\n### ${headline}\n{% endbigstory %}`;
  const problems = aliveProblems(markdown, catalog(), files);
  assert.ok(!problems.some((item) => /over 10 words/.test(item)));
});
