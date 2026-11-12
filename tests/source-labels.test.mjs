import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PAGES = ["_site/index.html", "_site/2026/11/12/index.html"];

function sourceLabels(html) {
  const pattern = /<p class="[^"]*\b(?:source-line|src)\b[^"]*"[^>]*>[\s\S]*?<\/p>/g;
  const blocks = html.match(pattern) || [];
  return blocks.flatMap((block) => [...block.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)]
    .map((match) => match[1].replaceAll("\u00a0", " ").trim()));
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
