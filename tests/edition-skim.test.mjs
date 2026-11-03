import { test } from "node:test";
import assert from "node:assert/strict";
import { editionStories, skimList, withStoryAnchors } from "../scripts/edition-skim.mjs";

function edition(stories) {
  const river = stories.river || "";
  const title = stories.big || "The lead";
  const big = stories.big === "" ? "" :
    `<section class="big-story"><h3 id="lead">${title}</h3><p>Body</p></section>`;
  return `${big}<div class="river">${river}</div>`;
}

test("one story does not get a skim list", () => {
  const html = edition({ river: "" });
  assert.equal(editionStories(html).length, 1);
  assert.deepEqual(skimList(html), []);
});

test("lead headlines and brief sentences skim in order, capped at five", () => {
  const briefs = [1, 2, 3, 4].map((n) =>
    `<p>Brief sentence number ${n} stands alone. <span class="src"><a href="https://example.com/${n}">KXAN</a></span></p>`
  ).join("");
  const html = edition({
    big: "Election Day is Tuesday",
    river: "<h4 id=\"city-hall\">City Hall</h4>" +
      "<h5 id=\"voters\">About 500,900 registered voters haven't voted</h5>" +
      "<p>Early voting ended. <span class=\"src\"><a href=\"https://example.com/v\">County</a></span></p>" +
      briefs
  });
  const stories = editionStories(html);
  assert.equal(stories.length, 6);
  assert.equal(stories[0].title, "Election Day is Tuesday");
  assert.equal(stories[0].anchor, "lead");
  assert.equal(stories[1].title, "About 500,900 registered voters haven't voted");
  assert.equal(stories[1].anchor, "voters");
  assert.equal(stories[2].title, "Brief sentence number 1 stands alone.");
  const skim = skimList(html);
  assert.equal(skim.length, 5);
  assert.equal(skim[4].title, "Brief sentence number 3 stands alone.");
});

test("a lead's source and a later source span are not extra stories", () => {
  const html = edition({
    river: "<h5 id=\"ballot\">What's on the ballot</h5>" +
      "<div class=\"story-share\"><a href=\"https://theaustinbulletin.com/2026/11/01/#ballot\">Link</a></div>" +
      "<p>Austin voters will see 10 city propositions.</p>" +
      "<span class=\"src\"><a href=\"https://example.com/a\">Ballot PDF</a></span>" +
      "<span class=\"src\"><a href=\"https://example.com/b\">Voter guide</a></span>" +
      "<p class=\"source-line\">Sources: <a href=\"https://example.com/c\">KXAN</a></p>"
  });
  const stories = editionStories(html);
  assert.equal(stories.length, 2);
  assert.deepEqual(stories.map((story) => story.anchor), ["lead", "ballot"]);
});

test("brief anchors are added from the sentence and left in the page", () => {
  const html = edition({
    river: "<p>CapMetro's Red Line is closed for track work. " +
      "<span class=\"src\">Statesman</span></p>"
  });
  const stamped = withStoryAnchors(html);
  const stories = editionStories(stamped);
  assert.equal(stories.length, 2);
  assert.equal(stories[1].anchor, "capmetros-red-line-is-closed-for-track-work");
  assert.match(stamped, new RegExp(`<p id="${stories[1].anchor}">`));
  assert.equal(withStoryAnchors(stamped), stamped);
});
