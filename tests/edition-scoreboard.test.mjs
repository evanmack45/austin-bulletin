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
  assert.match(home, />71\.68</);
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
  assert.match(wednesday, /item\u00a025/);
  assert.match(wednesday, /item\u00a011/);
  assert.match(wednesday, /item\u00a038/);
  assert.match(wednesday, /item\u00a033/);
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
