import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("cover keeps native source actions and its styles out of dated editions", () => {
 const html=readFileSync("_site/index.html","utf8");
 for(const text of ["Austin, up close.", "A daily selection of local reporting.",
  '/css/front-cover.css', 'class="front-lead"', 'class="front-news-rail"',
  '/archive/#search', 'class="front-action"']) assert.ok(html.includes(text),text);
 assert.ok(!html.includes("barton-springs-960.webp"),"related guide has no old pool photo");
 assert.ok(html.indexOf("front-news-rail") < html.indexOf("front-edition"));
 const edition=html.match(/data-edition="([0-9-]+)"/)?.[1];
 assert.ok(edition);
 const archive=readFileSync(`_site/${edition.replaceAll("-","/")}/index.html`,"utf8");
 assert.ok(!archive.includes("/css/front-cover.css"),"archive keeps its own presentation");
});
