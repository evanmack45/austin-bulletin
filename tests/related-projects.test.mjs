import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Removing the shared link would leave readers without a path to council records.
test("shared footer offers clearly labeled council records on home and dated editions", () => {
  for (const route of ["index.html", "2026/10/04/index.html", "about/index.html"]) {
    const html = readFileSync(`_site/${route}`, "utf8");
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
    assert.match(footer, /Council records:/);
    assert.match(footer, /href="https:\/\/yallcityhall\.org\/"[^>]*>Y.all, City Hall<\/a>/);
    assert.match(footer, /href="\/feed.xml"/);
    assert.doesNotMatch(footer, /council.{0,20}alerts|newsletter|endorse/i);
  }
});

test("About explains the council-record destination without promising decision alerts", () => {
  const html = readFileSync("_site/about/index.html", "utf8");
  const main = html.match(/<main>[\s\S]*?<\/main>/)?.[0] ?? "";
  assert.match(main, /Council agendas, votes and source records/i);
  assert.match(main, /href="https:\/\/yallcityhall\.org\/"/);
  assert.doesNotMatch(main, /council.{0,20}alerts|endorse/i);
});
