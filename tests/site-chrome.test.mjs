import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(name);
    return name.endsWith(".html") ? [name] : [];
  }));
  return nested.flat();
}

test("every page uses one menu and links council records in the footer", async () => {
  const files = (await htmlFiles("_site")).filter((file) => !file.endsWith("404.html"));
  assert.ok(files.length > 10);
  for (const file of files) {
    const html = await readFile(file, "utf8");
    assert.match(html, /class="site-menu"/, file);
    assert.match(html, /class="site-menu-button"/, file);
    assert.match(html, /href="\/"/, file);
    assert.match(html, /href="\/archive\/"/, file);
    assert.match(html, /href="\/about\/"/, file);
    assert.match(html, /href="\/feed.xml"/, file);
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
    assert.match(footer, /<a href="\/feed\.xml">RSS feed<\/a>/, file);
    assert.match(footer, /href="https:\/\/yallcityhall\.org\/"/, file);
    assert.doesNotMatch(html, /Unifraktur|class="folio-nav"|class="edition-head"/, file);
  }
});

test("topic pages and the October 24 edition share that menu", async () => {
  for (const route of ["vote-2026/index.html", "austin-bonds-2026/index.html",
    "muny-2026/index.html", "2026/10/24/index.html"]) {
    const html = await readFile(`_site/${route}`, "utf8");
    assert.match(html, /class="wordmark"/);
    assert.match(html, /Austin Bulletin/);
    assert.doesNotMatch(html, /Austin, up close/);
    assert.match(html, /href="\/vote-2026\/"/);
    assert.match(html, /href="\/subscribe\/"/);
  }
  const edition = await readFile("_site/2026/10/24/index.html", "utf8");
  assert.match(edition, /class="edition-lead-title"/);
  assert.doesNotMatch(edition, /Vol\. I/);
});
