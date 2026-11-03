import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collapseSourceLists,
  documentLabel,
  sourceListHrefs
} from "../scripts/source-lists.mjs";

const CITY = "https://www.austintexas.gov/communications/news/parade";
const CITY_2 = "https://www.austintexas.gov/economic-development/news/grant";
const AGENDA = "https://austintexas.legistar1.com/agenda/committee-agenda.pdf";
const PDF = "https://votetravis.gov/wp-content/uploads/sites.pdf";
const APD = "https://www.austintexas.gov/police/news/case";

function hrefs(html) {
  return sourceListHrefs(html).flat().sort();
}

test("a repeated publisher keeps every link and uses the existing qualifier", () => {
  const html = '<p class="source-line">Sources: ' +
    '<a href="https://www.kxan.com/a">KXAN (fire)</a> · ' +
    '<a href="https://www.fox7austin.com/b">FOX 7 (parade)</a> · ' +
    '<a href="https://www.kxan.com/c">KXAN (gangs)</a></p>';
  const out = collapseSourceLists(html);
  assert.match(out, /KXAN: <a href="https:\/\/www\.kxan\.com\/a">fire<\/a>, /);
  assert.match(out, /<a href="https:\/\/www\.kxan\.com\/c">gangs<\/a>/);
  assert.match(out, /<a href="https:\/\/www\.fox7austin\.com\/b">FOX 7 \(parade\)<\/a>/);
  assert.deepEqual(hrefs(out), hrefs(html));
  assert.equal(collapseSourceLists(out), out);
});

test("bare repeated City of Austin links become release, agenda, and PDF", () => {
  const html = '<p class="source-line">Sources: ' +
    `<a href="${CITY}">City of Austin</a>, ` +
    `<a href="${APD}">Austin Police Department</a>, ` +
    `<a href="${AGENDA}">City of Austin</a>, ` +
    `<a href="${PDF}">City of Austin</a>, ` +
    `<a href="${CITY_2}">City of Austin</a></p>`;
  const out = collapseSourceLists(html);
  assert.match(out, /City of Austin: <a href="[^"]+">release<\/a>, /);
  assert.match(out, /<a href="[^"]+">agenda<\/a>, <a href="[^"]+">PDF<\/a>/);
  assert.match(out, new RegExp(`<a href="${APD}">Austin Police Department</a>`));
  assert.equal(hrefs(out).length, 5);
  assert.deepEqual(hrefs(out), hrefs(html));
});

test("a single source link is left unchanged", () => {
  const html = `<span class="src"><a href="${CITY}">City of Austin</a></span>`;
  assert.equal(collapseSourceLists(html), html);
});

test("document labels come from the URL", () => {
  assert.equal(documentLabel(AGENDA), "agenda");
  assert.equal(documentLabel(PDF), "PDF");
  assert.equal(documentLabel(CITY), "release");
  assert.equal(documentLabel("https://example.com/notes"), "link");
});

test("a source list with prose between links is not rewritten", () => {
  const html = '<span class="src"><a href="https://example.com/a">City of Austin</a> and ' +
    '<a href="https://example.com/b">City of Austin</a></span>';
  assert.equal(collapseSourceLists(html), html);
});
