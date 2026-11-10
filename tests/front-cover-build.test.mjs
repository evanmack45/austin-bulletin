import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SHARE = "https://theaustinbulletin.com/images/reset/share-1200x630.png";
const DATASET = "https://data.austintexas.gov/d/ifzc-3xz8";

function assertChartLead(html) {
  const lead = html.match(
    /<section class="[^"]*\bstory-card--lead\b[^"]*"[\s\S]*?<\/section>/
  )?.[0] ?? "";
  const h1 = lead.indexOf("<h1");
  const chart = lead.indexOf('class="chart"');
  const source = lead.indexOf('class="source-line"');
  assert.ok(h1 !== -1 && chart > h1 && source > chart, lead.slice(0, 400));
  assert.match(lead, /Affordable rentals lose rent limits in 2027/);
  assert.doesNotMatch(lead, /for 927 Austin affordable rentals/);
  assert.match(lead, />927</);
  assert.match(lead, /class="bar bar-hi"/);
  assert.match(lead, /More than three times the 268/);
  assert.match(lead, /An expiration date doesn(?:'|&#39;)t by itself mean rents will rise\./);
  assert.match(lead, /href="\/lead-story\/"/);
  assert.match(lead, new RegExp(`href="${DATASET.replaceAll("?", "\\?")}"`));
  assert.doesNotMatch(lead, /register-lead|runoff-lead|AI illustration/);
  assert.doesNotMatch(html, /\b(peak|biggest)\b|the most/i);
  const css = readFileSync("src/css/front-cover.css", "utf8");
  assert.match(css, /\.home-front \.front-lead h1 \{[\s\S]*?font-size:\s*3rem;/);
  assert.match(css, /font-size:\s*2\.125rem;/);
  assert.match(css, /\.home-front \.results-link \{[\s\S]*?background:\s*transparent;/);
}

test("the homepage lead is the 2027 rent-limit chart", () => {
  assertChartLead(readFileSync("_site/index.html", "utf8"));
  const variant = readFileSync("_site/b/index.html", "utf8");
  assert.match(variant, /data-variant="b"/);
  assert.match(variant, /class="big-box"/);
  assert.match(variant, /affordable rentals lose rent limits in 2027/);
  assert.match(variant, /Why it matters/);
  assert.match(variant, /What you can do/);
  assert.doesNotMatch(variant, /Court weighs \$197 million/);
  assert.match(variant, /An expiration date doesn(?:'|&#39;)t by itself mean rents will rise\./);
  assert.doesNotMatch(variant, /\b(peak|biggest)\b|the most/i);
});

test("the homepage is one lead, and dated editions keep their own page", () => {
  const html = readFileSync("_site/index.html", "utf8");
  for (const text of [
    "/css/front-cover.css",
    "/css/reset-home.css",
    "front-lead",
    "class=\"source-line\"",
    "CHART</p>"
  ]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /week-block|Before it closes|id="week-title"/);
  assert.match(html, /Get the morning email\./);
  assert.doesNotMatch(html, /5 minutes|One email each morning/);
  assert.doesNotMatch(html, /class="results-button"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /Affordable rentals lose rent limits in 2027/);
  assert.match(html, /href="\/lead-story\/"/);
  assert.match(html, />927</);
  assert.doesNotMatch(html, /Register by Thursday if a runoff is ordered\./);
  assert.match(html, /class="wordmark"/);
  assert.match(html, /class="masthead-dateline"/);
  assert.doesNotMatch(html, /ill-masthead|masthead-sky|austin-skyline/);
  assert.doesNotMatch(html, /parking-311\.webp/);
  assert.doesNotMatch(html, /p-courthouse\.jpg/);
  assert.doesNotMatch(html, /election-results\.webp/);
  assert.doesNotMatch(html, /register-lead|runoff-lead/);
  assert.match(html, /front-deck/);
  assert.match(html, /share-1200x630\.png/);
  assert.ok(html.includes(`property="og:image" content="${SHARE}"`));
  assert.ok(html.includes(`name="twitter:image" content="${SHARE}"`));
  assert.match(html, /property="og:title" content="Affordable rentals lose rent limits in 2027/);
  assert.match(
    html,
    /og:description" content="An expiration date doesn(?:'|&#39;)t by itself mean rents will rise\./
  );
  assert.match(html, /name="twitter:title" content="Affordable rentals lose rent limits in 2027/);
  assert.match(html, new RegExp(
    "twitter:description\" content=\"An expiration date doesn(?:'|&#39;)t " +
    "by itself mean rents will rise"
  ));
  assert.match(html, /Monday, Nov\. 9/);
  assert.match(html, /href="\/2026\/11\/08\/"/);
  assert.doesNotMatch(html, /If you (haven't|want|live|are)\b/);
  assert.ok(!html.includes("front-news-rail"), "the rail is gone");
  assert.ok(!html.includes("Austin, up close."));
  assert.ok(!html.includes("Original illustration"));
  assert.ok(!html.includes("Keep these close"));
  assert.ok(!html.includes("barton-springs-960.webp"));
  const edition = html.match(/data-edition="([0-9-]+)"/)?.[1];
  assert.ok(edition);
  const page = readFileSync(`_site/${edition.replaceAll("-", "/")}/index.html`, "utf8");
  assert.match(page, /class="wordmark"/);
  assert.match(page, /class="site-menu"/);
  assert.match(page, /<h1 class="edition-kicker"/);
  assert.doesNotMatch(page, /class="edition-lead-title"/);
  assert.match(page, /Today's items/);
  assert.doesNotMatch(page, /In 60 seconds/);
  assert.doesNotMatch(page, /Good morning, Austin/);
  assert.doesNotMatch(page, /<h2[^>]*>\s*The Briefing/);
  assert.match(page, /How this site is made/);
  assert.equal(page.includes("About our reporting"), false);
  const disclosure = '<p class="ai-disclosure">' +
    '<a href="/about/#trust">An AI system produces this site.</a></p>';
  assert.equal(html.includes(disclosure), true);
  assert.equal(page.includes(disclosure), true);
  const lead = page.match(/<h3\b[^>]*\bid="([^"]+)"/);
  assert.ok(lead, "edition lead heading");
  assert.match(page, new RegExp(`<nav class="skim"[\\s\\S]*href="#${lead[1]}"`));
  const h1 = page.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? "";
  assert.equal(h1.includes(lead[1]), false);
  assert.doesNotMatch(page, />Results page</);
  assert.doesNotMatch(page, /November 3 election results\./);
  assert.match(page, /November 9, 2026/);
  assert.doesNotMatch(page, /p-courthouse/);
  assert.doesNotMatch(page, /parking-311\.webp/);
  assert.match(page, /class="story-share"/);
  assert.match(page, /700 Lavaca Street/);
  assert.doesNotMatch(page, /Editor notes/);
  const art = "https://theaustinbulletin.com/images/2026-11-09/"
    + "register-lead-desktop-1600.webp";
  assert.ok(page.includes(`property="og:image" content="${art}"`));
  assert.match(page, /property="og:title" content="Register by Thursday/);
  assert.match(page, /og:description" content="A resident who still needs to register/);
  assert.match(page, /name="twitter:title" content="Register by Thursday/);
  assert.match(page, /twitter:description" content="A resident who still needs to register/);
  assert.ok(page.includes(`name="twitter:image" content="${art}"`));
  assert.match(page, /register-lead-desktop-1600\.webp/);
  assert.match(page, /AI-generated illustration: a deadline circled on a calendar\./);
  assert.match(page, /does not say a runoff has been ordered/);
  assert.match(page, /could come earlier/);
  assert.match(page, /9:00 a\.m\./);
  assert.match(page, /federal, state, district, and county officeholders/);
  assert.doesNotMatch(page, /\$55,326,729/);
  assert.doesNotMatch(page, /four calendar days/);
  assert.doesNotMatch(page, /flood watch/i);
  assert.doesNotMatch(page, /Unifraktur|class="folio-nav"|class="edition-head"|Vol\. I/);
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
  const lead = page.match(/<section class="big-story"[\s\S]*?<\/section>/)?.[0] ?? "";
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
  assert.match(page, />Copy story link</);
  assert.match(page, />Share story</);
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
