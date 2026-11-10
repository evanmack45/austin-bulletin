import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { wrapRiverStories } from "../scripts/edition-chrome.mjs";
import { homeEdition } from "../scripts/home-stories.mjs";
import {
  consolidateStorySources,
  normalizeBulletin
} from "../scripts/story-sources.mjs";
import {
  parseReaderAction,
  readerActionMarkup,
  withReaderActions
} from "../scripts/reader-action.mjs";

const COVER = readFileSync("src/css/front-cover.css", "utf8");
const HOME = readFileSync("src/index.njk", "utf8");
const BULLETIN = readFileSync("src/_includes/bulletin.njk", "utf8");
const SPEAK = "https://www.traviscountytx.gov/commissioners-court";

function render(markdown) {
  const html = normalizeBulletin(markdown).replace(
    /(<div class="river[^"]*">[\s\S]*)(<\/div>)/,
    "$1<p class=\"to-top\"><a href=\"#top\">Back to top</a></p>\n$2"
  );
  return wrapRiverStories(withReaderActions(consolidateStorySources(html)));
}

function river(items) {
  return ["{% river %}", ...items, "{% endriver %}"].join("\n");
}

test("a sourced action renders after the body and before the source line", () => {
  const html = render(river([
    "##### County court meets Thursday.",
    "The court meets at 9:00 a.m.",
    "<!-- action_text: Register to speak at Commissioners Court -->",
    `<!-- action_url: ${SPEAK} -->`,
    `<span class="src">Source: <a href="${SPEAK}">Commissioners Court page</a></span>`,
    "##### A notice has no action.",
    "Rain is likely tonight.",
    "<span class=\"src\">Source: <a href=\"https://forecast.weather.gov/MapClick.php?lat=30.27&lon=-97.74\">NWS</a></span>"
  ]));
  const action = html.match(/<p class="what-you-can-do">[\s\S]*?<\/p>/g) || [];
  assert.equal(action.length, 1);
  assert.match(action[0], /What you can do:/);
  assert.match(action[0], new RegExp(`href="${SPEAK}"`));
  assert.match(action[0], />Register to speak at Commissioners Court\.</);
  assert.doesNotMatch(action[0], /https?:\/\/[^\s"<]+<\/a>/);
  const story = html.slice(html.indexOf("County court"), html.indexOf("A notice"));
  assert.ok(story.indexOf("9:00 a.m.") < story.indexOf("what-you-can-do"));
  assert.ok(story.indexOf("what-you-can-do") < story.indexOf("source-line"));
  assert.match(story, /what-you-can-do">[\s\S]*source-line">/);
  assert.equal(html.includes("action_text"), false);
  assert.equal(html.includes("action_url"), false);
  const notice = html.slice(html.indexOf("A notice"));
  assert.equal(notice.includes("what-you-can-do"), false);
  assert.match(notice, /class="source-line"/);
});

test("the last story keeps the action inside the story, ahead of its source", () => {
  const html = render(river([
    "##### Only the last item has an action.",
    "The meeting is Thursday.",
    "<!-- action_text: Council Committee speaker signup instructions -->",
    "<!-- action_url: https://www.austintexas.gov/council/council_committee_info_center -->",
    "<span class=\"src\">Source: <a href=\"https://www.austintexas.gov/council/2026/20261112-mobc\">Nov. 12 page</a></span>"
  ]));
  assert.match(
    html,
    /what-you-can-do">[\s\S]*source-line">[\s\S]*<\/div>\s*<p class="to-top">/
  );
  assert.doesNotMatch(html, /to-top">[\s\S]*what-you-can-do/);
});

test("a missing or unsafe action renders nothing", () => {
  assert.equal(parseReaderAction("Just the body."), null);
  assert.equal(parseReaderAction("<!-- action_text: Register to vote -->"), null);
  assert.equal(readerActionMarkup(null), "");
  assert.equal(
    readerActionMarkup(parseReaderAction(
      "<!-- action_text: Register to vote -->\n<!-- action_url: javascript:alert(1) -->"
    )),
    ""
  );
  const html = render(river([
    "##### No fields.",
    "Body only.",
    "<span class=\"src\">Source: <a href=\"https://example.com/one\">City</a></span>",
    "##### A raw address is not a label.",
    "Body.",
    "<!-- action_text: https://example.com/secret -->",
    "<!-- action_url: https://example.com/secret -->",
    "<span class=\"src\">Source: <a href=\"https://example.com/two\">City</a></span>"
  ]));
  assert.equal(html.includes("what-you-can-do"), false);
  assert.equal(html.includes("action_text"), false);
  assert.equal((html.match(/class="source-line"/g) || []).length, 2);
});

test("action text is escaped and the homepage reads the same fields", () => {
  const action = parseReaderAction(
    "<!-- action_text: Register <to> vote -->\n"
    + "<!-- action_url: https://tax-office.traviscountytx.gov/voters/registration -->"
  );
  const markup = readerActionMarkup(action);
  assert.match(markup, /Register &lt;to&gt; vote/);
  assert.doesNotMatch(markup, /<to>/);
  const timed = readerActionMarkup(parseReaderAction(
    "<!-- action_text: Speaker registration opens Monday, November 16, at 10:00 a.m. -->\n"
    + "<!-- action_url: https://www.austintexas.gov/council/meetings -->"
  ));
  assert.match(timed, /10:00 a\.m\.<\/a>/);
  assert.doesNotMatch(timed, /a\.m\.<\/a>\./);
  const edition = homeEdition([
    "{% bigstory %}",
    "### Register by Thursday.",
    "A resident can still register.",
    "<!-- action_text: Register to vote -->",
    "<!-- action_url: https://tax-office.traviscountytx.gov/voters/registration -->",
    "<p class=\"source-line\">Source: <a href=\"https://example.com/cal\">Calendar</a></p>",
    "{% endbigstory %}",
    "## News",
    "{% river %}",
    "##### Court meets Tuesday.",
    "The agenda is posted.",
    "<!-- action_text: Register to speak at Commissioners Court -->",
    `<!-- action_url: ${SPEAK} -->`,
    `<span class="src"><a href="${SPEAK}">Commissioners Court page</a></span>`,
    "##### Weather stays plain.",
    "Tonight is clear.",
    "<span class=\"src\"><a href=\"https://example.com/nws\">NWS</a></span>",
    "{% endriver %}"
  ].join("\n"));
  assert.match(edition.leadActionHtml, /What you can do:/);
  assert.match(edition.leadActionHtml, /Register to vote/);
  const stories = edition.sections.flatMap((section) => section.stories);
  assert.match(stories[0].actionHtml, /Register to speak at Commissioners Court/);
  assert.equal(stories[1].actionHtml, "");
  assert.equal(stories[0].summary.includes("action_text"), false);
  assert.equal(stories[0].summary.includes("Register to speak"), false);
  assert.doesNotMatch(HOME, /What you can do/);
  assert.match(BULLETIN, /withReaderActions/);
});

test("the action line is Georgia body text with a phone-sized tap target", () => {
  assert.match(COVER, /\.what-you-can-do[\s\S]*font-family:\s*Georgia/);
  assert.match(COVER, /\.what-you-can-do[\s\S]*font-size:\s*1\.125rem/);
  assert.match(COVER, /\.what-you-can-do[\s\S]*color:\s*#1b1b1b/);
  assert.match(COVER, /text-wrap:\s*pretty/);
  assert.doesNotMatch(
    COVER.match(/\.what-you-can-do[^{]*\{[^}]*\}/)?.[0] ?? "",
    /border:\s*[1-9]/
  );
  const phone = COVER.match(/@media \(max-width:\s*760px\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(phone, /\.what-you-can-do a[\s\S]*min-height:\s*44px/);
  assert.match(phone, /\.what-you-can-do a[\s\S]*min-width:\s*44px/);
});
