import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SHARE = "https://theaustinbulletin.com/images/2026-11-13/house-permits-desktop-1600.webp";
const DATASET = "https://data.austintexas.gov/d/3syk-w9eu";

function assertChartLead(html) {
  const lead = (html.match(
    /<section class="[^"]*\bstory-card--lead\b[^"]*"[\s\S]*?<\/section>/
  )?.[0] ?? "").replaceAll("\u00a0", " ");
  const h1 = lead.indexOf("<h1");
  const chart = lead.indexOf('class="chart"');
  const source = lead.indexOf('class="source-line"');
  assert.ok(h1 !== -1 && chart > h1 && source > chart, lead.slice(0, 400));
  assert.match(lead, /New-house permits rise a third straight year/);
  assert.match(lead, />1,845</);
  assert.match(lead, /new-house permits, Jan\.\u2013Oct\./);
  assert.match(lead, /Up 5\.9% from the same months of 2025 and 36\.9% from 2023/);
  assert.match(lead, /1,348/);
  assert.match(lead, /1,498/);
  assert.match(lead, /1,743/);
  assert.match(lead, /class="bar bar-hi"/);
  assert.doesNotMatch(lead, /\$67\.8M|>927</);
  assert.doesNotMatch(lead, />3,663</);
  assert.match(lead, /href="\/2026\/11\/13\/#new-house-permits-rise-third-straight-year"/);
  assert.ok(lead.includes(DATASET), "city dataset source");
  assert.match(lead, /City dataset 3syk-w9eu/);
  assert.equal((lead.match(/class="source-line"/g) || []).length, 1);
  assert.doesNotMatch(lead, /register-lead|runoff-lead|AI illustration/);
  assert.doesNotMatch(html, /\b(peak|biggest)\b|the most/i);
  const css = readFileSync("src/css/front-cover.css", "utf8");
  assert.match(css, /\.home-front \.front-lead h1 \{[\s\S]*?font-size:\s*3rem;/);
  assert.match(css, /font-size:\s*2\.125rem;/);
  assert.match(css, /\.home-front \.results-link \{[\s\S]*?background:\s*transparent;/);
}

test("the homepage lead is Friday's 1,845 permit chart", () => {
  assertChartLead(readFileSync("_site/index.html", "utf8"));
});

test("the homepage is one lead, and dated editions keep their own page", () => {
  const html = readFileSync("_site/index.html", "utf8");
  for (const text of [
    "/css/front-cover.css",
    "/css/reset-home.css",
    "front-lead",
    "class=\"source-line\"",
    "chart-kicker--sentence"
  ]) assert.ok(html.includes(text), text);
  assert.match(html, /id="week-block"/);
  assert.doesNotMatch(html, /Before it closes|id="week-title"/);
  assert.match(html, /Get the morning email\./);
  assert.doesNotMatch(html, /5 minutes|One email each morning/);
  assert.doesNotMatch(html, /class="results-button"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /New-house permits rise a third straight year/);
  assert.match(html, /href="\/2026\/11\/13\/#new-house-permits-rise-third-straight-year"/);
  assert.match(html, />1,845</);
  assert.doesNotMatch(html.match(/story-card--lead[\s\S]*?<\/section>/)?.[0] ?? "", />927</);
  assert.doesNotMatch(html, /Register by Thursday if a runoff is ordered\./);
  assert.match(html, /class="wordmark"/);
  assert.match(html, /class="masthead-dateline"/);
  assert.doesNotMatch(html, /ill-masthead|masthead-sky|austin-skyline/);
  assert.doesNotMatch(html, /parking-311\.webp/);
  assert.doesNotMatch(html, /p-courthouse\.jpg/);
  assert.doesNotMatch(html, /election-results\.webp/);
  assert.doesNotMatch(html, /register-lead|runoff-lead/);
  assert.match(html, /front-deck/);
  assert.doesNotMatch(html, /share-1200x630\.png/);
  assert.ok(html.includes(`property="og:image" content="${SHARE}"`));
  assert.ok(html.includes(`name="twitter:image" content="${SHARE}"`));
  assert.match(
    html,
    /property="og:title" content="New-house permits rise a third straight year"/
  );
  assert.match(html, new RegExp(
    "og:description\" content=\"Up 5\\.9% from the same months of 2025 and 36\\.9% from 2023\\."
  ));
  assert.match(
    html,
    /name="twitter:title" content="New-house permits rise a third straight year"/
  );
  assert.match(html, new RegExp(
    "twitter:description\" content=\"Up 5\\.9% from the same months of 2025 and 36\\.9% from 2023"
  ));
  assert.match(html, /Friday, Nov\. 13, 2026/);
  assert.match(html, /href="\/2026\/11\/12\/"/);
  assert.match(html, /Nov\. 10 · 6 outcomes/);
  assert.match(html, /id="week-count">1<\/span>/);
  assert.match(html, /id="week-word">item<\/span>/);
  assert.match(html, /<u>4\u20110<\/u>[\s\S]*Kaskade permit approved</);
  assert.match(html, /\$197M[\s\S]*County certificates approved/);
  assert.match(html, /\$67\.8M[\s\S]*STAR Flight contract approved/);
  assert.match(html, /No action on bond committee/);
  assert.match(html, /Balcones Canyonlands/);
  assert.match(html, /Kaskade Origin/);
  assert.match(html, /\$67,757,745\.12/);
  assert.doesNotMatch(html, /Committee hears downtown transportation plan/);
  assert.doesNotMatch(html, /Court takes up November 3 canvass/);
  assert.match(html, /Council votes: see what/);
  assert.doesNotMatch(html, /Court weighs \$197 million in certificates/);
  assert.doesNotMatch(html, /Hearing set on Burleson Road event/);
  assert.doesNotMatch(html, /Committee hears Barton Springs briefing/);
  const outcomes = html.match(/<ul class="week-outcomes">[\s\S]*?<\/ul>/)?.[0] ?? "";
  const outcomeText = outcomes
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ");
  assert.equal(outcomes.includes("https://"), true);
  assert.equal(outcomeText.includes("https://"), false);
  assert.equal(outcomeText.includes("4\u20110") && !outcomeText.includes("4-0"), true);
  assert.equal(outcomeText.includes("5-0"), false);
  assert.equal(outcomeText.includes("Briefed Nov."), false);
  assert.equal(outcomeText.includes("Approved Nov."), false);
  assert.match(outcomes, /Vote record/);
  assert.match(outcomes, /Meeting video/);
  assert.doesNotMatch(outcomes, /source-line--stack/);
  assert.match(outcomes, /<span class="source-group">\s*<span class="sep"/);
  assert.doesNotMatch(html, /If you (haven't|want|live|are)\b/);
  assert.ok(!html.includes("front-news-rail"), "the rail is gone");
  assert.ok(!html.includes("Austin, up close."));
  assert.ok(!html.includes("Original illustration"));
  assert.ok(!html.includes("Keep these close"));
  assert.ok(!html.includes("barton-springs-960.webp"));
  const disclosure = '<p class="ai-disclosure">' +
    '<a href="/about/#trust">An AI system produces this site.</a></p>';
  assert.equal(html.includes(disclosure), true);
});

test("This week lists only the Nov. 19 Council item", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const week = html.match(/<ul class="week-lines"[\s\S]*?<\/ul>/)?.[0] ?? "";
  const weekText = week.replace(/<[^>]+>/g, " ");
  const weekHeading = (html.match(/id="this-week-a"[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  assert.equal(weekHeading, "This week · 1 item");
  assert.match(week, /data-date="2026-11-19"/);
  assert.equal((week.match(/<li\b/g) || []).length, 1);
  assert.match(weekText, /Council votes: see what/);
  assert.doesNotMatch(weekText, /Committee hears downtown transportation plan/);
  assert.doesNotMatch(weekText, /Court takes up November 3 canvass/);
  assert.match(html, /id="week-block"/);
  assert.match(html, /getElementById\("week-block"\)/);
  const agenda = "services.austintexas.gov/edims/document.cfm?id=484837";
  const escaped = agenda.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(week, /href="https:\/\/yallcityhall\.org\/"/);
  assert.match(week, new RegExp(`${escaped}[^>]*class="week-source"`));
  assert.match(week, /Nov\.\u00a019 agenda/);
  assert.equal(week.includes("Not voted yet"), false);
});

test("a dated edition keeps the card page and the AI disclosure", () => {
  const edition = "2026-11-09";
  const page = readFileSync(`_site/${edition.replaceAll("-", "/")}/index.html`, "utf8");
  assert.match(page, /class="wordmark"/);
  assert.match(page, /class="site-menu"/);
  assert.match(page, /<h1 class="edition-kicker"/);
  assert.doesNotMatch(page, /class="edition-lead-title"/);
  assert.match(page, /class="edition-wrap"/);
  assert.match(page, /<article class="card/);
  assert.doesNotMatch(page, /<nav class="skim"/);
  assert.doesNotMatch(page, /In 60 seconds/);
  assert.doesNotMatch(page, /Good morning, Austin/);
  assert.doesNotMatch(page, /<h2[^>]*>\s*The Briefing/);
  assert.doesNotMatch(page, /How this site is made/);
  assert.equal(page.includes("About our reporting"), false);
  const disclosure = '<p class="ai-disclosure">' +
    '<a href="/about/#trust">An AI system produces this site.</a></p>';
  assert.equal(page.includes(disclosure), true);
  const lead = page.match(/<h3\b[^>]*\bid="([^"]+)"/);
  assert.ok(lead, "edition lead heading");
  assert.match(page, new RegExp(`#${lead[1]}`));
  const h1 = page.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? "";
  assert.equal(h1.includes(lead[1]), false);
  assert.doesNotMatch(page, />Results page</);
  assert.doesNotMatch(page, /November 3 election results\./);
  assert.match(page, /November 9, 2026/);
});

test("an older edition dates itself and links to the latest", () => {
  const older = readFileSync("_site/2026/11/09/index.html", "utf8").replaceAll("\u00a0", " ");
  const sunday = readFileSync("_site/2026/11/08/index.html", "utf8").replaceAll("\u00a0", " ");
  const tuesday = readFileSync("_site/2026/11/10/index.html", "utf8").replaceAll("\u00a0", " ");
  const wednesday = readFileSync("_site/2026/11/11/index.html", "utf8").replaceAll("\u00a0", " ");
  const thursday = readFileSync("_site/2026/11/12/index.html", "utf8").replaceAll("\u00a0", " ");
  const friday = readFileSync("_site/2026/11/13/index.html", "utf8").replaceAll("\u00a0", " ");
  const home = readFileSync("_site/index.html", "utf8").replaceAll("\u00a0", " ");
  const line = (html) => html.match(/class="masthead-dateline">([\s\S]*?)<\/p>/)[1];
  const nov9 = line(older);
  assert.match(nov9, /Monday, Nov\. 9/);
  assert.match(nov9, /Latest:/);
  assert.match(nov9, /href="\/2026\/11\/13\/"/);
  assert.match(nov9, />Nov\. 13</);
  assert.doesNotMatch(nov9, /Previous:/);
  assert.doesNotMatch(nov9, /Wednesday, Nov\. 11/);
  const nov8 = line(sunday);
  assert.match(nov8, /Sunday, Nov\. 8/);
  assert.match(nov8, /href="\/2026\/11\/13\/"/);
  assert.doesNotMatch(nov8, /Previous:/);
  const nov10 = line(tuesday);
  assert.match(nov10, /Tuesday, Nov\. 10/);
  assert.match(nov10, /Latest:/);
  assert.match(nov10, /href="\/2026\/11\/13\/"/);
  assert.doesNotMatch(nov10, /Previous:/);
  const nov11 = line(wednesday);
  assert.match(nov11, /Wednesday, Nov\. 11/);
  assert.match(nov11, /Latest:/);
  assert.match(nov11, /href="\/2026\/11\/13\/"/);
  assert.doesNotMatch(nov11, /Previous:/);
  const thursdayLine = line(thursday);
  assert.match(thursdayLine, /Thursday, Nov\. 12/);
  assert.match(thursdayLine, /Latest:/);
  assert.match(thursdayLine, /href="\/2026\/11\/13\/"/);
  for (const html of [friday, home]) {
    const current = line(html);
    assert.match(current, /Friday, Nov\. 13, 2026/);
    assert.match(current, /Previous:/);
    assert.match(current, /href="\/2026\/11\/12\/"/);
    assert.doesNotMatch(current, /Latest:/);
  }
});

test("Monday labels the lead illustration and the county headline", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const page = readFileSync("_site/2026/11/09/index.html", "utf8");
  const feed = readFileSync("_site/feed.xml", "utf8");
  const caption = "AI-generated illustration: a deadline circled on a calendar.";
  const headline = "County court meets Thursday to canvass the Nov. 3 election.";
  assert.equal(html.includes(caption), false);
  assert.equal(page.includes(caption), true);
  assert.equal(page.includes("Illustration: The Austin Bulletin."), true);
  assert.equal(html.includes("Illustration: The Austin Bulletin."), false);
  assert.equal(page.includes(headline), true);
  assert.equal(feed.includes(headline), true);
  assert.equal(feed.includes("not a ballot or a city form"), false);
});

test("the sunday edition stacks each source and names the headline actions", () => {
  const page = readFileSync("_site/2026/11/08/index.html", "utf8");
  const lead = page.match(/<article class="card legacy-card"[\s\S]*?<\/article>/)?.[0] ?? "";
  const line = lead.match(/<p class="source-line">[\s\S]*?<\/p>/)?.[0] ?? "";
  assert.equal(line.split('class="source-group"').length - 1, 1);
  assert.equal(line.includes("·"), false);
  assert.match(line, /source-label">Source:<\/span>/);
  assert.match(page, /source-label">Source:<\/span> <a [^>]*forecast\.weather\.gov\/MapClick/);
  assert.equal(page.includes("Sources: Source"), false);
  assert.equal(page.includes("mainly before midnight"), false);
  assert.equal(page.includes("3:12 p.m."), false);
  assert.match(page, /Friday afternoon/);
  assert.match(page, /total estimated project cost of \$25 million, plus any cost overruns/);
  assert.match(page, /would accept \$25 million in state funds/);
  assert.match(page, /proposal, not an approval/);
  assert.match(page, /beside the Hyatt/);
  assert.match(page, /\$25 million in state funds/);
  assert.doesNotMatch(page, /boardwalk, plus any cost overruns/);
  assert.doesNotMatch(page, /separate from \$25 million/);
  assert.doesNotMatch(page, /separate estimated project cost/);
  assert.match(page, /forecast\.weather\.gov\/MapClick\.php\?lat=30\.2672/);
  assert.match(page, /12:24 p\.m\. CT on Nov\. 8/);
  assert.match(page, /high near 64/);
  assert.match(page, /low around 55/);
  assert.match(page, /high near 68/);
  assert.match(page, /read this page at 12:32 p\.m\. CT/);
  assert.match(page, /Nov\. 19 draft agenda on Y'all City Hall/);
  assert.equal(page.includes("Nov. 19 meeting on Y'all City Hall"), false);
  assert.match(page, /Nov\. 5 meeting on Y'all City Hall/);
  assert.match(page, /Chart · Not a photograph/);
  assert.match(page, /Runoff calendar/);
  assert.match(page, /not-to-exceed cap of \$22,420,200/);
  assert.match(page, /not-to-exceed cap of \$32,906,529/);
  assert.match(page, /A charge is an accusation, not a finding of guilt/);
  assert.match(page, /KUT reports/);
  assert.match(page, /runoff-lead-desktop-1600\.webp/);
  assert.doesNotMatch(page, /\$55,326,729/);
  assert.match(page, /class="share"/);
  assert.match(page, /aria-label="Share: Thursday is the registration deadline/);
  assert.match(page, /for a possible runoff\."/);
  assert.doesNotMatch(page, />Share story</);
  assert.doesNotMatch(page, />Link</);
  const css = readFileSync("src/css/front-cover.css", "utf8");
  assert.match(css, /\.edition-page \.skim li \{[^}]*align-items:\s*flex-start/);
  assert.match(css, /\.edition-page \.skim li::before \{[^}]*counter\(skim\)/);
});

function sectionHeads(html, fromId, toId) {
  const from = html.indexOf(`id="${fromId}"`);
  const to = html.indexOf(`id="${toId}"`);
  const slice = html.slice(from, to);
  return [...slice.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/g)].map((match) => ({
    level: match[1],
    id: match[2].match(/id="([^"]+)"/)?.[1] ?? "",
    text: match[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
  }));
}

test("Sunday news and notice titles are h3 and Friday keeps h5", () => {
  const page = readFileSync("_site/2026/11/08/index.html", "utf8");
  const friday = readFileSync("_site/2026/11/06/index.html", "utf8");
  const heads = sectionHeads(page, "news", "notices");
  const signupAt = heads.findIndex((head) => head.id === "signup-edition-title");
  const hornsbyAt = heads.findIndex((head) =>
    head.id === "draft-contracts-would-rebuild-hornsby-bend-treatment-facilities");
  const munyAt = heads.findIndex((head) =>
    head.id === "draft-amendments-would-change-the-citys-muny-agreement-with-ut");
  assert.ok(hornsbyAt < signupAt && signupAt < munyAt);
  const news = heads.filter((head) => head.id !== "signup-edition-title");
  const notices = sectionHeads(page, "notices", "the-back-page");
  assert.equal(news.length, 10);
  assert.ok(news.every((head) => head.level === "3" && head.id));
  assert.equal(news[0].id, "council-draft-proposes-a-boardwalk-beside-the-hyatt");
  assert.equal(news[0].text, "Council draft proposes a boardwalk beside the Hyatt.");
  assert.equal(news[1].id, "draft-contracts-would-rebuild-hornsby-bend-treatment-facilities");
  assert.equal(notices.length, 1);
  assert.equal(notices[0].level, "3");
  assert.match(notices[0].text, /^NWS: rain in Austin today/);
  assert.equal(page.includes("Past event"), false);
  assert.equal(page.includes("<h5"), false);
  assert.match(page, /<h3[^>]*>Thursday is the registration deadline for a possible runoff\./);
  const fridayNews = sectionHeads(friday, "news", "notices")
    .filter((head) => head.id !== "signup-edition-title");
  assert.ok(fridayNews.length > 0);
  assert.ok(fridayNews.every((head) => head.level === "5"));
  assert.match(friday, /<h5\b/);
});
