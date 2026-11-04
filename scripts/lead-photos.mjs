// One lead image per edition. Editions on the grandfather list may still
// share a file with each other. Any later edition has to use its own file,
// or no photo.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

const PHOTO_KEY = /<!--\s*desk:photo\s+([a-z0-9-]+)\s*-->/;

export function frontMatter(markdown) {
  const match = String(markdown ?? "").match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : "";
}

function leadSrc(data) {
  const src = data?.images?.lead?.src;
  return typeof src === "string" ? src : "";
}

export function declaredLeadSrc(markdown) {
  const fm = frontMatter(markdown);
  if (!/^images\s*:/m.test(fm)) return "";
  try {
    return leadSrc(yaml.load(fm));
  } catch {
    return "";
  }
}

export function catalogLeadSrc(markdown, catalog) {
  const key = String(markdown ?? "").match(PHOTO_KEY)?.[1];
  const file = key ? catalog?.[key]?.file : "";
  return typeof file === "string" ? file : "";
}

export function leadFileFor(markdown, catalog) {
  return declaredLeadSrc(markdown) || catalogLeadSrc(markdown, catalog);
}

function freshDates(dates, allowed) {
  return dates.filter((date) => !allowed.has(date));
}

function groupLeadFiles(entries) {
  const groups = new Map();
  for (const entry of entries ?? []) {
    if (!entry?.file) continue;
    const dates = groups.get(entry.file) ?? [];
    dates.push(entry.date);
    groups.set(entry.file, dates);
  }
  return groups;
}

export function duplicateLeadProblems(entries, allowlist) {
  const allowed = new Set(allowlist ?? []);
  const problems = [];
  for (const [file, dates] of groupLeadFiles(entries)) {
    if (dates.length < 2) continue;
    if (freshDates(dates, allowed).length === 0) continue;
    problems.push(`${file} is the lead for ${dates.join(", ")}`);
  }
  return problems;
}

export async function editionLeadEntries(bulletinDir, catalog) {
  const names = (await readdir(bulletinDir))
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .sort();
  const entries = [];
  for (const name of names) {
    const markdown = await readFile(path.join(bulletinDir, name), "utf8");
    entries.push({ date: name.slice(0, 10), file: leadFileFor(markdown, catalog) });
  }
  return entries;
}

async function readJson(root, rel) {
  return JSON.parse(await readFile(path.join(root, rel), "utf8"));
}

export async function leadReuseProblems(repoRoot, bulletinDir) {
  const catalog = await readJson(repoRoot, "src/_data/imageCredits.json");
  const allow = await readJson(repoRoot, "src/_data/leadPhotoAllowlist.json");
  const entries = await editionLeadEntries(bulletinDir, catalog);
  return duplicateLeadProblems(entries, allow.editions);
}
