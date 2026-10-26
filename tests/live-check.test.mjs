import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alternateFeedUrl, dateFormats, expectedDate, hasKitEmbed, newestEntryDate,
  pageShowsDate, parseFeed, runLiveCheck
} from "../scripts/live-check.mjs";

const EVENING = new Date("2026-10-27T01:00:00Z");
const WINTER_EVENING = new Date("2026-01-16T02:00:00Z");

test("8 p.m. Central still expects that calendar day", () => {
  assert.equal(expectedDate("", EVENING), "2026-10-26");
  assert.equal(EVENING.toISOString().slice(0, 10), "2026-10-27");
  assert.equal(expectedDate("", WINTER_EVENING), "2026-01-15");
  assert.equal(expectedDate("2026-03-09", EVENING), "2026-03-09");
  assert.throws(() => expectedDate("2026-02-31", EVENING), /bad date/);
});

test("date phrases use each site's real homepage format", () => {
  const formats = dateFormats("2026-10-26");
  assert.deepEqual(formats.bulletin, ["Monday, Oct. 26"]);
  assert.deepEqual(formats.ych, [
    "Site built Monday, October 26, 2026",
    "Updated Oct. 26"
  ]);
  assert.deepEqual(dateFormats("2026-09-05").bulletin, ["Saturday, Sept. 5"]);
  assert.deepEqual(dateFormats("2026-03-09").bulletin, ["Monday, March 9"]);
  assert.deepEqual(dateFormats("2026-06-01").bulletin, ["Monday, June 1"]);
  assert.deepEqual(dateFormats("2026-08-23").bulletin, ["Sunday, Aug. 23"]);
});

test("a homepage matches any accepted phrase and not a shorter day", () => {
  const formats = dateFormats("2026-10-26");
  const masthead = "<p class=\"masthead-dateline\">Monday, Oct. 26 <span>extra</span></p>";
  assert.equal(pageShowsDate(masthead, formats.bulletin), true);
  assert.equal(pageShowsDate("Monday, Oct. 2", formats.bulletin), false);
  assert.equal(pageShowsDate("Monday, Oct. 26", dateFormats("2026-10-02").bulletin), false);
  const meta = "<meta name=\"edition-date\" content=\"2026-10-26\">";
  assert.equal(pageShowsDate(meta, formats.bulletin), false);
  const built = "<p class=\"built\">Site built Monday, October 26, 2026</p>";
  assert.equal(pageShowsDate(built, formats.ych), true);
  assert.equal(pageShowsDate("Updated Oct.&nbsp;26", formats.ych), true);
  assert.equal(pageShowsDate("As of 7:50 a.m. Oct. 26 the City", formats.ych), false);
  assert.equal(pageShowsDate("Updated Oct. 2", formats.ych), false);
});

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <updated>2026-10-26T00:00:00Z</updated>
  <entry>
    <title>Older</title>
    <updated>2026-10-25T00:00:00Z</updated>
    <content type="html">&lt;p&gt;2026-12-01&lt;/p&gt;</content>
  </entry>
  <entry>
    <title>A &amp; B</title>
    <link href="https://theaustinbulletin.com/2026/10/26/" />
    <updated>2026-10-26T00:00:00Z</updated>
    <content><![CDATA[<p>2026-01-01</p>]]></content>
  </entry>
</feed>`;

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <link>https://yallcityhall.org/meetings/</link>
    <item>
      <title>Meeting date: Thursday, October 22, 2026</title>
      <link>https://yallcityhall.org/meetings/2026-10-08/</link>
    </item>
    <item>
      <pubDate>Mon, 26 Oct 2026 20:00:00 -0500</pubDate>
      <link>https://example.com/no-date</link>
    </item>
    <item>
      <dc:date>2026-09-24T15:00:00Z</dc:date>
      <link>https://yallcityhall.org/meetings/2026-10-22/</link>
    </item>
  </channel>
</rss>`;

test("an Atom feed reports the newest entry updated date", () => {
  const feed = parseFeed(ATOM);
  assert.equal(feed.entries.length, 2);
  assert.equal(newestEntryDate(feed), "2026-10-26");
});

test("an RSS feed reads pubDate, dc:date, and the link date", () => {
  const feed = parseFeed(RSS);
  assert.deepEqual(feed.entries.map((entry) => entry.date), [
    "2026-10-08",
    "2026-10-26",
    "2026-09-24"
  ]);
  assert.equal(newestEntryDate(feed), "2026-10-26");
});

test("a feed with no entries and a broken feed both fail closed", () => {
  const empty = parseFeed("<rss version=\"2.0\"><channel><title>x</title></channel></rss>");
  assert.deepEqual(empty.entries, []);
  assert.equal(newestEntryDate(empty), null);
  assert.throws(() => parseFeed("<rss><channel><item></channel></rss>"), /mismatched/);
  assert.throws(() => parseFeed("not xml"), /unparsed|root/);
  assert.throws(() => parseFeed("<html><body></body></html>"), /not a feed/);
});

test("the alternate link is the feed URL", () => {
  const bulletin = "<link rel=\"stylesheet\" href=\"/style.css\">" +
    "<link rel=\"alternate\" type=\"application/atom+xml\" href=\"/feed.xml\">";
  assert.equal(
    alternateFeedUrl(bulletin, "https://theaustinbulletin.com/"),
    "https://theaustinbulletin.com/feed.xml"
  );
  const ych = "<link rel='alternate' type='application/rss+xml' " +
    "href='https://yallcityhall.org/meetings/feed.xml'>";
  assert.equal(
    alternateFeedUrl(ych, "https://yallcityhall.org/"),
    "https://yallcityhall.org/meetings/feed.xml"
  );
  assert.equal(alternateFeedUrl("<link rel=\"alternate\" href=\"/feed.xml\">",
    "https://theaustinbulletin.com/"), "");
});

test("the Kit embed is a form or script, not the content security policy", () => {
  const csp = "<meta http-equiv=\"Content-Security-Policy\" " +
    "content=\"script-src https://the-austin-bulletin.kit.com\">";
  const embed = "<script async data-uid=\"e956043af1\" " +
    "src=\"https://the-austin-bulletin.kit.com/e956043af1/index.js\"></script>";
  assert.equal(hasKitEmbed(csp), false);
  assert.equal(hasKitEmbed(embed), true);
  assert.equal(hasKitEmbed("<form action=\"https://app.kit.com/forms/1\"></form>"), true);
  assert.equal(hasKitEmbed(""), false);
});

function pages(map) {
  return async (url, options) => {
    assert.equal(options.redirect, "follow");
    assert.match(options.headers["user-agent"], /TheAustinBulletin\/1\.0/);
    const body = map[url];
    if (body === undefined) return { status: 404, async text() { return ""; } };
    return { status: 200, async text() { return body; } };
  };
}

const HOME = "https://theaustinbulletin.com/";
const FEED = "https://theaustinbulletin.com/feed.xml";
const SUB = "https://theaustinbulletin.com/subscribe/";
const YCH = "https://yallcityhall.org/";
const YCH_FEED = "https://yallcityhall.org/meetings/feed.xml";

function bulletinHome(dateLine, kit) {
  const embed = kit
    ? "<script src=\"https://the-austin-bulletin.kit.com/e956043af1/index.js\"></script>"
    : "";
  return `<link rel="alternate" type="application/atom+xml" href="/feed.xml">
    <p class="masthead-dateline">${dateLine}</p>${embed}`;
}

function atomFeed(day) {
  return `<?xml version="1.0"?><feed><entry><updated>${day}T00:00:00Z</updated></entry></feed>`;
}

test("a story date does not stand in for the Bulletin masthead", async () => {
  const lines = [];
  const home = `<link rel="alternate" type="application/atom+xml" href="/feed.xml">
    <p>Through Sunday, Oct. 25, ballots were cast.</p>
    <p class="masthead-dateline">Monday, Oct. 26 <span>Previous edition: October 25</span></p>
    <script src="https://the-austin-bulletin.kit.com/e956043af1/index.js"></script>`;
  const code = await runLiveCheck({
    argv: ["--site", "bulletin", "--date", "2026-10-25"],
    log: (line) => lines.push(line),
    fetch: pages({ [HOME]: home, [FEED]: atomFeed("2026-10-26") })
  });
  assert.equal(code, 1);
  assert.ok(lines.includes("FAIL bulletin date missing Sunday, Oct. 25"));
});

test("a bulletin run at 8 p.m. Central passes today's masthead", async () => {
  const lines = [];
  const code = await runLiveCheck({
    argv: ["--site", "bulletin"],
    now: EVENING,
    log: (line) => lines.push(line),
    fetch: pages({
      [HOME]: bulletinHome("Monday, Oct. 26", true),
      [FEED]: atomFeed("2026-10-26")
    })
  });
  assert.equal(code, 0);
  assert.deepEqual(lines, [
    "PASS bulletin homepage HTTP 200",
    "PASS bulletin date Monday, Oct. 26",
    `PASS bulletin feed HTTP 200 newest 2026-10-26 ${FEED}`,
    "PASS bulletin kit embed on homepage"
  ]);
});

test("the Kit check accepts the subscribe page when the homepage has none", async () => {
  const lines = [];
  const code = await runLiveCheck({
    argv: ["--site", "bulletin", "--date", "2026-10-26"],
    log: (line) => lines.push(line),
    fetch: pages({
      [HOME]: bulletinHome("Monday, Oct. 26", false),
      [FEED]: atomFeed("2026-10-26"),
      [SUB]: "<form action=\"https://app.convertkit.com/forms/1\"></form>"
    })
  });
  assert.equal(code, 0);
  assert.equal(lines.at(-1), "PASS bulletin kit embed on /subscribe/");
});

test("one failed site check fails the run and names the miss", async () => {
  const lines = [];
  const code = await runLiveCheck({
    argv: ["--date", "2026-10-26"],
    log: (line) => lines.push(line),
    fetch: pages({
      [HOME]: bulletinHome("Sunday, Oct. 25", true),
      [FEED]: atomFeed("2026-10-25"),
      [YCH]: `<link rel="alternate" type="application/rss+xml" href="${YCH_FEED}">
        <p>Site built Monday, October 26, 2026</p>`,
      [YCH_FEED]: `<rss version="2.0"><channel><item>
        <link>https://yallcityhall.org/meetings/2026-10-22/</link></item></channel></rss>`
    })
  });
  assert.equal(code, 1);
  assert.ok(lines.includes("FAIL bulletin date missing Monday, Oct. 26"));
  assert.ok(lines.includes(`PASS ych feed HTTP 200 newest 2026-10-22 ${YCH_FEED}`));
  assert.equal(lines.some((line) => line.startsWith("PASS ych kit")), false);
});

test("a missing feed link and a bad argument are failures", async () => {
  const lines = [];
  const code = await runLiveCheck({
    argv: ["--site", "ych", "--date", "2026-10-26"],
    log: (line) => lines.push(line),
    fetch: pages({ [YCH]: "<p>Site built Monday, October 26, 2026</p>" })
  });
  assert.equal(code, 1);
  assert.ok(lines.includes("FAIL ych feed no alternate link"));
  const bad = [];
  const usage = await runLiveCheck({
    argv: ["--site", "both"],
    log: (line) => bad.push(line),
    fetch: pages({})
  });
  assert.equal(usage, 1);
  assert.match(bad[0], /FAIL live-check --site must be bulletin or ych/);
});
