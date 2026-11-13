import { test } from "node:test";
import assert from "node:assert/strict";
import {
  consolidateStorySources,
  externalStorySourceSets,
  presentSourceHtml,
  publisherName,
  storySourceSets
} from "../scripts/story-sources.mjs";

const CITY = "https://www.austintexas.gov/news/one";
const CITY_2 = "https://www.austintexas.gov/news/two";
const GUIDE = "https://theaustinbulletin.com/vote-2026/";

function story(inner) {
  return `<section class="big-story"><h3>Lead</h3>${inner}</section>`;
}

test("a story keeps one Sources line and the same external URLs", () => {
  const travis = "https://votetravis.gov/current-election/";
  const html = story(
    `<p>First claim. <span class="src"><a href="${CITY}">City of Austin release</a></span></p>` +
    `<p>Second claim. <span class="src"><a href="${CITY_2}">KXAN (fire)</a></span></p>` +
    `<p class="source-line">Sources: <a href="${travis}">Vote Travis: current election</a> · ` +
    `<a href="${GUIDE}">Bulletin guide</a></p>`
  );
  const out = consolidateStorySources(html);
  assert.equal(out.split('class="source-line"').length - 1, 1);
  assert.doesNotMatch(out, /class="src"/);
  assert.match(out, /source-label">Sources:<\/span>/);
  assert.equal(out.includes(" · "), false);
  assert.match(out, new RegExp(`<a href="${CITY}">City of Austin release</a>`));
  assert.match(out, new RegExp(`<a href="${CITY_2}">KXAN</a>`));
  assert.match(out, new RegExp(`<a href="${travis}">Vote Travis</a>`));
  assert.deepEqual(storySourceSets(out), storySourceSets(html));
  assert.deepEqual(externalStorySourceSets(out), externalStorySourceSets(html));
  assert.deepEqual(externalStorySourceSets(out), [[CITY, CITY_2, travis].sort()]);
  assert.equal(consolidateStorySources(out), out);
});

test("publisher names come from the existing label", () => {
  assert.equal(publisherName("Vote Travis: current election"), "Vote Travis");
  assert.equal(publisherName("KXAN (fire)"), "KXAN");
  assert.equal(publisherName("APD's Nov. 2 release"), "APD's Nov. 2 release");
});

test("a calculation note stays with the source line", () => {
  const html = "<div class=\"river\"><h5>Deaths</h5><p>Nine fewer.</p>" +
    `<span class="src">Bulletin calculation from <a href="${CITY}">APD's Nov. 2 release</a>` +
    "</span></div>";
  const out = consolidateStorySources(html);
  assert.match(out, /Sources:<\/span> Bulletin calculation from /);
  assert.match(out, new RegExp(`href="${CITY}"`));
  assert.deepEqual(storySourceSets(out), storySourceSets(html));
});

test("one source still uses the Sources label", () => {
  const html = "<div class=\"river\"><h5>Item</h5><p>Text.</p>" +
    `<span class="src">Source: <a href="${CITY}">KUT</a></span></div>`;
  const out = consolidateStorySources(html);
  assert.match(out, /source-label">Sources:<\/span> <a href="[^"]+">KUT<\/a>/);
  assert.equal(out.includes("Source: Source"), false);
  assert.equal(consolidateStorySources(out), out);
});

test("several sources are a group with the label on the first", () => {
  const html = "<div class=\"river\"><h5>Item</h5><p>Text.</p>" +
    `<span class="src">Sources: <a href="${CITY}">Agenda</a> · ` +
    `<a href="${CITY_2}">Meeting page</a></span></div>`;
  const out = consolidateStorySources(html);
  assert.match(out, /source-label">Sources:<\/span> <a href="[^"]+">Agenda<\/a>/);
  assert.match(out, /<span class="source-group"><a href="[^"]+">Meeting page<\/a>/);
  assert.equal(out.includes(" · "), false);
  assert.equal(out.split('class="source-group"').length - 1, 2);
  assert.equal(consolidateStorySources(out), out);
});

test("homepage source html uses the Sources label", () => {
  const html = `<span class="src">Source: <a href="${CITY}">NWS forecast for Austin</a></span>`;
  const out = presentSourceHtml(html);
  assert.match(out, /source-label">Sources:<\/span>/);
  assert.equal(out.includes(" · "), false);
  assert.equal(presentSourceHtml(out), out);
});
