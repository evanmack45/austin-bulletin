import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wednesday = readFileSync("_site/2026/11/11/index.html", "utf8");
const tuesday = readFileSync("_site/2026/11/10/index.html", "utf8");

function leadOf(html) {
  const match = html.match(/<section class="lead"[\s\S]*?<\/section>/);
  assert.ok(match, "lead");
  return match[0];
}

test("Wednesday and Tuesday both use the shared scoreboard template", () => {
  for (const page of [wednesday, tuesday]) {
    assert.match(page, /edition-scoreboard/);
    assert.match(page, /class="board"/);
    assert.match(page, /class="oc"/);
    assert.match(page, /href="\/css\/scoreboard\.css"/);
    assert.equal(page.split('class="share"').length - 1, 1);
    assert.doesNotMatch(page, /class="card"/);
  }
});

test("the Wednesday lead is 71.68 and keeps the exact figure in Method", () => {
  const lead = leadOf(wednesday);
  assert.match(lead, />71\.68</);
  assert.match(lead, /of 100 points/);
  assert.match(lead, /Bell(?:'|&#39;)s helicopter bid won despite lowest cost score/);
  assert.match(lead, /ranked last of four on initial cost/);
  assert.match(lead, /lowest initial-cost score/);
  assert.match(lead, /Agustawestland/);
  assert.equal(lead.includes("\u00ad"), false);
  assert.equal(lead.includes("&shy;"), false);
  assert.equal(lead.includes("<br"), false);
  assert.equal(lead.includes("$67.8M"), false);
  assert.equal(lead.includes("4-0"), false);
  assert.equal(lead.includes("4\u20110"), false);
  assert.equal(lead.includes("5-0"), false);
  assert.equal(lead.includes("unanimously"), false);
  assert.equal(lead.includes("most expensive"), false);
  const beforeMethod = lead.split('<details class="method"')[0];
  assert.equal(beforeMethod.includes("$67,757,745.12"), false);
  const method = lead.match(/<details class="method"[\s\S]*?<\/details>/)?.[0] ?? "";
  assert.match(method, /\$67,757,745\.12/);
  assert.match(method, /official vote isn't posted yet/);
  const board = wednesday.slice(wednesday.indexOf(lead) + lead.length);
  assert.equal(board.includes("STAR Flight"), false);
  assert.match(wednesday, /Tuesday(?:'|&#39;)s outcomes/);
  assert.match(wednesday, /\$1M/);
  assert.match(wednesday, /new contract limit/);
  assert.match(wednesday, /County doubles immigrant legal aid contract/);
  assert.match(wednesday, /Ann Kitchen reappointed to Central Health board/);
  assert.match(wednesday, /Only county cars charge free at county chargers/);
  assert.match(wednesday, /County backs a digital twin of Balcones preserve/);
  assert.equal(wednesday.includes("is up for another board term"), false);
  assert.match(wednesday, /4\u20110/);
  assert.match(wednesday, /City offices closed; trash pickup runs as usual/);
  assert.match(wednesday, /78°/);
  assert.match(wednesday, /Fog early, then partly sunny/);
  assert.match(wednesday, /Mobility Committee meets/);
  assert.match(wednesday, /County canvasses Nov/);
  assert.match(wednesday, /City canvass of Nov/);
  assert.equal(wednesday.includes("79°"), false);
  const home = readFileSync("_site/index.html", "utf8");
  assert.match(home, />297</);
  assert.doesNotMatch(home, />1,845</);
  assert.doesNotMatch(home, />3,663</);
  assert.doesNotMatch(home, />71\.68</);
  assert.doesNotMatch(home, />927</);
  const tuesdayPage = tuesday.replaceAll("\u00a0", " ");
  assert.match(tuesdayPage, /Update: Approved 4\u20110 Nov\. 10\./);
  assert.match(tuesdayPage, new RegExp(
    "Rent limits on affordable rentals end in 2027 — " +
    "Tue\\., Nov\\. 10, 2026"
  ));
  assert.match(tuesdayPage, new RegExp(
    "property=\"og:title\" content=\"Rent limits on affordable " +
    "rentals end in 2027\""
  ));
  assert.match(tuesdayPage, new RegExp(
    "property=\"og:image\" content=\"https://theaustinbulletin.com" +
    "/images/2026-11-10/rent-limits-desktop-1600.webp\""
  ));
  assert.match(tuesdayPage, new RegExp(
    "Chart\\. Austin affordable rental units by the year " +
    "recorded rent limits end"
  ));
  assert.match(wednesday, new RegExp(
    "property=\"og:title\" content=\"Bell(?:'|&#39;)s helicopter " +
    "bid won despite lowest cost score\""
  ));
  assert.match(wednesday, new RegExp(
    "property=\"og:image\" content=\"https://theaustinbulletin.com" +
    "/images/2026-11-11/bid-scores-desktop-1600.webp\""
  ));
  assert.doesNotMatch(wednesday, new RegExp(
    "The Austin Bulletin — Wednesday, November 11, 2026"
  ));
  assert.match(tuesdayPage, /is up for another board term/);
});

test("the scoreboard signup follows the whole board", () => {
  const signup = wednesday.indexOf('class="signup signup--edition"');
  const next = wednesday.indexOf('id="next-h"');
  const notices = wednesday.indexOf('id="notices-h"');
  const cells = [
    "immigrant legal aid",
    "Ann Kitchen reappointed",
    "Only county cars",
    "digital twin of Balcones"
  ];
  for (const cell of cells) {
    assert.ok(wednesday.indexOf(cell) < signup, cell);
  }
  assert.ok(signup < next && next < notices);
  assert.equal(wednesday.split('class="signup signup--edition"').length - 1, 1);
  assert.equal(wednesday.split('<div class="board">').length - 1, 1);
  assert.match(wednesday, /Item 25/);
  assert.match(wednesday, /Item 11/);
  assert.match(wednesday, /Item 38/);
  assert.match(wednesday, /Item 33/);
});

test("Nov. 19 follows the Nov. 12 Next items", () => {
  const next = wednesday.match(
    /<section class="list" aria-labelledby="next-h">[\s\S]*?<\/section>/
  )?.[0] ?? "";
  assert.ok(next, "next list");
  const text = next.replace(/<[^>]+>/g, "\n");
  const order = [
    "Mobility Committee meets",
    "County canvasses Nov",
    "City canvass of Nov",
    "Council votes: see what"
  ].map((label) => text.indexOf(label));
  assert.ok(order.every((index, place) => index > (order[place - 1] ?? -1)));
  const item = next.match(/id="next-district-agenda"[\s\S]*?<\/li>/)?.[0] ?? "";
  assert.match(item, /<span class="when">Nov\.\u00a019<\/span>/);
  assert.match(item, new RegExp(
    "href=\"https://yallcityhall\\.org/\"[^>]*>" +
    "Council votes: see what(?:'|&#39;)s on for your district</a>"
  ));
  assert.match(item, new RegExp(
    "href=\"https://services\\.austintexas\\.gov/edims/" +
    "document\\.cfm\\?id=484837\"[^>]*>Nov\\.\\u00a019 agenda</a>"
  ));
  assert.equal(item.includes("Not voted yet"), false);
  assert.equal(item.includes("list-copy"), false);
});

test("Thursday lead is the 3,663 chart and signup follows habitat", () => {
  const thursday = readFileSync("_site/2026/11/12/index.html", "utf8").replaceAll("\u00a0", " ");
  const lead = leadOf(thursday);
  assert.match(lead, />3,663</);
  assert.match(lead, /active licenses, Nov\. 10/);
  assert.match(lead, /Licensed short-term rentals rise since September/);
  assert.match(lead, /up 21\.5% since Sept\. 30/);
  assert.match(lead, /Applications pause Nov\. 16 through Dec\. 3/);
  assert.match(lead, /class="end-dot"/);
  assert.match(lead, /3,015/);
  assert.match(lead, /<details class="method"/);
  assert.equal(lead.includes('open=""') || lead.includes(" open"), false);
  const method = lead.match(/<details class="method"[\s\S]*?<\/details>/)?.[0] ?? "";
  assert.match(method, /pause applications and renewals Nov\. 16 through Dec\. 3/);
  assert.match(method, /not listings, bookings/);
  assert.doesNotMatch(thursday, /hotel occupancy|occupancy tax/i);
  assert.doesNotMatch(thursday, /\b(peak|all-time high)\b/i);
  assert.doesNotMatch(thursday, /tomorrow|Not voted yet/);
  assert.match(thursday, /City data/);
  assert.match(thursday, /City STR page/);
  assert.match(thursday, /Thursday, Nov\. 12, 2026/);
  const signup = thursday.indexOf('class="signup signup--edition"');
  const habitat = thursday.indexOf("30-year habitat permit is up for renewal");
  const mobility = thursday.indexOf("Mobility Committee takes up downtown, Parmer Lane");
  const notices = thursday.indexOf('id="notices-h"');
  assert.ok(habitat < signup && signup < mobility && mobility < notices);
  assert.equal(thursday.split('class="signup signup--edition"').length - 1, 1);
  assert.match(thursday, new RegExp(
    "property=\"og:title\" content=\"Licensed short-term rentals rise since September\""
  ));
  assert.match(thursday, /str-licenses-desktop-1600\.webp/);
});

test("Friday lead is the 1,845 permit chart and signup follows the burglary", () => {
  const friday = readFileSync("_site/2026/11/13/index.html", "utf8").replaceAll("\u00a0", " ");
  const lead = leadOf(friday);
  assert.match(lead, />1,845</);
  assert.match(lead, /1,348/);
  assert.match(lead, /1,498/);
  assert.match(lead, /1,743/);
  assert.match(lead, /new-house permits, Jan\.–Oct\./);
  assert.match(lead, /New-house permits rise a third straight year/);
  assert.match(lead, /Up 5\.9% from the same months of 2025/);
  assert.match(lead, /A permit isn(?:'|&#39;)t a finished home/);
  assert.match(lead, /<details class="method"/);
  assert.equal(lead.includes('open=""') || lead.includes(" open"), false);
  const method = lead.match(/<details class="method"[\s\S]*?<\/details>/)?.[0] ?? "";
  assert.match(method, /not homes finished or sold/);
  assert.match(method, /does not say why permits rose/);
  assert.match(method, /as of Nov\. 12, 2026/);
  assert.doesNotMatch(friday, /housing_units|homes built|homes sold/i);
  assert.match(friday, /City dataset 3syk-w9eu/);
  assert.match(friday, /https:\/\/data\.austintexas\.gov\/d\/3syk-w9eu/);
  assert.match(friday, /Friday, Nov\. 13, 2026/);
  const signup = friday.indexOf('class="signup signup--edition"');
  const burglary = friday.indexOf("Burglary victims: police may have your property");
  const tires = friday.indexOf("Police seek video after 12 tire slashings");
  const notices = friday.indexOf('id="notices-h"');
  assert.ok(burglary < signup && signup < tires && tires < notices);
  assert.equal(friday.split('class="signup signup--edition"').length - 1, 1);
  assert.equal(friday.split('class="source-line"').length - 1, 1);
  assert.match(friday, new RegExp(
    "property=\"og:title\" content=\"New-house permits rise a third straight year\""
  ));
  assert.match(friday, /house-permits-desktop-1600\.webp/);
  assert.match(friday, /Bulletin original/);
});

test("Saturday lead is the 297 theft chart and signup follows Hornsby Bend", () => {
  const saturday = readFileSync("_site/2026/11/14/index.html", "utf8").replaceAll("\u00a0", " ");
  const lead = leadOf(saturday);
  assert.match(lead, />297</);
  assert.match(lead, />220</);
  assert.match(lead, /1,522/);
  assert.match(lead, /1,763/);
  assert.match(lead, />438</);
  assert.match(lead, />29</);
  assert.match(lead, />32</);
  assert.match(lead, /theft reports, Jan\.–Oct\./);
  assert.match(lead, /Catalytic converter theft reports surge back/);
  assert.match(lead, /Up from 32 in the same months of 2025/);
  assert.match(lead, /More than nine times last year(?:'|&#39;)s count/);
  assert.match(lead, /<details class="method"/);
  assert.equal(lead.includes('open=""') || lead.includes(" open"), false);
  const method = lead.match(/<details class="method"[\s\S]*?<\/details>/)?.[0] ?? "";
  assert.match(method, /not arrests/);
  assert.match(method, /does not say why reports rose/);
  assert.match(lead, /Crime Reports \(fdj4-gpfu\), as of Nov\. 9, 2026/);
  assert.match(lead, new RegExp(
    "220 in 2020, 1,522 in 2021, 1,763 in 2022, 438 in 2023, " +
    "29 in 2024, 32 in 2025 and 297 in 2026"
  ));
  assert.doesNotMatch(saturday, /Hispanic|Latino|ethnicity/i);
  const visible = saturday.replace(/href="[^"]*"/g, "");
  assert.doesNotMatch(visible, /\barrest\b/i);
  assert.match(saturday, /Hearing only, no vote/);
  assert.doesNotMatch(saturday, /demolition vote|vote on the demolition/i);
  assert.match(saturday, /City dataset fdj4-gpfu/);
  assert.match(saturday, /https:\/\/data\.austintexas\.gov\/d\/fdj4-gpfu/);
  assert.match(saturday, /Saturday, Nov\. 14, 2026/);
  const signup = saturday.indexOf('class="signup signup--edition"');
  const hornsby = saturday.indexOf("Council weighs Hornsby Bend biosolids plant upgrades");
  const mopac = saturday.indexOf("MoPac crash is Austin");
  const garage = saturday.indexOf("Police seek man in downtown garage assault");
  const notices = saturday.indexOf('id="notices-h"');
  assert.ok(hornsby < signup && signup < mopac && mopac < garage && garage < notices);
  assert.equal(saturday.split('class="signup signup--edition"').length - 1, 1);
  assert.equal(saturday.split('class="source-line"').length - 1, 1);
  assert.match(saturday, new RegExp(
    "property=\"og:title\" content=\"Catalytic converter theft reports surge back\""
  ));
  assert.match(saturday, /catalytic-thefts-desktop-1600\.webp/);
  assert.match(saturday, />297</);
  assert.match(saturday, /Bulletin original/);
});
