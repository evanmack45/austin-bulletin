import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractArIds, normalizeTitle, titlesMatch, sameArticleUrl, isKvueHost,
  htmlBodyToText, parseRssItems, findFeedItemForUrl, buildSearchQuery
} from "../scripts/kvue.mjs";

test("extractArIds finds ids embedded in an MSN url and dedupes", () => {
  const html = `
    <a href="http://www.bing.com/news/apiclick.aspx?url=https%3a%2f%2fwww.msn.com%2fen-us%2fnews%2fother%2fx%2far-AA2bbLQl&c=1">x</a>
    <a href="https://www.msn.com/en-us/news/other/y/ar-AA2bbLQl">dup</a>
    <a href="https://www.msn.com/en-us/news/other/z/ar-AA1WOsDz">other</a>
  `;
  assert.deepEqual(extractArIds(html), ["AA2bbLQl", "AA1WOsDz"]);
});

test("extractArIds ignores short locale-code lookalikes", () => {
  assert.deepEqual(extractArIds('href="/ar-es/foo" href="/ar-south/bar"'), []);
});

test("extractArIds returns empty for no input", () => {
  assert.deepEqual(extractArIds(""), []);
  assert.deepEqual(extractArIds(null), []);
});

test("normalizeTitle lowercases, drops punctuation, and folds curly quotes", () => {
  assert.equal(
    normalizeTitle("Austin’s New Deal — With Southwest Airlines!"),
    "austin s new deal with southwest airlines"
  );
});

test("titlesMatch is true after normalization, false on real differences", () => {
  assert.ok(titlesMatch(
    "Police investigating after shots fired at Leander assisted living facility",
    "Police Investigating After Shots Fired At Leander Assisted Living Facility!"
  ));
  assert.ok(!titlesMatch("Inmate escapes Hays County Jail", "Inmate recaptured in Hays County"));
  assert.ok(!titlesMatch("", "anything"));
});

test("sameArticleUrl ignores query string, trailing slash, and www.", () => {
  const a = "https://www.kvue.com/article/news/local/x/269-abc?utm_source=rss";
  const b = "https://kvue.com/article/news/local/x/269-abc/";
  assert.ok(sameArticleUrl(a, b));
});

test("sameArticleUrl is false for a different path or a different host", () => {
  assert.ok(!sameArticleUrl(
    "https://www.kvue.com/article/news/local/x/269-abc",
    "https://www.kvue.com/article/news/local/y/269-abc"
  ));
  assert.ok(!sameArticleUrl(
    "https://www.kvue.com/article/news/local/x/269-abc",
    "https://www.kens5.com/article/news/local/x/269-abc"
  ));
});

test("sameArticleUrl is false, not throwing, on an unparseable url", () => {
  assert.ok(!sameArticleUrl("not a url", "https://www.kvue.com/article/x"));
});

test("isKvueHost accepts kvue.com and www.kvue.com only", () => {
  assert.ok(isKvueHost("https://www.kvue.com/article/news/x"));
  assert.ok(isKvueHost("https://kvue.com/article/news/x"));
  assert.ok(!isKvueHost("https://www.kens5.com/article/news/x"));
  assert.ok(!isKvueHost("not a url"));
});

test("htmlBodyToText turns <p> blocks into blank-line-separated paragraphs", () => {
  const html =
    '<img data-reference="image" data-document-id="AA1"><p>First graf.</p>' +
    '<img data-reference="video" data-document-id="AA2" />' +
    '<p>Second graf with a <a href="#">link</a>.</p>';
  assert.equal(htmlBodyToText(html), "First graf.\n\nSecond graf with a link.");
});

test("htmlBodyToText decodes entities and collapses whitespace", () => {
  assert.equal(
    htmlBodyToText("<p>Rock &amp; Roll   is\nback &mdash; officials said.</p>"),
    "Rock & Roll is back — officials said."
  );
});

test("htmlBodyToText falls back to stripped text when there are no <p> tags", () => {
  assert.equal(htmlBodyToText("<div>Just some text</div>"), "Just some text");
});

test("htmlBodyToText returns empty string for empty input", () => {
  assert.equal(htmlBodyToText(""), "");
  assert.equal(htmlBodyToText(null), "");
});

const SAMPLE_RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Police investigating after shots fired</title>
<link>https://www.kvue.com/article/news/crime/x/269-827a2bb8</link></item>
<item><title><![CDATA[A &amp; B story]]></title>
<link>https://www.kvue.com/article/news/local/y/269-abc</link></item>
</channel></rss>`;

test("parseRssItems extracts title/link pairs and unwraps CDATA", () => {
  const items = parseRssItems(SAMPLE_RSS);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Police investigating after shots fired");
  assert.equal(items[1].title, "A & B story");
  assert.equal(items[1].link, "https://www.kvue.com/article/news/local/y/269-abc");
});

test("parseRssItems returns empty array for empty input", () => {
  assert.deepEqual(parseRssItems(""), []);
});

test("findFeedItemForUrl matches by url regardless of query string", () => {
  const items = parseRssItems(SAMPLE_RSS);
  const found = findFeedItemForUrl(items, "https://www.kvue.com/article/news/local/y/269-abc?utm=1");
  assert.equal(found.title, "A & B story");
});

test("findFeedItemForUrl returns null when nothing matches", () => {
  const items = parseRssItems(SAMPLE_RSS);
  assert.equal(findFeedItemForUrl(items, "https://www.kvue.com/article/news/local/nope"), null);
});

test("buildSearchQuery appends a site filter and trims the headline", () => {
  assert.equal(buildSearchQuery("  Some Headline  "), "Some Headline site:msn.com");
});
