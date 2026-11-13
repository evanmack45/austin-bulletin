import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PAGES = ["_site/index.html", "_site/2026/11/12/index.html", "_site/2026/11/13/index.html"];

function sourceLabels(html) {
  const pattern = /<p class="[^"]*\b(?:source-line|src)\b[^"]*"[^>]*>[\s\S]*?<\/p>/g;
  const blocks = html.match(pattern) || [];
  return blocks.flatMap((block) => [...block.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)]
    .map((match) => match[1].replaceAll("\u00a0", " ").trim()));
}

const PROPER = new Set([
  "City", "STR", "Austin", "NWS", "PDF", "Water", "Parks", "Police", "County", "Nov."
]);

function bareWord(word) {
  return word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9.]+$/g, "");
}

function sentenceCaseIssue(label) {
  const words = label.split(/\s+/).map(bareWord).filter(Boolean);
  if (/^[a-z]/.test(words[0] || "")) return "starts lowercase";
  for (const word of words.slice(1)) {
    const acronym = /^[A-Z0-9]{2,}$/.test(word);
    if (/^[A-Z]/.test(word) && !PROPER.has(word) && !acronym) return word;
  }
  return "";
}

test("source display labels are 24 characters or fewer", () => {
  for (const page of PAGES) {
    const labels = sourceLabels(readFileSync(page, "utf8"));
    assert.ok(labels.length > 0, page);
    for (const label of labels) {
      assert.ok(label.length <= 24, `${page}: "${label}" is ${label.length} characters`);
    }
  }
});

test("source display labels are sentence case", () => {
  for (const page of PAGES) {
    const labels = sourceLabels(readFileSync(page, "utf8"));
    for (const label of labels) {
      const issue = sentenceCaseIssue(label);
      assert.equal(issue, "", `${page}: "${label}" (${issue})`);
    }
  }
});
