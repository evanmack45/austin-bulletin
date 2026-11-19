import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import investigations from "../src/_data/investigations.js";
import {
  assertStoryFields, datasetFile, formatCell, loadInvestigationDataset, prepareInvestigation
} from "../scripts/investigation.mjs";
import { articleJsonLd, pageMetadata, sitemapPages } from "../scripts/metadata.mjs";

const root = path.resolve(".");
const storyUrl = "/investigations/sample-after-the-fact/";
const share = {
  image: "/images/investigations/sample-share.webp",
  imageAlt: "Sample graphic",
  imageWidth: 1200,
  imageHeight: 630,
  author: "Austin Investigative Journalism Team",
  updated: "2026-03-18"
};

test("a story card uses the headline, dataset image, and the listing flag", () => {
  const hidden = pageMetadata("/investigations/sample/", "Sample story", "", "A dek.",
    { ...share, public: false });
  assert.equal(hidden.indexable, false);
  assert.equal(hidden.noindex, true);
  assert.equal(hidden.ogTitle, "Sample story");
  assert.equal(hidden.title, "Sample story | The Austin Bulletin");
  assert.equal(hidden.description, "A dek.");
  assert.equal(hidden.card, "summary_large_image");
  assert.equal(hidden.ogType, "article");
  assert.equal(hidden.image, "https://theaustinbulletin.com/images/investigations/sample-share.webp");
  assert.equal(hidden.author, "Austin Investigative Journalism Team");
  assert.equal(hidden.updated, "2026-03-18");
  const listed = pageMetadata("/investigations/sample/", "Sample story", "", "A dek.",
    { ...share, public: true });
  assert.equal(listed.indexable, true);
  assert.equal(listed.noindex, false);
  const data = JSON.parse(articleJsonLd(listed, new Date("2026-03-04T00:00:00Z")));
  assert.equal(data.headline, "Sample story");
  assert.equal(data.author.name, "Austin Investigative Journalism Team");
  assert.equal(data.datePublished, "2026-03-04");
  assert.equal(data.dateModified, "2026-03-18");
  assert.equal(data.publisher.name, "The Austin Bulletin");
});

test("the investigations index is a page, not a news article", () => {
  const meta = pageMetadata("/investigations/", "Investigations", "", "Index copy.",
    { public: false });
  assert.equal(meta.type, "website");
  assert.equal(meta.card, "summary");
  assert.equal(meta.noindex, true);
  assert.equal(meta.image, "https://theaustinbulletin.com/icon-512.png");
});

test("an unlisted investigations route stays out of the sitemap", () => {
  const items = ["/investigations/", "/investigations/sample/", "/about/"].map(url => ({
    url, outputPath: `_site${url}index.html`
  }));
  assert.deepEqual(sitemapPages(items, { public: false }), ["/about/"]);
  assert.deepEqual(sitemapPages(items, { public: true }),
    ["/about/", "/investigations/", "/investigations/sample/"]);
});

test("the sample dataset prepares a chart, a table, and dollar cells", () => {
  const report = loadInvestigationDataset(
    "/investigations/sample-after-the-fact/data.json", root);
  assert.equal(report.sample, true);
  assert.equal(report.charts[0].series[2].label, "Fleet");
  assert.equal(report.charts[0].series[2].peak, true);
  assert.equal(report.charts[0].series[0].percent, 33.3);
  assert.equal(report.table.rows.length, 8);
  assert.equal(report.filters.length, 4);
  assert.equal(formatCell(10000, "dollars"), "$10,000");
  assert.equal(formatCell(12, "number"), "12");
  assert.equal(formatCell("", "text"), "—");
  assert.equal(formatCell("Example Vendor A"), "Example Vendor A");
});

test("a dataset path has to stay inside investigations", () => {
  assert.equal(datasetFile("/investigations/sample-after-the-fact/data.json"),
    "src/investigations/sample-after-the-fact/data.json");
  assert.throws(() => datasetFile("/investigations/../../package.json"));
  assert.throws(() => datasetFile("/images/secret.json"));
  assert.throws(() => prepareInvestigation({}));
  assert.throws(() => prepareInvestigation({
    charts: [{ id: "bars", title: "Bars", series: [{ label: "A", value: 1, group: "nope" }] }],
    filters: [{ id: "parks", label: "Parks" }]
  }));
  assert.equal(assertStoryFields({
    title: "T", dek: "D", byline: "B", description: "D",
    image: "/images/investigations/sample-share.webp", imageAlt: "Alt",
    dataset: "/investigations/sample-after-the-fact/data.json",
    findings: [{ value: "1", label: "row", detail: "A dummy detail." }]
  }), "");
});

test("the nav link is gated by the one public flag", () => {
  const nav = readFileSync("src/_includes/site-nav.njk", "utf8");
  assert.match(nav, /\{% if investigations\.public %\}/);
  assert.match(nav, /href="\/investigations\/"/);
  const flag = readFileSync("src/_data/investigations.js", "utf8");
  assert.match(flag, /public:\s*(true|false)/);
  assert.equal(typeof investigations.public, "boolean");
});

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const name = path.join(dir, entry.name);
    if (entry.name === "pagefind") return [];
    if (entry.isDirectory()) return htmlFiles(name);
    return name.endsWith(".html") ? [name] : [];
  }));
  return nested.flat();
}

test("the built sample is unlisted, sourced, and drawn from the dataset", {
  skip: !existsSync("_site/investigations/sample-after-the-fact/index.html")
    && "run npm run build before integration checks"
}, async () => {
  const story = readFileSync("_site/investigations/sample-after-the-fact/index.html", "utf8");
  const index = readFileSync("_site/investigations/index.html", "utf8");
  const home = readFileSync("_site/index.html", "utf8");
  const nav = home.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const xml = readFileSync("_site/sitemap.xml", "utf8");
  if (investigations.public) {
    assert.doesNotMatch(story, /name="robots" content="noindex"/);
    assert.doesNotMatch(story, /data-pagefind-ignore="all"/);
    assert.match(nav, /href="\/investigations\/"/);
    assert.match(xml, /\/investigations\/</);
  } else {
    assert.match(story, /name="robots" content="noindex"/);
    assert.match(index, /name="robots" content="noindex"/);
    assert.match(story, /data-pagefind-ignore="all"/);
    assert.doesNotMatch(nav, /href="\/investigations\/"/);
    assert.doesNotMatch(home, /href="\/investigations\/"/);
    assert.doesNotMatch(xml, /investigations/);
  }
  assert.match(story, /rel="canonical"[^>]+sample-after-the-fact\//);
  assert.match(story, /property="og:title" content="Sample story: after-the-fact contracts"/);
  assert.match(story, /property="og:description" content="A template page with a dummy chart/);
  assert.match(story, /images\/investigations\/sample-share\.webp/);
  assert.match(story, /property="og:image:width" content="1200"/);
  assert.match(story, /name="twitter:card" content="summary_large_image"/);
  assert.match(story, /Austin Investigative Journalism Team/);
  assert.match(story, /Key findings/);
  assert.match(story, /How we did this/);
  assert.match(story, /id="responses"/);
  assert.match(story, /Did not respond by February 16, 2026\./);
  assert.match(story, /id="documents"/);
  assert.match(story, /id="doc-sample-log"/);
  assert.match(story, /href="#doc-sample-agreement"/);
  assert.match(story, /id="corrections"/);
  assert.equal((story.match(/class="correction-note"/g) || []).length, 1);
  assert.doesNotMatch(story, /limited ballots|boardwalk beside the Hyatt/);
  assert.match(story, /Sample agreements by department/);
  assert.match(story, />\$10,000</);
  assert.match(story, /href="\/investigations\/sample-after-the-fact\/data\.json"/);
  assert.match(story, /#filter-fleet:checked/);
  assert.match(index, new RegExp(`href="${storyUrl}"`));
  assert.match(index, /made-up rows/);
  const data = readFileSync("_site/investigations/sample-after-the-fact/data.json", "utf8");
  assert.match(data, /Example Vendor A/);
  assert.match(data, /"sample": true/);
  if (!investigations.public) {
    const pages = await htmlFiles("_site");
    for (const file of pages) {
      if (file.includes(`${path.sep}investigations${path.sep}`)) continue;
      assert.doesNotMatch(await readFile(file, "utf8"), /href="\/investigations\//, file);
    }
  }
});
