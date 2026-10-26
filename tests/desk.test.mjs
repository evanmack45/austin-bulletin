import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAction, parseDesk, weatherStrip } from "../scripts/desk.mjs";

test("an if-you with no sentence does not leave a stray period", () => {
  const action = parseAction(
    "<p class=\"if-you\"><span class=\"date-tag\">Thru Nov 1</span> " +
    "<strong>If you want to go:</strong> " +
    "<a href=\"https://example.com/release\">See the city release</a>.</p>"
  );
  assert.equal(action.label, "If you want to go:");
  assert.equal(action.text, "");
  assert.equal(action.linkLabel, "See the city release");
});

test("parseAction drops the label, the date chip, and the period after the link", () => {
  const action = parseAction(
    "<p class=\"if-you\"><span class=\"date-tag\">Nov 20</span> " +
    "<strong>If you live outside city limits:</strong> the online open house " +
    "takes comments through Nov. 20. " +
    "<a href=\"https://example.com/notice\">Read the county notice</a>.</p>"
  );
  assert.equal(action.label, "If you live outside city limits:");
  assert.equal(action.text, "the online open house takes comments through Nov. 20.");
  assert.equal(action.linkLabel, "Read the county notice");
  assert.equal(action.href, "https://example.com/notice");
});

test("the weather strip uses the morning note's high and fog clock", () => {
  const note = "Patchy fog, with a high near 84. Dense fog until 10 a.m.";
  assert.equal(weatherStrip(note), "84° fog till 10am");
});

test("October 25 desk is one lead, two deadlines, and one week item", () => {
  const desk = parseDesk(readFileSync("src/bulletins/2026-10-25.md", "utf8"));
  assert.equal(desk.kicker, "Election");
  assert.equal(desk.figure, "25%");
  assert.match(desk.headline, /slowest in-person day/);
  assert.match(desk.deck, /25\.04%/);
  assert.match(desk.deck, /24,575/);
  assert.equal(desk.weather, "84° fog till 10am");
  assert.equal(desk.closes.length, 2);
  assert.equal(desk.week.length, 1);
  assert.equal(desk.closes[0].when, "Nov 20");
  assert.equal(desk.closes[1].when, "Early 2027");
  assert.equal(desk.week[0].when, "Thru Nov 1");
  assert.match(desk.action.text, /Nov\. 3\.$/);
  assert.doesNotMatch(desk.action.text, /\.\s+\.$/);
  assert.match(desk.action.href, /votetravis\.gov/);
  assert.doesNotMatch(desk.closes.map((item) => item.title).join(" "), /incentive/i);
  assert.doesNotMatch(desk.week[0].title, /100\+/);
});

test("October 26 if-you lines are not empty", () => {
  const desk = parseDesk(readFileSync("src/bulletins/2026-10-26.md", "utf8"));
  const actions = [
    desk.action,
    ...desk.closes.map((item) => item.action),
    ...desk.week.map((item) => item.action)
  ];
  for (const action of actions) {
    assert.ok(action, "missing if-you");
    assert.notEqual(action.text, "", "empty if-you");
    assert.notEqual(action.text, ".", "empty if-you");
  }
  assert.equal(
    desk.week[0].action.text,
    "the festival wraps up Sunday, Nov. 1, and the schedule is searchable " +
    "by date and neighborhood at rootsandwingsfest.com."
  );
  assert.equal(
    desk.week[0].action.href,
    "https://www.austintexas.gov/climate/news/austin-invites-community-outdoors-9th-annual-roots-wings-festival"
  );
});
