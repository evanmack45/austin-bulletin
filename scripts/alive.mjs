// Homepage alive pass, from the 2026-10-26 edition on.
// An item may not open with "If you". A homepage headline is 10 words or
// fewer. A photograph needs a credit. An illustration needs that label.

import { parseDesk } from "./desk.mjs";
import { wordCount } from "./river.mjs";

export const ALIVE_FROM = "2026-10-26";
const MAX_HEADLINE_WORDS = 10;
const MAX_IMAGE_BYTES = 300 * 1024;
const IF_YOU = /^if you\b/i;
const ILLUSTRATION = /illustration/i;

export function startsWithIfYou(value) {
  const text = String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return IF_YOU.test(text);
}

function visibleIfYou(inner) {
  return inner.replace(/<span class="date-tag">[\s\S]*?<\/span>/gi, " ");
}

function pushIfYou(problems, value) {
  if (startsWithIfYou(value)) problems.push('an item starts with "If you"');
}

function headlineTitles(desk) {
  const side = [...desk.closes, ...desk.week].map((item) => item.title);
  return [desk.headline, ...side];
}

function headlineProblems(desk) {
  const problems = [];
  for (const title of headlineTitles(desk)) {
    pushIfYou(problems, title);
    if (title && wordCount(title) > MAX_HEADLINE_WORDS) {
      problems.push(`headline is over 10 words: ${title}`);
    }
  }
  return problems;
}

function openerProblems(desk) {
  const problems = [];
  const openers = [desk.deck, desk.action?.label, desk.action?.text];
  for (const item of [...desk.closes, ...desk.week]) {
    openers.push(item.action?.label, item.action?.text);
  }
  for (const opener of openers) pushIfYou(problems, opener);
  return problems;
}

function ifYouBlockProblems(markdown) {
  const problems = [];
  for (const match of String(markdown).matchAll(/<p class="if-you">([\s\S]*?)<\/p>/gi)) {
    pushIfYou(problems, visibleIfYou(match[1]));
  }
  return problems;
}

function photoKeyProblems(desk, catalog) {
  if (!desk.photo) return [];
  if (!/^[a-z0-9-]+$/.test(desk.photo)) return ["lead photo key is invalid"];
  if (!catalog?.[desk.photo]) return [`lead photo ${desk.photo} is not in the image catalog`];
  return [];
}

function attr(tag, name) {
  const double = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (double) return double[1];
  const single = tag.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i"));
  return single ? single[1] : "";
}

function captionText(figure) {
  const caption = figure.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
  if (!caption) return "";
  return caption[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function imageOk(alt, caption) {
  if (ILLUSTRATION.test(`${alt} ${caption}`)) return true;
  const credit = caption.replace(/illustration/ig, " ").replace(/\s+/g, " ").trim();
  return credit.length > 0;
}

function tagsIn(html, caption) {
  const problems = [];
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = attr(tag[0], "src") || "image";
    if (!imageOk(attr(tag[0], "alt"), caption)) {
      problems.push(`${src} lacks a credit or an illustration label`);
    }
  }
  return problems;
}

export function htmlImageProblems(html) {
  const problems = [];
  let outside = String(html ?? "");
  for (const figure of outside.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)) {
    outside = outside.replace(figure[0], "");
    problems.push(...tagsIn(figure[0], captionText(figure[0])));
  }
  problems.push(...tagsIn(outside, ""));
  return problems;
}

function recordText(record) {
  return `${record?.alt || ""} ${record?.caption || ""}`;
}

function kindProblem(key, record, illustrated, credit) {
  if (record?.kind === "illustration" && !illustrated) return `${key} lacks an illustration label`;
  if (record?.kind === "photo" && !credit) return `${key} lacks a credit`;
  return "";
}

function labelProblems(key, record) {
  const illustrated = ILLUSTRATION.test(recordText(record));
  const credit = String(record?.credit || "").trim();
  const specific = kindProblem(key, record, illustrated, credit);
  if (specific) return [specific];
  if (!illustrated && !credit) return [`${key} lacks a credit or an illustration label`];
  return [];
}

function fileProblems(key, record, exists, sizeOf) {
  if (!record || typeof record.file !== "string" || !/^\/images\/[a-z0-9./-]+$/.test(record.file)) {
    return [`${key} file must be a local image path`];
  }
  const rel = `src${record.file}`;
  if (!exists(rel)) return [`${key} file not found`];
  if (sizeOf(rel) >= MAX_IMAGE_BYTES) return [`${key} is over 300KB`];
  return [];
}

export function catalogProblems(catalog, exists, sizeOf) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return ["image credits catalog is missing"];
  }
  const problems = [];
  for (const [key, record] of Object.entries(catalog)) {
    const missing = fileProblems(key, record, exists, sizeOf);
    problems.push(...(missing.length ? missing : labelProblems(key, record)));
  }
  return problems;
}

export function aliveProblems(markdown, catalog, files) {
  const desk = parseDesk(markdown);
  return [
    ...headlineProblems(desk),
    ...openerProblems(desk),
    ...ifYouBlockProblems(markdown),
    ...photoKeyProblems(desk, catalog),
    ...htmlImageProblems(markdown),
    ...catalogProblems(catalog, files.exists, files.sizeOf)
  ];
}
