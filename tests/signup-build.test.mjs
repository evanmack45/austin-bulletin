import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("_site/index.html", "utf8");
const editionDate = home.match(/data-edition="([0-9-]+)"/)?.[1];
const edition = readFileSync(`_site/${editionDate.replaceAll("-", "/")}/index.html`, "utf8");
const about = readFileSync("_site/about/index.html", "utf8");
const subscribe = readFileSync("_site/subscribe/index.html", "utf8");
const VALUE = "Early voting numbers, council votes, road closures. Free, weekday mornings.";
const EMBED = "<script async data-uid=\"e956043af1\" "
  + "src=\"https://the-austin-bulletin.kit.com/e956043af1/index.js\"></script>";
const NOSCRIPT = "<noscript><a href=\"https://the-austin-bulletin.kit.com/e956043af1\" "
  + "target=\"_blank\" rel=\"noopener\">Subscribe by email</a></noscript>";

function sliceBetween(html, start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from !== -1 && to > from, `${start} before ${end}`);
  return html.slice(from, to);
}

function count(html, needle) {
  return html.split(needle).length - 1;
}

test("the homepage signup sits directly under the lead", () => {
  const lead = sliceBetween(home, 'class="paper-main"', 'class="paper-side"');
  const storyEnd = lead.indexOf("</section>");
  const signupAt = lead.indexOf('class="signup signup--lead"');
  const jumpAt = lead.indexOf('class="edition-jump"');
  assert.ok(storyEnd !== -1 && signupAt > storyEnd);
  assert.ok(jumpAt > signupAt);
  const side = sliceBetween(home, 'class="paper-side"', 'class="signup signup--bar"');
  assert.equal(side.indexOf('class="signup signup--lead"'), -1);
  assert.match(lead, new RegExp(VALUE.replace(/[.]/g, "\\.")));
  assert.match(lead, /The morning edition/);
  assert.match(lead, /data-signup-inline/);
  assert.match(lead, /One email each morning, after you confirm/);
  assert.match(lead, /href="\/feed\.xml"/);
  assert.equal(count(lead, EMBED), 1);
  assert.equal(count(lead, NOSCRIPT), 1);
  assert.doesNotMatch(lead, /action="https:\/\/app\.kit\.com\/forms\/10083630\/subscriptions"/);
  assert.doesNotMatch(home, /No signup|not saved|does not save|not connected/i);
  assert.match(home, /http-equiv="Content-Security-Policy"/);
  assert.match(home, /script-src[^"]*https:\/\/the-austin-bulletin\.kit\.com/);
  assert.match(home, /script-src[^"]*https:\/\/f\.convertkit\.com/);
  assert.match(home, /connect-src[^"]*https:\/\/app\.kit\.com/);
  assert.match(home, /form-action[^"]*https:\/\/app\.kit\.com/);
  assert.match(home, /img-src[^"]*https:\/\/pages\.convertkit\.com/);
  assert.match(home, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
  assert.equal(count(home, EMBED), 2);
});

test("every edition ends with a compact signup and the mobile bar is dismissible", () => {
  assert.match(edition, /class="signup signup--edition"/);
  assert.match(edition, new RegExp(VALUE.replace(/[.]/g, "\\.")));
  assert.ok(edition.indexOf('class="signup signup--edition"') > edition.indexOf("One Good Thing"));
  assert.equal(count(edition, EMBED), 2);
  assert.equal(count(edition, NOSCRIPT), 2);
  assert.match(edition, /data-signup="bar"/);
  assert.match(edition, /data-signup-dismiss/);
  assert.match(edition, />Close</);
  assert.match(edition, /src="\/js\/signup\.js"/);
  assert.doesNotMatch(edition, /action="https:\/\/app\.kit\.com\/forms\/10083630\/subscriptions"/);
  const footer = edition.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.doesNotMatch(footer, /newsletter/i);
});

test("the subscribe page explains the confirmation email", () => {
  assert.match(subscribe, /Kit emails a confirmation link/);
  assert.match(subscribe, /href="\/feed\.xml"/);
  assert.match(subscribe, /class="signup signup--page"/);
  assert.equal(count(subscribe, EMBED), 2);
  assert.match(about, /Kit sends a confirmation email first/);
  assert.match(home, /after you confirm/);
  const pages = `${home}\n${about}\n${subscribe}`;
  assert.doesNotMatch(pages, /not saved|No signup|You're in|not connected/i);
});
