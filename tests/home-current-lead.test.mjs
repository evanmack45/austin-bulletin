import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEAD, LEAD_DATE } from "./current-lead.mjs";

const ENTITIES = { "&#39;": "'", "&amp;": "&", "&quot;": "\"" };
const SITE = "https://theaustinbulletin.com";

function plain(html) {
  return String(html)
    .replaceAll("\u00a0", " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#39;|&amp;|&quot;/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function leadSection(html) {
  const re = /<section class="[^"]*\bstory-card--lead\b[^"]*"[\s\S]*?<\/section>/;
  return html.match(re)?.[0] ?? "";
}

test("the homepage leads with the newest edition's lead card", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const lead = leadSection(html);
  assert.ok(lead, "lead section");
  assert.match(html, new RegExp(`<meta name="edition-date" content="${LEAD_DATE}">`));
  assert.equal(plain(lead.match(/<h1\b[\s\S]*?<\/h1>/)?.[0] ?? ""), plain(LEAD.headline));
  const anchor = `href="/${LEAD_DATE.replaceAll("-", "/")}/#${LEAD.id}"`;
  assert.ok(lead.includes(anchor), "links to the edition card");
  assert.ok(plain(lead).includes(plain(LEAD.bignum)), "big number");
  for (const source of LEAD.sources) assert.ok(lead.includes(source.url), source.url);
  assert.equal((lead.match(/class="chart-col"/g) || []).length, LEAD.bars.length);
  assert.match(lead, new RegExp(`--bar-count: ${LEAD.bars.length}`));
  const md = readFileSync(`src/bulletins/${LEAD_DATE}.md`, "utf8");
  const image = md.match(/\n\s+src:\s*(\S+)/)?.[1];
  assert.ok(image, "edition lead image");
  assert.ok(html.includes(`property="og:image" content="${SITE}${image}"`), "og:image");
});

test("homepage outcomes and week items are current", () => {
  const html = readFileSync("_site/index.html", "utf8");
  const outcomes = JSON.parse(readFileSync("src/_data/homeOutcomes.json", "utf8"));
  if (outcomes.items.length) {
    const heading = `${escapeRe(outcomes.label)} · ${outcomes.items.length} outcomes`;
    assert.match(plain(html), new RegExp(heading));
  }
  const week = html.match(/<ul class="week-lines"[\s\S]*?<\/ul>/)?.[0] ?? "";
  const dates = [...week.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
  for (const date of dates) assert.ok(date >= LEAD_DATE, `${date} is before ${LEAD_DATE}`);
});
