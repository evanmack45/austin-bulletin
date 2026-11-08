import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { siteManifest } from "../scripts/author-edition-probes.mjs";

test("the built site manifest lists fonts, scripts, and this edition", {
  skip: !existsSync("_site/index.html") && "run npm run build before the manifest check"
}, () => {
  const manifest = siteManifest();
  const paths = new Set(manifest.map((entry) => entry.path));
  for (const file of [
    "index.html",
    "2026/11/08/index.html",
    "2026/11/06/index.html",
    "css/style.css",
    "css/front-cover.css",
    "js/share.js",
    "js/signup.js",
    "js/site-nav.js",
    "feed.xml"
  ]) assert.equal(paths.has(file), true, file);
  assert.ok([...paths].some((file) => file.endsWith(".woff2")), "a font file");
  for (const entry of manifest) {
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.equal(entry.bytes > 0, true, entry.path);
  }
});
