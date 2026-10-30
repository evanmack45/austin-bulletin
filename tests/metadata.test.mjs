import { test } from "node:test";
import assert from "node:assert/strict";
import { articleJsonLd, briefingHeadline, canonicalUrl, editionGap, pageMetadata, sitemapPages,
  xmlEscape }
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

test("edition sharing uses the lead headline, excerpt, and existing image", () => {
  const meta = pageMetadata("/2026/10/04/", "The Austin Bulletin — October 4", body);
  assert.match(meta.title, /Park access & repairs/);
  assert.match(meta.title, /October 4, 2026/);
  assert.equal(meta.ogTitle, "Park access & repairs");
  assert.equal(meta.description,
    "The city lists open amenities. A reopening date remains unconfirmed.");
  assert.equal(meta.type, "article");
  assert.equal(meta.ogType, "article");
  assert.equal(meta.image, "https://theaustinbulletin.com/example.png");
  assert.equal(meta.imageAlt, "Not a story thumbnail");
  assert.equal(meta.card, "summary_large_image");
});

test("a lead photograph is the share image ahead of a later story graphic", () => {
  const html = `<figure class="lead-photo"><img src="/images/p-courthouse.jpg" ` +
    `alt="Travis County Courthouse, 2011"></figure>` +
    `<section class="big-story"><h3>Early voting</h3><p>People had voted.</p>` +
    `<img src="/images/2026-10-30/early-ballots.png" alt="Chart"></section>`;
  const meta = pageMetadata("/2026/10/30/", "Edition", html);
  assert.equal(meta.image, "https://theaustinbulletin.com/images/p-courthouse.jpg");
  assert.equal(meta.imageAlt, "Travis County Courthouse, 2011");
});

test("an off-site image is not used as the share card", () => {
  const html = `<section class="big-story"><h3>Early voting</h3>` +
    `<img src="https://example.com/photo.jpg" alt="Elsewhere"><p>People had voted.</p></section>`;
  const meta = pageMetadata("/2026/10/30/", "Edition", html);
  assert.equal(meta.image, "https://theaustinbulletin.com/icon-512.png");
  assert.equal(meta.card, "summary_large_image");
});

test("homepage keeps root canonical while its card follows the current edition", () => {
  const meta = pageMetadata("/", "Today", body);
  assert.equal(meta.canonical, "https://theaustinbulletin.com/");
  assert.equal(meta.type, "website");
  assert.equal(meta.ogType, "article");
  assert.equal(meta.ogTitle, "Park access & repairs");
  assert.match(meta.title, /Park access/);
  assert.equal(meta.image, "https://theaustinbulletin.com/example.png");
  assert.equal(meta.card, "summary_large_image");
});

test("the homepage card uses the front lead headline and photograph", () => {
  const html = `<section class="front-lead" id="front-lead">` +
    `<h1 id="front-lead-title">Last day of early voting</h1>` +
    `<figure class="lead-photo"><img src="/images/p-courthouse.jpg" ` +
    `alt="Travis County Courthouse, 2011"></figure>` +
    `<p class="front-deck">Through Thursday, 41.98 percent had voted.</p></section>`;
  const meta = pageMetadata("/", "Austin Bulletin", html, "What changed in Austin this morning.");
  assert.equal(meta.ogTitle, "Last day of early voting");
  assert.equal(meta.ogType, "article");
  assert.equal(meta.canonical, "https://theaustinbulletin.com/");
  assert.equal(meta.description, "What changed in Austin this morning.");
  assert.equal(meta.image, "https://theaustinbulletin.com/images/p-courthouse.jpg");
});

test("legacy pages without reliable lead extraction use a generic factual fallback", () => {
  const meta = pageMetadata("/2026/08/23/", "Old edition", "<p>Unrelated footer.</p>");
  assert.equal(meta.description, "A daily, neutral news bulletin for Austin and Texas.");
  assert.doesNotMatch(meta.description, /Unrelated/);
  assert.equal(meta.image, "https://theaustinbulletin.com/icon-512.png");
  assert.equal(meta.imageAlt, "The Austin Bulletin brand icon");
  assert.equal(meta.card, "summary_large_image");
  assert.equal(meta.ogType, "article");
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

test("archive reads the Briefing headline from an edition's markdown", () => {
  const md = "---\ntitle: x\n---\n\n## The Briefing\n\n{% bigstory %}\n"
    + "### Prices &amp; bills, *again*\n\n#### Beat\n";
  assert.equal(briefingHeadline(md), "Prices & bills, again");
  assert.equal(briefingHeadline("## The Briefing\n\nno headline"), "");
});

test("archive names the days with no edition between neighbors", () => {
  assert.equal(editionGap(new Date("2026-10-10"), new Date("2026-10-06")), "October 7–9");
  assert.equal(editionGap(new Date("2026-10-08"), new Date("2026-10-06")), "October 7");
  assert.equal(editionGap(new Date("2026-11-02"), new Date("2026-10-30")), "October 31–November 1");
  assert.equal(editionGap(new Date("2026-10-07"), new Date("2026-10-06")), "");
});
