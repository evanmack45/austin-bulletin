import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { duplicateSentences } from "../scripts/sentences.mjs";
import { pageMetadata } from "../scripts/metadata.mjs";
import {
  councilDidParagraph, inferMeetingDate, loadLiveMeetings, meetingDateForItem,
  meetingDatesIn, pageMeetingDate, withCouncilMeetingLinks, withPreviewMeetingHtml
} from "../scripts/council-meetings.mjs";

const LIVE = new Set(["2026-10-08", "2026-10-22", "2026-08-27", "2026-09-10", "2026-08-18"]);
const LINE = new RegExp(
  '<p class="council-did">What council did: see the <a href="([^"]+)">([^<]+)</a>\\.</p>',
  "g"
);

function links(html) {
  return [...html.matchAll(LINE)].map((match) => ({ href: match[1], label: match[2] }));
}

test("the meeting line names the date and the live meeting page", () => {
  const html = councilDidParagraph("2026-10-22");
  assert.equal(links(html)[0].href, "https://yallcityhall.org/meetings/2026-10-22/");
  assert.equal(links(html)[0].label, "Oct. 22 meeting on Y'all City Hall");
});

test("a council vote on a listed date links, and the story sentence stays", () => {
  const story = "The City Council voted October 8 to designate the auditorium.";
  const html = withCouncilMeetingLinks(
    `<section class="big-story"><h3>Doris Miller</h3><p>${story}</p>` +
    `<p class="source-line">Sources: <a href="https://example.com/city">City</a></p></section>`,
    "2026-10-11",
    LIVE
  );
  assert.equal(links(html).length, 1);
  assert.equal(links(html)[0].href, "https://yallcityhall.org/meetings/2026-10-08/");
  assert.ok(html.includes(story));
});

test("a date with no live meeting page adds nothing", () => {
  const html = withCouncilMeetingLinks(
    `<section class="big-story"><p>The City Council voted October 1 to wait.</p></section>`,
    "2026-10-02",
    LIVE
  );
  assert.equal(links(html).length, 0);
  assert.equal(html.includes("yallcityhall.org/meetings"), false);
});

test("council races and another city's council do not link", () => {
  const races = "Eight Austin City Council candidates missed the Aug. 24 deadline.";
  const kyle = "Kyle's City Council approved a task order on Aug. 18.";
  const html = withCouncilMeetingLinks(
    `<div class="river"><h4>City Hall</h4><p>${races}</p><p>${kyle}</p></div>`,
    "2026-10-03",
    LIVE
  );
  assert.equal(links(html).length, 0);
  assert.ok(html.includes(races));
  assert.ok(html.includes(kyle));
});

test("Thursday's Council agenda on Monday, Oct. 5 points at Oct. 8", () => {
  const item = "Thursday's Council agenda proposes a contract. " +
    `<span class="src"><a href="https://example.com/a">City Council agenda · item 3</a></span>`;
  const html = withCouncilMeetingLinks(
    `<div class="river"><h4>Growth</h4><p>${item}</p>` +
    `<p>The park stays open. <span class="src">Parks</span></p></div>`,
    "2026-10-05",
    LIVE
  );
  assert.deepEqual(links(html).map((link) => link.href), [
    "https://yallcityhall.org/meetings/2026-10-08/"
  ]);
});

test("a lead links and a nested voice card does not become its own item", () => {
  const html = withCouncilMeetingLinks(
    `<div class="river river--tiered"><h4>City Hall</h4>` +
    `<h5 id="doris">Doris Miller</h5>` +
    `<p>The City Council voted October 8 to designate the auditorium.</p>` +
    `<figure class="voice-card"><div class="voice-head"><p>Not a council item.</p></div></figure>` +
    `<p class="brief-slug">Also</p>` +
    `<p>Neighbors repaved the street.</p></div>`,
    "2026-10-11",
    LIVE
  );
  assert.equal(links(html).length, 1);
  assert.ok(html.indexOf("brief-slug") > html.indexOf("council-did"));
});

test("today's agenda wins over a background vote in the same story", () => {
  const text = "Item 22 on this morning's Council agenda would add rent help. " +
    "It follows a September 24 vote that reached Council nine minutes later.";
  assert.equal(inferMeetingDate(text, "2026-10-22"), "2026-10-22");
});

test("an explicit meeting comment is the date, and a dead one stays blank", () => {
  const raw = "<!-- desk:meeting 2026-10-22 -->\n<p>The park trail opened.</p>";
  assert.equal(meetingDateForItem(raw, "2026-10-30", LIVE), "2026-10-22");
  assert.equal(meetingDateForItem(raw, "2026-10-30", new Set()), "");
});

test("a present-tense item on meeting day uses that edition date", () => {
  const text = "Council also votes on item 27, adding money to the airport contract.";
  assert.equal(inferMeetingDate(text, "2026-10-22"), "2026-10-22");
  assert.equal(inferMeetingDate(text, "2026-10-21"), "2026-10-21");
  assert.equal(meetingDateForItem(`<p>${text}</p>`, "2026-10-21", LIVE), "");
});

test("a council preview page gets one line under its headline", () => {
  const story = "<h2>Austin Council on October 22</h2><p>Three items worth following.</p>";
  const html = withPreviewMeetingHtml(story, "/council/2026-10-22-preview/", "", LIVE);
  assert.equal(links(html).length, 1);
  assert.ok(html.includes("Three items worth following."));
  assert.equal(pageMeetingDate("/2026/10/22/", "2026-10-22"), "");
  assert.equal(pageMeetingDate("/guides/budget/", "2026-08-12"), "2026-08-12");
});

test("the same council line twice is not a duplicate sentence", () => {
  const line = councilDidParagraph("2026-10-22");
  assert.deepEqual(duplicateSentences(`<article>${line}${line}</article>`), []);
});

test("the council line is not the edition description", () => {
  const html = `<h1 class="edition-date">October 22, 2026</h1><section class="big-story">` +
    `<h3>Council meets</h3>${councilDidParagraph("2026-10-22")}` +
    `<p>The City Council voted on the airport contract.</p></section>`;
  const meta = pageMetadata("/2026/10/22/", "Edition", html);
  assert.equal(meta.description, "The City Council voted on the airport contract.");
});

test("listed meeting URLs stay linked only when the final response is 200", async () => {
  const feed = "<rss><link>https://yallcityhall.org/meetings/2026-10-22/</link>" +
    "<link>https://yallcityhall.org/meetings/2026-01-01/</link>" +
    "<link>https://yallcityhall.org/meetings/2026-08-01/</link></rss>";
  const fetchImpl = async (url) => {
    if (String(url).endsWith("/feed.xml")) return { status: 200, text: async () => feed };
    if (String(url).includes("2026-10-22")) {
      return { status: 200, url, body: { cancel: async () => {} } };
    }
    if (String(url).includes("2026-08-01")) {
      return { status: 200, url: "https://yallcityhall.org/", body: { cancel: async () => {} } };
    }
    if (String(url).includes("2026-01-01")) {
      return { status: 404, url, body: { cancel: async () => {} } };
    }
    return { status: 500, text: async () => "" };
  };
  const live = await loadLiveMeetings({ fetchImpl });
  assert.deepEqual([...live], ["2026-10-22"]);
});

test("a league end date is not the meeting, even when council approved the cut", () => {
  const text = "The Austin Parks and Recreation Department will end all adult indoor sports " +
    "leagues on Oct. 1, a cut approved by City Council in the fiscal 2027 budget.";
  assert.equal(inferMeetingDate(text, "2026-08-26"), "");
});

test("Thursday's meetings that open today still point at Thursday", () => {
  const text = "Speaker registration for Thursday's City Council meetings opens today at 10 a.m.";
  assert.equal(inferMeetingDate(text, "2026-10-05"), "2026-10-08");
});

test("a past vote wins over the next meeting named later in the story", () => {
  const text = "On Aug. 27 the City Council passed a resolution on the rail station. " +
    "Austin City Council's next regular meeting is Thursday, Sept. 10.";
  assert.equal(inferMeetingDate(text, "2026-09-06"), "2026-08-27");
});

test("the reliability council is not Austin City Council", () => {
  const text = "The Electric Reliability Council of Texas approved a six-year contract on Tuesday.";
  assert.equal(inferMeetingDate(text, "2026-09-16"), "");
});

test("Thursday's agenda plus a City Council source points at that Thursday", () => {
  const text = "Thursday's agenda includes a hearing for Elm Ridge Apartments. " +
    "City Council agenda, item 27.";
  assert.equal(inferMeetingDate(text, "2026-10-05"), "2026-10-08");
});

test("contracts pulled from Thursday's agenda point at the Thursday that passed", () => {
  const text = "City Council pulled a package of consulting contracts from Thursday's agenda.";
  assert.equal(inferMeetingDate(text, "2026-09-11"), "2026-09-10");
});

test("Oct. 22 still links when a long agency name sits between council and the date", () => {
  const text = "The City of Austin says the Austin City Council and the Austin Housing Finance " +
    "Corporation approved more than $21 million on Oct. 22 for five rental developments.";
  assert.equal(inferMeetingDate(text, "2026-10-23"), "2026-10-22");
});

test("told Council on Thursday points at the nearest Thursday", () => {
  const text = "A business owner told Council on Thursday the drawdown would cost jobs.";
  assert.equal(inferMeetingDate(text, "2026-09-11"), "2026-09-10");
});

test("the feed parser keeps meeting dates and ignores other paths", () => {
  const xml = '<link>https://yallcityhall.org/meetings/2026-10-22/</link>' +
    '<link>https://yallcityhall.org/agenda/</link>';
  assert.deepEqual(meetingDatesIn(xml), ["2026-10-22"]);
});

test("the council line is 16px text with a 24px link target", () => {
  const css = readFileSync("src/css/style.css", "utf8");
  assert.match(css, /\.council-did,\s*\n\.bulletin \.council-did \{[^}]*font-size: 1rem;/);
  assert.match(css, /\.council-did a \{[^}]*min-height: 24px;/);
  assert.match(css, /\.council-did a \{[^}]*min-width: 24px;/);
});
