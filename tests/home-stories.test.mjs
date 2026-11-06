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
  assert.equal(stories[0].signupAfter, true);
  assert.equal(stories[1].signupAfter, false);
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

test("two stories still keep the signup after the lead", () => {
  const markdown = [
    "{% bigstory %}",
    "### Only the lead.",
    "{% endbigstory %}",
    "## News",
    "{% river %}",
    "##### One more story.",
    "A sentence follows.",
    "{% endriver %}"
  ].join("\n");
  const edition = homeEdition(markdown);
  const stories = listed(edition);
  assert.equal(stories.length, 1);
  assert.equal(stories[0].signupAfter, false);
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
  assert.equal(stories.findIndex((story) => story.signupAfter), 0);
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

test("November 6 lists news before the notice and keeps every source link", () => {
  const bulletin = readFileSync("src/bulletins/2026-11-06.md", "utf8");
  const edition = homeEdition(bulletin);
  const stories = listed(edition);
  assert.deepEqual(stories.map((story) => story.title), [
    "City will spend up to $5.48 million on land for the Rutland-to-Northgate trail.",
    "Mobility Committee meets Thursday on the downtown Core Transportation Plan.",
    "Hinojosa’s first transition picks put public schools and labor at the table, KUT reports.",
    "Council canvasses the election Nov. 17; the next regular meeting is Nov. 19.",
    "Veterans Day parade rolls Saturday from South Congress to the Capitol."
  ]);
  assert.deepEqual(stories.map((story) => story.section), [
    "News", "News", "News", "News", "Notices"
  ]);
  assert.equal(stories[0].signupAfter, true);
  assert.equal(edition.signupAfterLead, false);
  assert.equal(
    edition.leadAnchor,
    "council-clears-austin-energy-bonds-and-a-housing-blueprint-rewrite"
  );
  assert.match(stories[0].summary, /\$5,481,865/);
  assert.match(stories[0].sourcesHtml, /action_notes\.cfm\?mid=1520/);
  assert.match(stories[3].sourcesHtml, /document\.cfm\?id=472487/);
  assert.match(stories[3].sourcesHtml, /document\.cfm\?id=462100/);
  for (const url of [
    "https://services.austintexas.gov/edims/document.cfm?id=484316",
    "https://www.austintexas.gov/council/2026/20261105-reg",
    "https://services.austintexas.gov/edims/document.cfm?id=484329",
    "https://services.austintexas.gov/edims/document.cfm?id=484389",
    "https://services.austintexas.gov/edims/document.cfm?id=484397",
    "https://www.austintexas.gov/council/2026/20261112-mobc",
    "https://www.kut.org/2026-11-05/gina-hinojosa-texas-governor-transition-team",
    "https://www.austintexas.gov/communications/news/celebrate-veterans-day-70th-annual-parade-nov-7"
  ]) {
    assert.equal(bulletin.includes(url), true, url);
  }
  assert.match(bulletin, /approved as amended/);
  assert.match(bulletin, /Action Notes are labeled tentative/);
  assert.match(bulletin, /hardship for two units does not exist/);
  assert.equal(bulletin.includes("Editor notes"), false);
  assert.equal(bulletin.includes("Watershed recommended denial"), false);
  assert.equal(bulletin.includes("[ORIGINAL]"), false);
  assert.equal(bulletin.includes("[REPORT]"), false);
  for (const story of stories) {
    assert.equal(bulletin.includes(story.summary), true, story.summary);
    assert.equal(FIRST_PERSON.test(`${story.title} ${story.summary}`), false);
  }
});

test("four news stories sign up on the first listed story", () => {
  // Three stories including the lead are already counted by the notices test.
  // One story under the lead is already covered by the short-edition test.
  const markdown = [
    "{% bigstory %}",
    "### The lead story.",
    "Lead sentence.",
    "{% endbigstory %}",
    "## News",
    "{% river %}",
    "##### First listed story.",
    "First sentence.",
    "##### Second listed story.",
    "Second sentence.",
    "##### Third listed story.",
    "Third sentence.",
    "{% endriver %}"
  ].join("\n");
  const edition = homeEdition(markdown);
  const stories = listed(edition);
  assert.deepEqual(stories.map((story) => story.title), [
    "First listed story.",
    "Second listed story.",
    "Third listed story."
  ]);
  assert.equal(stories[0].signupAfter, true);
  assert.equal(stories[1].signupAfter, false);
  assert.equal(stories[2].signupAfter, false);
  assert.equal(edition.signupAfterLead, false);
});

test("November 6 keeps Council canvasses next to Notices", () => {
  const edition = homeEdition(readFileSync("src/bulletins/2026-11-06.md", "utf8"));
  const stories = listed(edition);
  const canvass = stories.findIndex((story) => (
    story.title.startsWith("Council canvasses the election")
  ));
  const notices = stories.findIndex((story) => story.section === "Notices");
  assert.equal(notices, canvass + 1);
  assert.equal(stories[0].signupAfter, true);
  assert.equal(edition.signupAfterLead, false);
});
