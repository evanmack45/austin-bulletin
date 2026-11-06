import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const home = readFileSync("_site/index.html", "utf8");
const editionDate = home.match(/data-edition="([0-9-]+)"/)?.[1];
const edition = readFileSync(`_site/${editionDate.replaceAll("-", "/")}/index.html`, "utf8");
const about = readFileSync("_site/about/index.html", "utf8");
const subscribe = readFileSync("_site/subscribe/index.html", "utf8");
const archive = readFileSync("_site/archive/index.html", "utf8");
const corrections = readFileSync("_site/corrections/index.html", "utf8");
const vote = readFileSync("_site/vote-2026/index.html", "utf8");
const VALUE = /Get the morning email\./;
const NOTE = /Sign up and the first issue reaches you once it goes out\./;
const ACTION = "https://app.kit.com/forms/10083630/subscriptions";

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "pagefind") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function sliceBetween(html, start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from !== -1 && to > from, `${start} before ${end}`);
  return html.slice(from, to);
}

function count(html, needle) {
  return html.split(needle).length - 1;
}

test("the homepage signup follows the first listed story", () => {
  const main = sliceBetween(home, 'class="paper-main"', 'class="site-footer"');
  const heads = [...main.matchAll(/<h1\b|<h3\b|class="signup signup--lead"/g)].map((match) => (
    match[0].startsWith("<h1") ? "h1" : match[0].startsWith("<h3") ? "h3" : "signup"
  ));
  assert.equal(heads.filter((tag) => tag === "signup").length, 1);
  const canvass = main.indexOf("Council canvasses the election");
  const notices = main.indexOf(">Notices<");
  assert.ok(canvass !== -1 && notices > canvass);
  const signupHtml = main.indexOf('class="signup signup--lead"');
  const jumpAt = main.indexOf('class="edition-jump"');
  assert.ok(signupHtml !== -1 && jumpAt > signupHtml);
  assert.equal(main.includes('class="paper-side"'), false);
  assert.match(main, VALUE);
  assert.match(main, NOTE);
  assert.match(main, /The morning edition/);
  assert.match(main, /data-signup-inline/);
  assert.doesNotMatch(home, /5 minutes|One email each morning/i);
  assert.match(main, /href="\/feed\.xml"/);
  assert.match(main, /<label class="signup-label" for="signup-email-lead">Email<\/label>/);
  assert.match(main, /id="signup-email-lead"[^>]*name="email_address"/);
  const formTag = `<form class="signup-form" method="post" action="${ACTION}" `
    + `data-uid="e956043af1">`;
  assert.match(main, new RegExp(formTag));
  assert.equal(count(home, `action="${ACTION}"`), 1);
  assert.doesNotMatch(home, /signup--bar/);
  assert.doesNotMatch(home, /signup--footer/);
  assert.doesNotMatch(home, /No signup|not saved|does not save|not connected/i);
  assert.match(home, /http-equiv="Content-Security-Policy"/);
  assert.match(home, /script-src[^"]*https:\/\/the-austin-bulletin\.kit\.com/);
  assert.match(home, /script-src[^"]*https:\/\/f\.convertkit\.com/);
  assert.match(home, /connect-src[^"]*https:\/\/app\.kit\.com/);
  assert.match(home, /form-action[^"]*https:\/\/app\.kit\.com/);
  assert.match(home, /img-src[^"]*https:\/\/pages\.convertkit\.com/);
  assert.match(home, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
});

test("every edition ends with a compact signup and the mobile bar is dismissible", () => {
  assert.match(edition, /class="signup signup--edition"/);
  assert.match(edition, VALUE);
  assert.match(edition, NOTE);
  assert.ok(edition.indexOf('class="signup signup--edition"') > edition.indexOf("One Good Thing"));
  assert.equal(count(edition, `action="${ACTION}"`), 1);
  assert.match(edition, /name="email_address"/);
  assert.match(edition, /for="signup-email-edition"/);
  assert.match(edition, /src="\/js\/signup\.js"/);
  assert.doesNotMatch(edition, /signup--bar|signup--footer/);
  const footer = edition.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.doesNotMatch(footer, /newsletter/i);
});

test("the subscribe page explains the confirmation email", () => {
  assert.match(subscribe, /Kit emails a confirmation link/);
  assert.match(subscribe, /href="\/feed\.xml"/);
  assert.match(subscribe, /class="signup signup--page"/);
  assert.equal(count(subscribe, `action="${ACTION}"`), 1);
  assert.doesNotMatch(subscribe, /One email each morning|5 minutes/i);
  assert.doesNotMatch(subscribe, /signup--footer/);
  assert.match(about, /Kit sends a confirmation email first/);
  assert.match(about, /class="signup signup--footer"/);
  assert.match(archive, /class="signup signup--footer"/);
  assert.match(corrections, /class="signup signup--footer"/);
  assert.match(vote, /class="signup signup--footer"/);
  assert.match(home, NOTE);
  const pages = `${home}\n${about}\n${subscribe}`;
  assert.doesNotMatch(pages, /not saved|No signup|You're in|not connected/i);
});

test("every HTML page renders one Kit form", () => {
  const pages = htmlFiles("_site");
  assert.ok(pages.length > 20);
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    assert.equal(count(html, `action="${ACTION}"`), 1, file);
    assert.doesNotMatch(html, /signup--bar/, file);
    assert.match(html, /method="post"/);
    assert.match(html, /name="email_address"/);
    assert.match(html, /data-uid="e956043af1"/);
    const ids = [...html.matchAll(/id="(signup-email-[^"]+)"/g)].map((match) => match[1]);
    assert.ok(ids.length >= 1, file);
    for (const id of ids) assert.ok(html.includes(`for="${id}"`), `${file} ${id}`);
  }
});
