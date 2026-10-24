import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("_site/index.html", "utf8");
const editionDate = home.match(/data-edition="([0-9-]+)"/)?.[1];
const edition = readFileSync(`_site/${editionDate.replaceAll("-", "/")}/index.html`, "utf8");
const about = readFileSync("_site/about/index.html", "utf8");
const subscribe = readFileSync("_site/subscribe/index.html", "utf8");
const VALUE = "What matters in Austin, in your inbox each morning. Free.";

function sliceBetween(html, start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from !== -1 && to > from, `${start} before ${end}`);
  return html.slice(from, to);
}

test("the homepage signup sits under the lead story, before the news rail", () => {
  const lead = sliceBetween(home, 'class="front-lead"', 'class="front-news-rail"');
  const actionAt = lead.indexOf('class="front-action"');
  const signupAt = lead.indexOf('class="signup signup--lead"');
  assert.ok(actionAt !== -1 && signupAt > actionAt);
  assert.match(lead, new RegExp(VALUE.replace(/[.]/g, "\\.")));
  assert.match(lead, /for="signup-lead-email"/);
  assert.match(lead, /id="signup-lead-email"[^>]*type="email"/);
  assert.match(lead, /data-signup-inline/);
  assert.match(lead, /aria-live="polite"/);
  assert.doesNotMatch(lead, /name="email"/);
  assert.match(home, /data-endpoint=""/);
  assert.match(home, /action="\/subscribe\/"/);
  assert.doesNotMatch(home, /No signup/);
});

test("every edition ends with a compact signup and the mobile bar is dismissible", () => {
  assert.match(edition, /class="signup signup--edition"/);
  assert.match(edition, new RegExp(VALUE.replace(/[.]/g, "\\.")));
  assert.ok(edition.indexOf('class="signup signup--edition"') > edition.indexOf("One Good Thing"));
  assert.match(edition, /data-signup="bar"/);
  assert.match(edition, /data-signup-dismiss/);
  assert.match(edition, />Close</);
  assert.match(edition, /src="\/js\/signup\.js"/);
  const footer = edition.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.doesNotMatch(footer, /newsletter/i);
});

test("the subscribe page says an unconnected form stores nothing", () => {
  assert.match(subscribe, /not saved and is not sent anywhere/);
  assert.match(subscribe, /Nothing submitted here is stored/);
  assert.match(subscribe, /href="\/feed\.xml"/);
  assert.match(about, /Mail delivery is not connected yet/);
  assert.match(home, /does not save your address/);
  assert.doesNotMatch(home, /You're in/);
});
