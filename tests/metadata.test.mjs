import { test } from "node:test";
import assert from "node:assert/strict";
import { articleJsonLd, canonicalUrl, pageMetadata, sitemapPages, xmlEscape }
  from "../scripts/metadata.mjs";

const body = `<h1 class="edition-date">October 4, 2026</h1>
<section class="big-story"><h3>Park access &amp; repairs</h3>
<figure><img src="/example.png" alt="Not a story thumbnail"></figure>
<p>The city lists open amenities. A reopening date remains unconfirmed.</p></section>`;

test("canonical URLs retain production routes and normalize query, fragment and index", () => {
  assert.equal(canonicalUrl("/"), "https://theaustinbulletin.com/");
  assert.equal(canonicalUrl("/archive/index.html?query=x#search"),
    "https://theaustinbulletin.com/archive/");
  assert.equal(canonicalUrl("/2026/10/04/"), "https://theaustinbulletin.com/2026/10/04/");
  assert.throws(() => canonicalUrl("https://example.com/"));
  assert.throws(() => canonicalUrl("//example.com/"));
});

test("edition sharing uses an honest rendered lead excerpt and a modest brand icon", () => {
  const meta = pageMetadata("/2026/10/04/", "The Austin Bulletin — October 4", body);
  assert.match(meta.title, /Park access & repairs/);
  assert.match(meta.title, /October 4, 2026/);
  assert.equal(meta.description,
    "The city lists open amenities. A reopening date remains unconfirmed.");
  assert.equal(meta.type, "article");
  assert.equal(meta.image, "https://theaustinbulletin.com/icon-512.png");
  assert.equal(meta.card, "summary");
});

test("homepage keeps root canonical while its excerpt follows the current edition", () => {
  const meta = pageMetadata("/", "Today", body);
  assert.equal(meta.canonical, "https://theaustinbulletin.com/");
  assert.equal(meta.type, "website");
  assert.match(meta.title, /Park access/);
});

test("legacy pages without reliable lead extraction use a generic factual fallback", () => {
  const meta = pageMetadata("/2026/08/23/", "Old edition", "<p>Unrelated footer.</p>");
  assert.equal(meta.description, "A daily, neutral news bulletin for Austin and Texas.");
  assert.doesNotMatch(meta.description, /Unrelated/);
});

test("explicit utility descriptions remain supported for future static guides", () => {
  const meta = pageMetadata("/zilker-park-access/", "Zilker park access", "",
    "City-posted access guidance and confirmed uncertainties.");
  assert.equal(meta.description, "City-posted access guidance and confirmed uncertainties.");
});

test("plain metadata decodes source entities without treating text as markup", () => {
  const meta = pageMetadata("/2026/10/04/", "Edition", body.replace(
    "The city lists open amenities.",
    "The city says &quot;open&quot; &amp; marks &#39;routes&#39;."));
  assert.match(meta.description, /"open" & marks 'routes'/);
  assert.equal(xmlEscape('A & B < "route"'), "A &amp; B &lt; &quot;route&quot;");
});

test("sitemap includes unique content HTML routes, omitting errors and machine resources", () => {
  const items = ["/", "/archive/", "/about/", "/vote-2026/", "/2026/10/04/",
    "/zilker-park-access/", "/archive/", "/404.html", "/feed.xml", "/sitemap.xml",
    "/robots.txt", "/pagefind/search.js"].map(url => ({
    url, outputPath: url.endsWith("/") ? `_site${url}index.html` : `_site${url}`
  }));
  assert.deepEqual(sitemapPages(items), ["/", "/2026/10/04/", "/about/", "/archive/",
    "/vote-2026/", "/zilker-park-access/"]);
});

test("dated editions get NewsArticle data from their lead; other pages get none", () => {
  const meta = pageMetadata("/2026/10/04/", "Edition", `${body}<p>x</p>`);
  const data = JSON.parse(articleJsonLd(meta, new Date("2026-10-04T00:00:00Z")));
  assert.equal(data["@type"], "NewsArticle");
  assert.equal(data.headline, "Park access & repairs");
  assert.equal(data.datePublished, "2026-10-04");
  assert.equal(data.url, "https://theaustinbulletin.com/2026/10/04/");
  assert.equal(data.publisher.name, "The Austin Bulletin");
  assert.equal(articleJsonLd(pageMetadata("/about/", "About", ""), new Date()), "");
  const risky = articleJsonLd({ ...meta, headline: "</script><b>" }, new Date("2026-10-04"));
  assert.ok(!risky.includes("<"));
});
