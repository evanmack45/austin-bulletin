import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeEdition } from "../scripts/home-stories.mjs";
import thisWeek from "../src/_data/thisWeek.js";
import { chicagoToday, upcomingOnly } from "../src/_includes/week-upcoming.js";

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
  assert.equal(stories.findIndex((story) => story.signupAfter), 1);
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
  assert.equal(stories[1].signupAfter, true);
  assert.equal(stories[0].signupAfter, false);
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

test("four stories counting the lead sign up after the third", () => {
  // The lead is story one. Signup follows the second listed story.
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
  assert.equal(stories[1].signupAfter, true);
  assert.equal(edition.signupAfterLead, false);
});

test("November 8 lists the runoff lead, then news, then the forecast", () => {
  const bulletin = readFileSync("src/bulletins/2026-11-08.md", "utf8");
  const edition = homeEdition(bulletin);
  const stories = listed(edition);
  assert.deepEqual(stories.map((story) => story.title), [
    "Council draft proposes a boardwalk beside the Hyatt.",
    "Draft contracts would rebuild Hornsby Bend treatment facilities.",
    "Draft amendments would change the city's Muny agreement with UT.",
    "Water, parks, and transportation briefings are on this week's committee agendas.",
    "Watson asked Friday for new Austin Police Department rules on immigration " +
      "cooperation, KUT reports.",
    "Thompson said Friday she has the votes to be Texas House speaker.",
    "A Nov. 6 police release seeks one suspect in copper-cable thefts.",
    "Ten income-restricted townhomes were under construction on Menchaca Road as of Friday.",
    "Tentative Nov. 5 notes list a transit-lane commitment and a housing-policy update.",
    "Approved minutes for Council's Oct. 22 meeting are posted.",
    "NWS: rain in Austin today, with more rain possible Monday."
  ]);
  assert.deepEqual(stories.map((story) => story.section), [
    "News", "News", "News", "News", "News", "News", "News", "News", "News", "News",
    "Notices"
  ]);
  assert.equal(stories[1].signupAfter, true);
  assert.equal(stories[0].signupAfter, false);
  assert.equal(edition.signupAfterLead, false);
  assert.equal(
    edition.leadAnchor,
    "thursday-is-the-registration-deadline-for-a-possible-runoff"
  );
  const agenda = stories[0].summary;
  const overrunAt = agenda.indexOf("plus any cost overruns");
  const fundsAt = agenda.indexOf("$25 million in state funds");
  assert.match(agenda, /total estimated project cost of \$25 million/);
  assert.ok(overrunAt > 0 && fundsAt > overrunAt);
  assert.match(agenda, /Texas Department of Transportation/);
  assert.match(agenda, /funding match is not required/);
  assert.match(agenda, /Item 52 lists/);
  assert.match(agenda, /would accept \$25 million in state funds/);
  assert.doesNotMatch(agenda, /separate from \$25 million/);
  assert.match(agenda, /Nov\. 19 draft/);
  assert.match(agenda, /proposal, not an approval/);
  assert.match(agenda, /Hyatt/);
  assert.doesNotMatch(agenda, /boardwalk, plus any cost overruns/);
  assert.equal(stories[1].summary.includes("$55,326,729"), false);
  assert.match(stories[4].summary, /KUT reports/);
  assert.match(stories[4].summary, /Nov\. 6/);
  const weather = stories.find((story) => story.title.startsWith("NWS:"));
  assert.match(weather.summary, /100% chance of precipitation/);
  assert.match(weather.summary, /tenth to a quarter inch/);
  assert.match(weather.summary, /last updated at 12:24 p\.m\. CT/);
  assert.match(weather.summary, /high near 64/);
  assert.equal(weather.summary.includes("mainly before midnight"), false);
  assert.equal(weather.summary.includes("quarter to a half"), false);
  assert.match(bulletin, /unchanged since Friday afternoon/);
  assert.equal(stories[0].summary.includes("3:12"), false);
  assert.equal(stories[0].sourcesHtml.includes(" · "), false);
  assert.equal(stories[0].sourcesHtml.split('class="source-group"').length - 1, 2);
  assert.match(weather.sourcesHtml, /source-label">Source:<\/span>/);
  assert.equal(weather.sourcesHtml.includes("Sources:"), false);
  assert.equal(bulletin.includes("$55,326,729"), false);
  assert.equal(bulletin.includes("four calendar days"), false);
  assert.equal(bulletin.includes("December 3, 2027"), false);
  assert.equal(bulletin.includes("flood watch"), false);
  assert.equal(bulletin.includes("Omit"), false);
  assert.match(bulletin, /any necessary runoff/);
  assert.match(bulletin, /could come earlier/);
  assert.match(bulletin, /A charge is an accusation, not a finding of guilt/);
  assert.match(bulletin, /Approved minutes for Council's Oct\. 22 meeting are posted/);
  for (const url of [
    "https://services.austintexas.gov/edims/document.cfm?id=472487",
    "https://services.austintexas.gov/edims/document.cfm?id=484616",
    "https://www.austintexas.gov/council/2026/20261110-cwepc",
    "https://services.austintexas.gov/edims/document.cfm?id=484790",
    "https://www.austintexas.gov/council/2026/20261112-mobc",
    "https://services.austintexas.gov/edims/document.cfm?id=462100",
    "https://www.austintexas.gov/council/2026/20261119-reg",
    "https://services.austintexas.gov/edims/document.cfm?id=484837",
    "https://services.austintexas.gov/edims/document.cfm?id=484818",
    "https://www.austintexas.gov/council/2026/20261022-reg",
    "https://services.austintexas.gov/council_meetings/action_notes.cfm?mid=1520",
    "https://www.kut.org/crime-justice/2026-11-06/austin-tx-apd-police-department-ice-policies-hinojosa-abbott",
    "https://www.austintexas.gov/police/news/apd-arrests-suspect-copper-cable-theft-series-seeks-public-assistance-locating-second",
    "https://www.kut.org/politics/2026-11-06/texas-house-speaker-senfronia-thompson-democrats",
    "https://www.austintexas.gov/housing/news/new-affordable-menchaca-townhomes-bring-ten-homeownership-opportunities-south-austin",
    "https://forecast.weather.gov/MapClick.php?lat=30.2672&lon=-97.7431"
  ]) {
    assert.equal(bulletin.includes(url), true, url);
  }
  assert.equal(bulletin.includes("Editor notes"), false);
  assert.equal(bulletin.includes("[ORIGINAL]"), false);
  assert.equal(bulletin.includes("[REPORT]"), false);
  for (const story of stories) {
    assert.equal(bulletin.includes(story.summary), true, story.summary);
    assert.equal(FIRST_PERSON.test(`${story.title} ${story.summary}`), false);
  }
});

test("November 9 lists the registration lead, then news, then the forecast", () => {
  const bulletin = readFileSync("src/bulletins/2026-11-09.md", "utf8");
  const edition = homeEdition(bulletin);
  const stories = listed(edition);
  assert.deepEqual(stories.map((story) => story.title), [
    "County court meets Thursday to canvass the Nov. 3 election.",
    "Tuesday's court agenda includes a hearing on a Burleson Road event.",
    "Water and parks briefings are on Tuesday's committee agenda.",
    "Mobility briefings are set for Thursday at City Hall.",
    "November 12 is off the regular session calendar.",
    "The Texas Book Festival is November 14 and 15 at the Capitol.",
    "A 20 percent chance of showers tonight, then mostly sunny Tuesday."
  ]);
  assert.deepEqual(stories.map((story) => story.section), [
    "News", "News", "News", "News", "News", "Notices", "Notices"
  ]);
  assert.equal(stories[1].signupAfter, true);
  assert.equal(stories[0].signupAfter, false);
  assert.equal(edition.signupAfterLead, false);
  assert.equal(edition.leadAnchor, "register-by-thursday-if-a-runoff-is-ordered");
  assert.match(stories[0].summary, /9:00 a\.m\./);
  assert.match(stories[0].summary, /700 Lavaca Street/);
  assert.match(stories[0].summary, /November 12, 2026/);
  assert.match(stories[1].summary, /8509 Burleson Rd/);
  assert.match(stories[5].summary, /10 a\.m\. to 5 p\.m\. Saturday, November 14/);
  assert.match(stories[5].summary, /11 a\.m\. to 5 p\.m\. Sunday, November 15/);
  assert.match(stories[5].summary, /Texas Capitol and nearby venues/);
  assert.match(stories[5].summary, /free to attend/);
  assert.match(stories[5].summary, /ticket purchase that includes a book/);
  assert.match(stories[5].summary, /9 a\.m\. Thursday, November 12/);
  assert.match(stories[6].summary, /20 percent chance of showers before 9 p\.m\./);
  assert.match(stories[6].summary, /low around 55/);
  assert.match(stories[6].summary, /high near 72/);
  assert.match(stories[6].summary, /3:42 p\.m\. Central Standard Time on November 9/);
  assert.equal(stories[6].summary.includes("this afternoon"), false);
  assert.equal(stories[6].summary.includes("70%"), false);
  assert.equal(bulletin.includes("four calendar days"), false);
  assert.equal(bulletin.includes("Editor notes"), false);
  assert.match(bulletin, /does not say a runoff has been ordered/);
  assert.match(bulletin, /does not say the order is approved/);
  for (const url of [
    "https://services.austintexas.gov/edims/document.cfm?id=472487",
    "https://www.sos.state.tx.us/elections/laws/advisory2026-27-dec-12-runoff-election-law-calendar.shtml",
    "https://votetravis.gov/current-election-information/current-election/",
    "https://countyclerk.traviscountytx.gov/wp-content/uploads/commissioners_court/11-12-2026SVS.pdf",
    "https://countyclerk.traviscountytx.gov/departments/commissioners-court/",
    "https://countyclerk.traviscountytx.gov/wp-content/uploads/commissioners_court/11-10-2026VSAgenda.pdf",
    "https://www.traviscountytx.gov/commissioners-court",
    "https://services.austintexas.gov/edims/document.cfm?id=484616",
    "https://www.austintexas.gov/council/2026/20261110-cwepc",
    "https://services.austintexas.gov/edims/document.cfm?id=484790",
    "https://www.austintexas.gov/council/2026/20261112-mobc",
    "https://www.austintexas.gov/council/kiosk_committees",
    "https://services.austintexas.gov/edims/document.cfm?id=462100",
    "https://services.austintexas.gov/edims/document.cfm?id=484837",
    "https://www.austintexas.gov/council/2026/20261119-reg",
    "https://forecast.weather.gov/MapClick.php?lat=30.2672&lon=-97.7431",
    "https://www.austintexas.gov/communications/news/31st-annual-texas-book-festival-happening-nov-14-15",
    "https://www.austintexas.gov/ace/events/texas-book-festival-0"
  ]) {
    assert.equal(bulletin.includes(url), true, url);
  }
  for (const story of stories) {
    assert.equal(bulletin.includes(story.summary), true, story.summary);
    assert.equal(FIRST_PERSON.test(`${story.title} ${story.summary}`), false);
  }
});

test("upcomingOnly keeps today and later Chicago dates", () => {
  const rows = [
    { date: "2026-11-12", headline: "past" },
    { date: "2026-11-13", headline: "today" },
    { date: "2026-11-19", headline: "later" }
  ];
  assert.deepEqual(upcomingOnly(rows, "2026-11-13").map((item) => item.headline), [
    "today",
    "later"
  ]);
  assert.deepEqual(upcomingOnly(rows, "2026-11-12").map((item) => item.date), [
    "2026-11-12",
    "2026-11-13",
    "2026-11-19"
  ]);
  assert.equal(upcomingOnly(rows, "2026-11-20").length, 0);
  assert.match(chicagoToday(new Date("2026-11-13T18:00:00-06:00")), /^2026-11-13$/);
  assert.match(chicagoToday(new Date("2026-11-13T23:30:00-06:00")), /^2026-11-13$/);
  assert.match(chicagoToday(new Date("2026-11-14T00:30:00-06:00")), /^2026-11-14$/);
});

test("Nov. 10 meetings are outcomes and only Nov. 19 is upcoming", () => {
  const raw = JSON.parse(readFileSync("src/_data/weekItems.json", "utf8"));
  assert.equal(raw.every((item) => item.date >= "2026-11-13"), true);
  const downtown = "Committee hears downtown transportation plan";
  assert.equal(raw.some((item) => item.headline.includes(downtown)), false);
  assert.deepEqual(
    upcomingOnly(raw, "2026-11-13").map((item) => item.headline),
    ["Council votes: see what's on for your district"]
  );
  assert.equal(thisWeek.items.length, upcomingOnly(raw, chicagoToday()).length);
  assert.deepEqual(thisWeek.items.map((item) => item.date), ["2026-11-19"]);
  assert.deepEqual(thisWeek.items.map((item) => item.headline), [
    "Council votes: see what's on for your district"
  ]);
  const district = thisWeek.items[0];
  assert.equal(district.link, "https://yallcityhall.org/");
  assert.equal(district.source.url, "https://services.austintexas.gov/edims/document.cfm?id=484837");
  assert.equal(district.source.label, "Nov. 19 agenda");
  assert.equal(`${district.headline} ${district.dateLabel}`.includes("Not voted yet"), false);
  assert.equal(thisWeek.outcomes.length, 6);
  assert.deepEqual(thisWeek.outcomes.map((item) => item.headline), [
    "Barton Springs briefing held",
    "Pease Park briefing held",
    "Kaskade permit approved",
    "County certificates approved",
    "STAR Flight contract approved",
    "No action on bond committee"
  ]);
  assert.deepEqual(thisWeek.outcomes.map((item) => item.glyph), [
    "", "", "4\u20110", "$197M", "$67.8M", ""
  ]);
  const kaskade = thisWeek.outcomes.find((item) => item.id === "kaskade-origin-permit");
  assert.equal(kaskade.glyph.includes("-"), false);
  assert.equal(kaskade.headline.includes("4"), false);
  const text = thisWeek.outcomes.map((item) => item.text).join("\n");
  assert.match(text, /Balcones Canyonlands/);
  assert.match(text, /Pease Park Conservancy/);
  assert.match(text, /Kaskade Origin/);
  assert.equal(text.includes("Cascade"), false);
  assert.equal(text.includes("Briefed Nov."), false);
  assert.equal(text.includes("Approved Nov."), false);
  assert.match(text, /\$13\.5 million, to \$197\.1 million/);
  assert.match(text, /\$67,757,745\.12/);
  assert.match(text, /Closed session/);
  assert.equal(text.includes("5-0"), false);
  assert.equal(text.includes("three helicopters"), false);
  assert.equal(text.includes("ceiling"), false);
  assert.equal(text.includes("Shea"), false);
  assert.equal(text.includes("CivicClerk"), false);
  assert.equal(text.includes("Not voted yet"), false);
  const star = thisWeek.outcomes.find((item) => item.id.startsWith("678-million"));
  assert.equal(star.text.includes("4-0"), false);
  assert.equal(star.headline.includes("4-0"), false);
  assert.equal(star.text.includes("5-0"), false);
  assert.equal(star.glyph, "$67.8M");
  const certificates = thisWeek.outcomes.find((item) => item.text.includes("$197.1 million"));
  assert.deepEqual(certificates.sources.map((source) => source.label), [
    "Vote record",
    "Meeting video"
  ]);
  assert.deepEqual(certificates.sources.map((source) => source.url), [
    "https://traviscotx.portal.civicclerk.com/event/3727/overview",
    "https://traviscotx.portal.civicclerk.com/event/3727/media"
  ]);
  assert.equal(certificates.stackSources, false);
  assert.equal(certificates.text.includes("item 18"), false);
  assert.equal(certificates.text.includes("4-0"), false);
  assert.equal(certificates.headline.includes("4-0"), false);
  for (const item of thisWeek.outcomes) {
    assert.equal(item.text.includes("http"), false, item.id);
    assert.ok(item.sources.length > 0, item.id);
    for (const source of item.sources) {
      assert.match(source.url, /^https:\/\//);
      assert.equal(source.label.includes("http"), false);
    }
  }
});

test("November 8 home cards use the short Hornsby and Muny openings", () => {
  const stories = listed(homeEdition(readFileSync("src/bulletins/2026-11-08.md", "utf8")));
  assert.match(stories[1].summary, /replace the plant's existing headworks/);
  assert.match(stories[1].summary, /proposed contracts/);
  assert.equal(stories[1].summary.includes("$22,420,200"), false);
  assert.match(stories[2].summary, /let staff negotiate changes/);
  assert.match(stories[2].summary, /proposed, not approved/);
  assert.equal(stories[2].summary.includes("tax increment"), false);
});
