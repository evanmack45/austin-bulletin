import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeEdition } from "../scripts/home-stories.mjs";

const FIRST_PERSON = /\b(we|our|us)\b/i;

function listed(edition) {
  return edition.sections.flatMap((section) => section.stories.map((story) => ({
    ...story,
    section: section.label
  })));
}

test("notices stay last and summaries are the story's own first sentences", () => {
  const markdown = [
    "## The Briefing",
    "{% bigstory %}",
    "### Lead headline is sourced.",
    "Lead sentence one. Lead sentence two. Lead sentence three.",
    "<p class=\"source-line\">Sources: <a href=\"https://example.com/lead\">City</a></p>",
    "{% endbigstory %}",
    "## Notices",
    "{% river %}",
    "##### A notice comes first in the file.",
    "Notice sentence one. Notice sentence two.",
    "<span class=\"src\"><a href=\"https://example.com/notice\">City memo</a></span>",
    "{% endriver %}",
    "## News",
    "{% river %}",
    "##### News story one is short.",
    "Only one news sentence.",
    "<span class=\"src\"><a href=\"https://example.com/one\">KUT</a></span>",
    "##### News story two runs long.",
    "Alpha sentence is kept. Beta sentence is kept. Gamma sentence is not.",
    "<span class=\"src\"><a href=\"https://example.com/two\">KXAN</a> · <a href=\"https://example.com/three\">City</a></span>",
    "{% endriver %}"
  ].join("\n");
  const edition = homeEdition(markdown);
  const stories = listed(edition);
  assert.deepEqual(stories.map((story) => story.section), ["News", "News", "Notices"]);
  assert.equal(stories[0].summary, "Only one news sentence.");
  assert.equal(stories[1].summary, "Alpha sentence is kept. Beta sentence is kept.");
  assert.equal(stories[1].sourcesHtml.includes("https://example.com/two"), true);
  assert.equal(stories[1].sourcesHtml.includes("https://example.com/three"), true);
  assert.equal(stories[2].title, "A notice comes first in the file.");
  assert.equal(edition.leadAnchor, "lead-headline-is-sourced");
  assert.equal(stories[1].signupAfter, true);
  assert.equal(edition.signupAfterLead, false);
  for (const story of stories) {
    assert.equal(FIRST_PERSON.test(story.summary), false, story.summary);
    assert.equal(FIRST_PERSON.test(story.title), false, story.title);
  }
});

test("a short edition keeps the signup after the last story", () => {
  const markdown = [
    "{% bigstory %}",
    "### Only the lead.",
    "<p class=\"source-line\">Sources: <a href=\"https://example.com/lead\">City</a></p>",
    "{% endbigstory %}"
  ].join("\n");
  const edition = homeEdition(markdown);
  assert.equal(edition.sections.length, 0);
  assert.equal(edition.signupAfterLead, true);
});

test("November 5 lists every headed story, news before notices", () => {
  const edition = homeEdition(readFileSync("src/bulletins/2026-11-05.md", "utf8"));
  const stories = listed(edition);
  assert.deepEqual(stories.map((story) => story.title), [
    "Council meets today for the first time since the election.",
    "Pedestrians are most of Austin's latest traffic deaths.",
    "Voters can still register for the open council runoffs.",
    "A new governor may not be able to stop state intervention in Austin schools, KUT reports.",
    "City budget cuts are shrinking help for older Austinites, nonprofits say.",
    "Austin may drop commercial plan review for triplexes and fourplexes."
  ]);
  assert.deepEqual(stories.map((story) => story.section), [
    "News", "News", "News", "News", "News", "Notices"
  ]);
  assert.equal(stories[1].signupAfter, true);
  assert.equal(
    stories[1].summary,
    "Austin police reported five fatal crashes from early Sunday, Nov. 1, " +
      "through Tuesday afternoon, Nov. 3. Four were pedestrians."
  );
  assert.match(stories[0].summary, /^The current council convenes at 10 a\.m\./);
  assert.match(stories[0].summary, /item 22\)\.$/);
  assert.equal(stories[0].sourcesHtml.includes("https://www.austintexas.gov/council/2026/20261105-reg"), true);
  assert.equal(edition.leadAnchor, "parking-complaints-are-now-austins-top-311-request");
  const bulletin = readFileSync("src/bulletins/2026-11-05.md", "utf8");
  for (const story of stories) {
    assert.equal(bulletin.includes(story.summary), true, story.summary);
    assert.equal(FIRST_PERSON.test(`${story.title} ${story.summary}`), false);
  }
});
