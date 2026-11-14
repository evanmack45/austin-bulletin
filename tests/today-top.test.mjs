import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDesk } from "../scripts/desk.mjs";
import { homeEdition } from "../scripts/home-stories.mjs";
import { shortMonthDay, weekdayName } from "../scripts/edition-dates.mjs";

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

test("the homepage leads with the rent-limit number and the edition keeps each story", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const edition = html.match(/data-edition="(\d{4}-\d{2}-\d{2})"/)[1];
  const markdown = readFileSync(`src/bulletins/${edition}.md`, "utf8");
  const desk = parseDesk(markdown);
  const home = homeEdition(markdown);
  const instant = `${edition}T00:00:00.000Z`;
  const dateline = `${weekdayName(instant)}, ${shortMonthDay(instant)}`;
  assert.ok(html.includes(dateline), dateline);
  assert.doesNotMatch(html, /class="today-top"/);
  assert.match(html, /Catalytic converter theft reports surge back/);
  assert.match(html, />297</);
  assert.doesNotMatch(html, />927</);
  if (desk.headline) {
    assert.equal(html.split(desk.headline).length - 1, 0, desk.headline);
  }
  const kept = desk.headline ? edition : "2026-11-09";
  const keptFile = `src/bulletins/${kept}.md`;
  const keptMarkdown = kept === edition ? markdown : readFileSync(keptFile, "utf8");
  const keptDesk = kept === edition ? desk : parseDesk(keptMarkdown);
  const keptHome = kept === edition ? home : homeEdition(keptMarkdown);
  const page = readFileSync(`_site/${kept.replaceAll("-", "/")}/index.html`, "utf8");
  assert.ok(page.includes(keptDesk.headline), keptDesk.headline);
  const stories = keptHome.sections.flatMap((section) => section.stories);
  assert.ok(stories.length >= 4, "edition lists stories past the lead");
  for (const story of stories) {
    assert.ok(page.includes(story.title), story.title);
    assert.equal(html.includes(story.title), false, story.title);
  }
  if (!desk.headline) {
    const cards = readFileSync(`_site/${edition.replaceAll("-", "/")}/index.html`, "utf8");
    assert.match(cards, /Catalytic converter theft reports surge back/);
    assert.match(cards, />297</);
    const tuesday = readFileSync("_site/2026/11/10/index.html", "utf8");
    assert.match(tuesday, /Rent limits on affordable rentals end in 2027/);
    assert.equal(html.includes("Rent limits on affordable rentals end in 2027"), false);
    assert.equal(html.includes("$67.8M"), true);
  }
});
