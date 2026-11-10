// Visible-word budget for the reset homepage. Masthead, nav, footer, alt text,
// chart ticks, CHART/MAP labels, and source lines are marked data-budget-exempt
// or sit outside <main>.
import { readFileSync } from "node:fs";

const SKIP = /^(script|style|noscript|title)$/i;

function decode(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function marked(tag) {
  return /\bdata-budget-exempt\b/.test(tag)
    || /\bhidden\b/.test(tag)
    || /\baria-hidden="true"/.test(tag)
    || /\bsr-only\b/.test(tag);
}

function skipBlock(html) {
  let out = "";
  let i = 0;
  while (i < html.length) {
    if (html[i] !== "<") {
      const next = html.indexOf("<", i);
      const end = next === -1 ? html.length : next;
      out += html.slice(i, end);
      i = end;
      continue;
    }
    const close = html.indexOf(">", i);
    if (close === -1) break;
    const tag = html.slice(i, close + 1);
    const name = tag.match(/^<\/?([a-z0-9]+)/i)?.[1] ?? "";
    const self = tag.endsWith("/>") || /^(img|br|hr|input|link|meta)$/i.test(name);
    if (!self && !tag.startsWith("</") && (SKIP.test(name) || marked(tag))) {
      const end = matchingClose(html, close + 1, name);
      i = end;
      continue;
    }
    i = close + 1;
  }
  return out;
}

function matchingClose(html, from, name) {
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, "gi");
  re.lastIndex = from;
  let depth = 1;
  let match;
  while ((match = re.exec(html))) {
    const self = match[0].endsWith("/>");
    if (self) continue;
    depth += match[1] ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return html.length;
}

function regionHtml(html, fold) {
  if (!fold) return html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] ?? html;
  const start = html.search(/<[^>]*\bdata-fold\b[^>]*>/i);
  if (start < 0) return "";
  const name = html.slice(start).match(/^<([a-z0-9]+)/i)?.[1];
  const openEnd = html.indexOf(">", start) + 1;
  return html.slice(start, matchingClose(html, openEnd, name));
}

export function wordsIn(html, { fold = false } = {}) {
  const text = decode(skipBlock(regionHtml(html, fold)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ") : [];
}

export function budgetProblems(html, limits) {
  const fold = wordsIn(html, { fold: true });
  const page = wordsIn(html);
  const problems = [];
  if (fold.length > limits.aboveFoldMax) {
    problems.push(`above the fold has ${fold.length} words (max ${limits.aboveFoldMax})`);
  }
  if (page.length > limits.pageMax) {
    problems.push(`page has ${page.length} words (max ${limits.pageMax})`);
  }
  if (/\b(peak|biggest)\b|the most/i.test(html.replace(/<[^>]+>/g, " "))) {
    problems.push("2027 is not the peak, the most, or the biggest year");
  }
  return { fold: fold.length, page: page.length, problems };
}

function readLimits() {
  return JSON.parse(readFileSync("src/_data/homepageBudget.json", "utf8"));
}

if (process.argv[1] && process.argv[1].endsWith("homepage-words.mjs")) {
  const limits = readLimits();
  let failed = false;
  for (const file of ["_site/index.html", "_site/b/index.html"]) {
    const result = budgetProblems(readFileSync(file, "utf8"), limits);
    console.log(`${file}: fold ${result.fold}, page ${result.page}`);
    for (const problem of result.problems) {
      console.error(`${file}: ${problem}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
}
