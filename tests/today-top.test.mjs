import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDesk } from "../scripts/desk.mjs";
import { homeEdition } from "../scripts/home-stories.mjs";
import { shortMonthDay, weekdayName } from "../scripts/edition-dates.mjs";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function element(html, tag, id) {
  const pattern = new RegExp(
    `<${tag}\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</${tag}>`
  );
  return html.match(pattern)?.[0] ?? "";
}

const LEAD_ONLY = `{% bigstory %}
### One sourced lead.
<p class="source-line">Sources: <a href="https://example.org/lead">City</a></p>
{% endbigstory %}`;

const UNSOURCED = `{% bigstory %}
### A lead with no source link.
{% endbigstory %}
{% river %}
##### Deadline with no source.
<!-- desk:closes Nov 1 -->
<span class="src">City memo</span>
##### A sourced week item for the list.
<!-- desk:week Nov 2 -->
<span class="src"><a href="https://example.org/week">City</a></span>
{% endriver %}`;

test("October 27 jump lines follow lead, then deadlines, then the week", () => {
  const desk = parseDesk(readFileSync("src/bulletins/2026-10-27.md", "utf8"));
  assert.deepEqual(
    desk.top.map((item) => item.anchor),
    ["front-lead", "closes-0", "week-0"]
  );
  assert.equal(desk.top[0].title, desk.headline);
  assert.equal(desk.top[1].title, desk.closes[0].title);
  assert.equal(desk.top[2].title, desk.week[0].title);
  assert.equal(desk.week.length, 2);
  assert.equal(desk.top.length, 3);
  for (const item of desk.top) assert.ok(item.source.href);
});

test("fewer than three sourced items are listed without padding", () => {
  const desk = parseDesk(LEAD_ONLY);
  assert.equal(desk.top.length, 1);
  assert.equal(desk.top[0].anchor, "front-lead");
  assert.equal(desk.top[0].title, "One sourced lead.");
  const skipped = parseDesk(UNSOURCED);
  assert.equal(skipped.closes[0].source, null);
  assert.deepEqual(skipped.top.map((item) => item.anchor), ["week-0"]);
});

test("the homepage shows each edition story once, lead first", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const edition = html.match(/data-edition="(\d{4}-\d{2}-\d{2})"/)[1];
  const markdown = readFileSync(`src/bulletins/${edition}.md`, "utf8");
  const desk = parseDesk(markdown);
  const home = homeEdition(markdown);
  const instant = `${edition}T00:00:00.000Z`;
  const dateline = `${weekdayName(instant)}, ${shortMonthDay(instant)}`;
  const body = html.replace(/<head\b[\s\S]*?<\/head>/i, "")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
  assert.ok(html.includes(dateline), dateline);
  assert.doesNotMatch(html, /class="today-top"/);
  assert.equal(body.split(desk.headline).length - 1, 1, desk.headline);
  const lead = element(html, "section", "front-lead");
  assert.ok(lead.includes(escapeHtml(desk.headline)));
  assert.match(lead, new RegExp(`href="/${edition.replaceAll("-", "/")}/#${home.leadAnchor}"`));
  const stories = home.sections.flatMap((section) => section.stories);
  assert.ok(stories.length >= 4, "homepage lists the edition past the lead");
  for (const story of stories) {
    assert.equal(body.split(story.title).length - 1, 1, story.title);
    const href = `/${edition.replaceAll("-", "/")}/#${story.anchor}`;
    assert.ok(body.includes(`href="${href}"`), href);
    assert.ok(body.includes(story.summary), story.summary.slice(0, 48));
  }
  const heads = [...body.matchAll(/<h1\b|<h3\b|class="signup signup--lead"/g)].map((match) => (
    match[0].startsWith("<h1") ? "h1" : match[0].startsWith("<h3") ? "h3" : "signup"
  ));
  const signupAt = heads.indexOf("signup");
  const renderedStories = 1 + stories.length;
  const expectedBefore = renderedStories >= 3 ? 3 : 1;
  assert.equal(
    heads.slice(0, signupAt).filter((tag) => tag === "h1" || tag === "h3").length,
    expectedBefore
  );
  if (edition === "2026-11-03" || edition === "2026-11-04") {
    assert.equal((html.match(/>Election results</g) || []).length, 1);
    assert.match(lead, /class="results-link" href="\/election\/2026-11-03\/"/);
    assert.doesNotMatch(lead, /results-button/);
  }
});
