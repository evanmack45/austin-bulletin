import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const built = existsSync("_site/index.html");
async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(name);
    return name.endsWith(".html") ? [name] : [];
  }));
  return nested.flat();
}
async function sourceUrls() {
  const files = (await readdir("src/bulletins")).filter(name => name.endsWith(".md"));
  const urls = await Promise.all(files.map(async name => {
    const source = await readFile(`src/bulletins/${name}`, "utf8");
    return source.match(/^permalink:\s*"([^"]+)"/m)?.[1];
  }));
  assert.ok(urls.every(Boolean));
  return urls.sort().reverse();
}

test("built content pages have their own escaped canonical and social metadata", {
  skip: !built && "run npm run build before integration checks"
}, async () => {
  const pages = (await htmlFiles("_site")).filter(file => !file.endsWith("/404.html"));
  for (const file of pages) {
    const source = await readFile(file, "utf8");
    const url = `/${path.relative("_site", file).replace(/index\.html$/, "")}`;
    assert.ok(source.includes(`rel="canonical" href="https://theaustinbulletin.com${url}"`), file);
    assert.match(source, /property="og:description" content="[^"]+"/);
    assert.match(source, /name="twitter:card" content="summary"/);
  }
});

test("sitemap matches all generated eligible HTML pages as the site grows", {
  skip: !built && "run npm run build before integration checks"
}, async () => {
  const expected = (await htmlFiles("_site")).filter(file => !file.endsWith("/404.html"))
    .map(file => `https://theaustinbulletin.com/${path.relative("_site", file)
      .replace(/index\.html$/, "")}`).sort();
  const xml = await readFile("_site/sitemap.xml", "utf8");
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const actual = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).sort();
  assert.deepEqual(actual, expected);
  assert.equal(new Set(actual).size, actual.length);
  const robots = await readFile("_site/robots.txt", "utf8");
  assert.match(robots, /Sitemap: https:\/\/theaustinbulletin\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Disallow:\s*\//);
});

test("feed order and archive completeness still follow actual source editions", {
  skip: !built && "run npm run build before integration checks"
}, async () => {
  const urls = await sourceUrls();
  const xml = await readFile("_site/feed.xml", "utf8");
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(match => match[1].match(/<id>([^<]+)<\/id>/)?.[1]);
  assert.deepEqual(entries, urls.slice(0, 10).map(url => `https://theaustinbulletin.com${url}`));
  const archive = await readFile("_site/archive/index.html", "utf8");
  for (const url of urls) assert.ok(archive.includes(`href="${url}"`), url);
});
