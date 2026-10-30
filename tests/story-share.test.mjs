import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { shareOrCopy } from "../src/js/share.js";
import { shouldAddStoryShare, storyAnchorIds, withStoryShare } from "../scripts/story-share.mjs";

const page = "/2026/10/30/";
const origin = "https://theaustinbulletin.com/2026/10/30/";

function sample() {
  return `<section class="big-story"><h3 id="park-access">Park access</h3><p>Body</p></section>
<div class="river river--tiered"><div class="video-box"><iframe></iframe></div>
<h5 id="custom-id">Other headline</h5><p>One <span class="src">City</span></p>
<h5>New story &amp; bills</h5><p>Two</p>
<h5>New story &amp; bills</h5><p>Three</p></div>`;
}

test("story share keeps existing ids and slugs headlines that have none", () => {
  const html = withStoryShare(sample(), page);
  assert.match(html, /<h3 id="park-access">Park access<\/h3><div class="story-share">/);
  assert.match(html, new RegExp(`href="${origin}#park-access"`));
  assert.match(html, /<h5 id="custom-id">Other headline<\/h5><div class="story-share">/);
  assert.match(html, /<h5 id="new-story-bills">New story &amp; bills<\/h5>/);
  assert.match(html, /<h5 id="new-story-bills-2">/);
  assert.match(html, /<button type="button" class="story-share-button" hidden/);
  assert.match(html, />Share<\/button>/);
  assert.match(html, />Link<\/a>/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-share-title="New story &amp; bills"/);
  assert.equal(withStoryShare(html, page), html);
  const ids = storyAnchorIds(html);
  assert.deepEqual(ids, ["park-access", "custom-id", "new-story-bills", "new-story-bills-2"]);
  assert.equal(new Set(ids).size, ids.length);
});

test("story share leaves other pages alone", () => {
  const html = "<h3>About</h3>";
  assert.equal(withStoryShare(html, "/about/"), html);
});

test("the feed pass does not add share controls", () => {
  const edition = "/tmp/site/2026/10/30/index.html";
  assert.equal(shouldAddStoryShare("https://theaustinbulletin.com/", edition), false);
  assert.equal(shouldAddStoryShare(undefined, edition), true);
  assert.equal(shouldAddStoryShare(undefined, "/tmp/site/about/index.html"), false);
});

test("share controls are a 24px target in the muted ink", async () => {
  const css = await readFile("src/css/style.css", "utf8");
  const rule = css.match(/\.story-share-button,\n\.story-share-link \{[\s\S]*?\n\}/);
  assert.ok(rule);
  assert.match(rule[0], /min-width: 24px;/);
  assert.match(rule[0], /min-height: 24px;/);
  assert.match(rule[0], /color: var\(--muted\);/);
  const hidden = "\\.story-share-button\\[hidden\\],\\n" +
    "\\.story-share-link\\[hidden\\] \\{ display: none; \\}";
  assert.match(css, new RegExp(hidden));
});

test("the share sheet gets the story title and permalink", async () => {
  let shared;
  const message = await shareOrCopy({
    title: "Park access",
    url: `${origin}#park-access`,
    canShare: true,
    share: async (data) => { shared = data; },
    writeText: async () => { throw new Error("should not copy"); }
  });
  assert.equal(message, "");
  assert.deepEqual(shared, { title: "Park access", url: `${origin}#park-access` });
});

test("a cancelled share sheet does not copy the link", async () => {
  let copied = false;
  const message = await shareOrCopy({
    title: "Park access",
    url: `${origin}#park-access`,
    canShare: true,
    share: async () => {
      const error = new Error("cancel");
      error.name = "AbortError";
      throw error;
    },
    writeText: async () => { copied = true; }
  });
  assert.equal(message, "");
  assert.equal(copied, false);
});

test("without a share sheet the permalink is copied", async () => {
  let copied = "";
  const message = await shareOrCopy({
    title: "Park access",
    url: `${origin}#park-access`,
    canShare: false,
    share: async () => {},
    writeText: async (value) => { copied = value; }
  });
  assert.equal(message, "Link copied");
  assert.equal(copied, `${origin}#park-access`);
});

test("a failed share sheet still copies the permalink", async () => {
  let copied = "";
  const message = await shareOrCopy({
    title: "Park access",
    url: `${origin}#park-access`,
    canShare: true,
    share: async () => { throw new Error("unavailable"); },
    writeText: async (value) => { copied = value; }
  });
  assert.equal(message, "Link copied");
  assert.equal(copied, `${origin}#park-access`);
});

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(name);
    return name.endsWith(".html") ? [name] : [];
  }));
  return nested.flat();
}

test("every edition page has og:image and unique story anchors", {
  skip: !existsSync("_site/index.html") && "run npm run build before integration checks"
}, async () => {
  const files = (await htmlFiles("_site")).filter((file) =>
    /\/\d{4}\/\d{2}\/\d{2}\/index\.html$/.test(file.replaceAll("\\", "/")));
  assert.ok(files.length > 10);
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const image = html.match(/property="og:image" content="([^"]+)"/);
    assert.ok(image, file);
    assert.match(image[1], /^https:\/\/theaustinbulletin\.com\//);
    const ids = storyAnchorIds(html);
    assert.ok(ids.length > 0 && ids.every(Boolean), file);
    assert.equal(new Set(ids).size, ids.length, file);
    for (const id of ids) assert.ok(html.includes(`#${id}"`), `${file} #${id}`);
  }
});
