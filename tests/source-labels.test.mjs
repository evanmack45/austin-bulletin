import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PAGES = [
  "_site/index.html",
  "_site/2026/11/10/index.html",
  "_site/2026/11/11/index.html",
  "_site/2026/11/12/index.html",
  "_site/2026/11/13/index.html",
  "_site/2026/11/14/index.html"
];

const ROW = /<p class="[^"]*\b(?:source-line|srcline|src)\b[^"]*"[^>]*>[\s\S]*?<\/p>/g;

function sourceRows(html) {
  return html.match(ROW) || [];
}

function sourceLabels(html) {
  return sourceRows(html).flatMap((block) => [...block.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)]
    .map((match) => match[1].replaceAll("\u00a0", " ").trim()));
}

const PROPER = new Set([
  "City", "STR", "Austin", "NWS", "PDF", "Water", "Parks", "Police", "County",
  "Nov.", "Health", "Clerk"
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

test("every source row is labeled Sources: and names a link before +N more", () => {
  for (const page of PAGES) {
    const rows = sourceRows(readFileSync(page, "utf8"));
    assert.ok(rows.length > 0, page);
    for (const row of rows) {
      const text = row.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      assert.match(row, /(?:source-label|src-k)"[^>]*>Sources:</, `${page}: ${text}`);
      assert.equal(/\bSource:</.test(row), false, `${page} singular Source: ${text}`);
      if (/\+\d+ more/.test(row)) {
        assert.match(row, /<a\b/i, `${page} +N more without a named link: ${text}`);
      }
    }
  }
});
