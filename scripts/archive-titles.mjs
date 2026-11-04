// The archive line is a day's two or three biggest items, not the briefing
// headline. Editions set archive_title in front matter. Older files fall
// back to the briefing headline. From ARCHIVE_TITLE_REQUIRED_FROM the
// field is required so a new edition cannot ship without choosing the line.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { briefingHeadline } from "./metadata.mjs";

export const ARCHIVE_TITLE_REQUIRED_FROM = "2026-11-04";

const PERCENT = /\d{1,3}(?:\.\d+)?\s*%/;
const STARTS_WITH_PERCENT = /^\d{1,3}(?:\.\d+)?\s*%/;
const ENDS_WITH_PERCENT = /:\s*\d{1,3}(?:\.\d+)?\s*%\s*\.?$/;

export function explicitArchiveTitle(markdown) {
  const match = /^---\n([\s\S]*?)\n---/.exec(String(markdown ?? ""));
  if (!match) return "";
  const data = yaml.load(match[1]);
  const value = data && typeof data === "object" ? data.archive_title : "";
  return typeof value === "string" ? value.trim() : "";
}

export function archiveTitle(markdown) {
  return explicitArchiveTitle(markdown) || briefingHeadline(markdown);
}

// A bare "41.98%" turnout line, a line that starts with one, or a short
// line whose point is the percentage. A dollar figure has no % sign.
export function mostlyPercentage(title) {
  const text = String(title ?? "").trim();
  if (!PERCENT.test(text)) return false;
  if (STARTS_WITH_PERCENT.test(text) || ENDS_WITH_PERCENT.test(text)) return true;
  return text.split(/\s+/).filter(Boolean).length <= 10;
}

function problemsForEdition(edition, previousTitle) {
  const found = [];
  const title = String(edition.title ?? "").trim();
  const date = edition.date;
  if (!title) found.push(`${date}: archive title is empty`);
  else if (mostlyPercentage(title)) {
    found.push(`${date}: archive title is mostly a percentage ("${title}")`);
  } else if (previousTitle && title === previousTitle) {
    found.push(`${date}: archive title repeats the previous edition ("${title}")`);
  }
  if (date >= ARCHIVE_TITLE_REQUIRED_FROM && !edition.explicit) {
    found.push(`${date}: set archive_title in front matter`);
  }
  return found;
}

export function archiveTitleProblems(editions) {
  const sorted = [...editions].sort((a, b) => a.date.localeCompare(b.date));
  const problems = [];
  let previous = "";
  for (const edition of sorted) {
    problems.push(...problemsForEdition(edition, previous));
    previous = String(edition.title ?? "").trim();
  }
  return problems;
}

export async function editionArchiveTitles(dir) {
  const names = (await readdir(dir)).filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name));
  const editions = [];
  for (const name of names.sort()) {
    const markdown = await readFile(path.join(dir, name), "utf8");
    const explicit = explicitArchiveTitle(markdown);
    editions.push({
      date: name.slice(0, 10),
      title: explicit || briefingHeadline(markdown),
      explicit: explicit.length > 0
    });
  }
  return editions;
}
