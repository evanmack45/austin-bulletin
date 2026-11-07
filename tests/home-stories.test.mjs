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
  assert.equal(stories[0].signupAfter, false);
  assert.equal(stories[1].signupAfter, true);
  assert.equal(stories.filter((story) => story.signupAfter).length, 1);
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

test("one, two, and three stories place a single signup", () => {
  function editionWith(count) {
    const lines = ["{% bigstory %}", "### Lead story.", "{% endbigstory %}"];
    if (count > 1) {
      lines.push("## News", "{% river %}");
      for (let n = 2; n <= count; n += 1) {
        lines.push(`##### Listed story ${n}.`, "A sentence.");
      }
      lines.push("{% endriver %}");
    }
    const edition = homeEdition(lines.join("\n"));
    const stories = listed(edition);
    return { edition, stories };
  }
  const one = editionWith(1);
  assert.equal(one.stories.length, 0);
  assert.equal(one.edition.signupAfterLead, true);
  const two = editionWith(2);
  assert.equal(two.stories.length, 1);
  assert.equal(two.edition.signupAfterLead, true);
  assert.equal(two.stories[0].signupAfter, false);
  const three = editionWith(3);
  assert.equal(three.stories.length, 2);
  assert.equal(three.edition.signupAfterLead, false);
  assert.equal(three.stories[0].signupAfter, false);
  assert.equal(three.stories[1].signupAfter, true);
  assert.equal(three.stories.filter((story) => story.signupAfter).length, 1);
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
  assert.equal(stories.findIndex((story) => story.signupAfter), 1);
  assert.equal(stories.filter((story) => story.signupAfter).length, 1);
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

test("November 7 lists news before notices and keeps every source link", () => {
  const bulletin = readFileSync("src/bulletins/2026-11-07.md", "utf8");
  const edition = homeEdition(bulletin);
  const stories = listed(edition);
  assert.deepEqual(stories.map((story) => story.title), [
    "Austin will rewrite APD's rules on working with U.S. Immigration and Customs " +
      "Enforcement (ICE) before Hinojosa takes office, KUT reports.",
    "Council's Nov. 19 draft agenda: Muny-UT deal changes, a $25 million trail " +
      "boardwalk and $55 million for Hornsby Bend.",
    "Ten affordable townhomes for sale break ground on Menchaca Road, with " +
      "2-bedrooms capped at $253,000.",
    "Police charge two in Northeast Austin copper-cable thefts and seek one of " +
      "them; a separate East Seventh café burglary is charged.",
    "Senfronia Thompson says she has the votes to be Texas House speaker after " +
      "Democrats won the chamber.",
    "Veterans parade steps off at 9 this morning; expect downtown closures.",
    "Cyclovia ATX brings a mile-long bike parade to Windsor Park today."
  ]);
  assert.deepEqual(stories.map((story) => story.section), [
    "News", "News", "News", "News", "News", "Notices", "Notices"
  ]);
  assert.equal(stories[0].signupAfter, false);
  assert.equal(stories[1].signupAfter, true);
  assert.equal(stories.filter((story) => story.signupAfter).length, 1);
  assert.equal(edition.signupAfterLead, false);
  assert.equal(
    edition.leadAnchor,
    "austins-48th-homicide-of-2026-came-a-week-before-2025s"
  );
  assert.match(stories[2].summary, /\$253,000/);
  assert.match(stories[1].sourcesHtml, /document\.cfm\?id=484837/);
  assert.match(stories[1].sourcesHtml, /20261119-reg/);
  assert.match(stories[3].sourcesHtml, /apd-arrests-suspect-copper-cable-theft/);
  assert.match(stories[3].sourcesHtml, /apd-arrests-suspect-connection-east-austin/);
  for (const url of [
    "https://www.austintexas.gov/police/news/homicide-investigation-3909-guadalupe-street",
    "https://www.austintexas.gov/police/news/homicide-investigation-intersection-e-5th-st-and-trinity-st",
    "https://www.kxan.com/news/local/austin/austin-homicide-map-2025/",
    "https://www.kut.org/crime-justice/2026-11-06/austin-tx-apd-police-department-ice-policies-hinojosa-abbott",
    "https://services.austintexas.gov/edims/document.cfm?id=484837",
    "https://www.austintexas.gov/council/2026/20261119-reg",
    "https://www.austintexas.gov/housing/news/new-affordable-menchaca-townhomes-bring-ten-homeownership-opportunities-south-austin",
    "https://www.austintexas.gov/police/news/apd-arrests-suspect-copper-cable-theft-series-seeks-public-assistance-locating-second",
    "https://www.austintexas.gov/police/news/apd-arrests-suspect-connection-east-austin-commercial-burglary-series",
    "https://www.kut.org/politics/2026-11-06/texas-house-speaker-senfronia-thompson-democrats",
    "https://www.austintexas.gov/communications/news/celebrate-veterans-day-70th-annual-parade-nov-7",
    "https://www.austintexas.gov/communications/news/ghisallo-cycling-initiatives-cyclovia-atx-happening-nov-7"
  ]) {
    assert.equal(bulletin.includes(url), true, url);
  }
  assert.match(bulletin, /No charges have been filed/);
  assert.match(bulletin, /Bruce Williams, 61/);
  assert.equal(bulletin.includes("December 3, 2027"), false);
  assert.equal(bulletin.includes("Editor notes"), false);
  assert.equal(bulletin.includes("[ORIGINAL]"), false);
  assert.equal(bulletin.includes("[REPORT]"), false);
  for (const story of stories) {
    assert.equal(bulletin.includes(story.summary), true, story.summary);
    assert.equal(FIRST_PERSON.test(`${story.title} ${story.summary}`), false);
  }
});

test("four stories sign up on the third, counting the lead", () => {
  // The lead is story 1. The signup follows the second listed story.
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
  assert.equal(stories[0].signupAfter, false);
  assert.equal(stories[1].signupAfter, true);
  assert.equal(stories[2].signupAfter, false);
  assert.equal(stories.filter((story) => story.signupAfter).length, 1);
  assert.equal(edition.signupAfterLead, false);
});

test("November 7 keeps the speaker story next to Notices", () => {
  const edition = homeEdition(readFileSync("src/bulletins/2026-11-07.md", "utf8"));
  const stories = listed(edition);
  const speaker = stories.findIndex((story) => (
    story.title.startsWith("Senfronia Thompson says she has the votes")
  ));
  const notices = stories.findIndex((story) => story.section === "Notices");
  assert.equal(notices, speaker + 1);
  assert.equal(stories[1].signupAfter, true);
  assert.equal(stories.filter((story) => story.signupAfter).length, 1);
  assert.equal(edition.signupAfterLead, false);
});
