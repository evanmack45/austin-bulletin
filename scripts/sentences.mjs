// Duplicate sentences on a built page.
//
// The October 26 draft repeated sentences to clear the City Desk item floor.
// This check reads built HTML, not the markdown: a sentence counts once it is
// on the page. Whitespace and case are ignored. A sentence needs six words.
// Periods in abbreviations, initials, and decimals are not sentence ends.
//
// The edition header reprints the briefing headline as the page title
// (edition-lead-title). That mirror is the title, not a second telling, so
// it is left out of the scan. The headline still has to appear in the article.
// The homepage jump list (nav.today-top) repeats card headlines as links.
// The edition skim (nav.skim) repeats story headlines the same way.
// That index is not a second telling either. The signup promise is the same
// line in the page block and the mobile bar, so those sections are left out.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const MIN_WORDS = 6;
const ABBREVIATIONS = [
  "mr", "mrs", "ms", "dr", "sr", "jr", "gen", "rep", "sen", "gov", "lt", "sgt",
  "prof", "rev", "hon", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep",
  "sept", "oct", "nov", "dec", "st", "ave", "blvd", "rd", "dept", "govt", "est",
  "al", "fig", "inc", "ltd", "vs"
];

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"',
  hellip: "…", middot: " "
};

function namedEntity(name) {
  return ENTITIES[name.toLowerCase()] ?? " ";
}

function numericEntity(name) {
  const hex = name[1] === "x" || name[1] === "X";
  const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
  const ok = Number.isFinite(code) && code >= 1 && code <= 0x10ffff;
  return ok ? String.fromCodePoint(code) : " ";
}

function entity(match, name) {
  return name.startsWith("#") ? numericEntity(name) : namedEntity(name);
}

function decode(value) {
  return value
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, entity)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

export function visibleText(html) {
  const withoutTitle = String(html)
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<h1\b[^>]*class="[^"]*\bedition-lead-title\b[^"]*"[^>]*>[\s\S]*?<\/h1>/gi, " ")
    .replace(/<nav\b[^>]*\btoday-top\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<nav\b[^>]*\bskim\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<p\b[^>]*\bclass="[^"]*\bcouncil-did\b[^"]*"[^>]*>[\s\S]*?<\/p>/gi, " ")
    .replace(/<section\b[^>]*\bclass="[^"]*\bsignup\b[^"]*"[^>]*>[\s\S]*?<\/section>/gi, " ");
  const text = decode(withoutTitle.replace(/<[^>]+>/g, " "));
  return text.replace(/\s+/g, " ").trim();
}

function maskPeriods(text) {
  const abbr = new RegExp(`\\b(?:${ABBREVIATIONS.join("|")})\\.`, "gi");
  return text
    .replace(abbr, (token) => `${token.slice(0, -1)}§`)
    .replace(/\b(?:[ap]\.m|u\.s|u\.k|e\.g|i\.e)\./gi, (token) => token.replaceAll(".", "§"))
    .replace(/\b[A-Z]\./g, (token) => `${token[0]}§`)
    .replace(/(\d)\.(\d)/g, "$1§$2");
}

function wordCount(sentence) {
  return sentence.split(" ").length;
}

function splitSentences(text) {
  return maskPeriods(text).split(/(?<=[.!?])\s+/)
    .map((part) => part.replaceAll("§", ".").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// The first one or two sentences of story text, unchanged. Abbreviations,
// initials, and decimals are not sentence ends. Nothing is rewritten.
export function openingSentences(text, limit = 2) {
  const raw = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!raw || limit < 1) return "";
  return splitSentences(raw).slice(0, limit).join(" ");
}

export function sentencesIn(html) {
  return splitSentences(visibleText(html))
    .map((part) => part.toLowerCase())
    .filter((part) => wordCount(part) >= MIN_WORDS);
}

export function duplicateSentences(html) {
  const counts = new Map();
  for (const sentence of sentencesIn(html)) {
    counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
  }
  return [...counts].filter(([, count]) => count > 1).map(([sentence]) => sentence);
}

async function htmlFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "pagefind") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

// The Nov. 8 Hornsby story opens with the same two sentences the If you box
// prints. Home reads the opening; the box is the required Sunday label.
const PUBLISHED_REPEATS = new Map([
  ["2026/11/08/index.html", new Set([
    "the proposed construction would replace the plant's existing headworks " +
      "and add a sludge receiving station, an ammonia removal facility and " +
      "drainage improvements at austin water's hornsby bend biosolids plant.",
    "these are proposed contracts; council will act only on the final agenda."
  ])]
]);

export function publishedRepeat(file, sentence) {
  const key = String(file).replaceAll("\\", "/");
  return PUBLISHED_REPEATS.get(key)?.has(sentence) === true;
}

export async function duplicateSentenceProblems(dir) {
  const problems = [];
  for (const file of await htmlFiles(dir)) {
    const html = await readFile(file, "utf8");
    const rel = path.relative(dir, file);
    for (const sentence of duplicateSentences(html)) {
      if (publishedRepeat(rel, sentence)) continue;
      problems.push({ file: rel, sentence });
    }
  }
  return problems;
}

export function formatSentenceProblem(problem) {
  return `duplicate sentence in ${problem.file}: ${problem.sentence}`;
}
