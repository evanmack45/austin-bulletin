// Build check: edition pages with two or more stories carry the skim list,
// and collapsing a source list does not drop any of its links.
//
// Usage: node scripts/check-skim.mjs [site-dir]

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { editionStories } from "./edition-skim.mjs";
import { plainText } from "./metadata.mjs";
import {
  externalStorySourceSets,
  normalizeBulletin,
  storySourceSets
} from "./story-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIM_LIMIT = 5;

function articleOf(html) {
  const match = String(html).match(
    /<article\b[^>]*class="[^"]*\bbulletin\b[^"]*"[^>]*>([\s\S]*?)<\/article>/i
  );
  return match ? match[1] : String(html);
}

function skimNav(html) {
  return String(html).match(/<nav\b[^>]*class="[^"]*\bskim\b[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
}

function skimLinks(navInner) {
  const re = /<a\b[^>]*href="#([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  return [...navInner.matchAll(re)].map((match) => ({
    anchor: plainText(match[1]),
    title: plainText(match[2])
  }));
}

function expectSkim(html, stories, label, problems) {
  const nav = skimNav(html);
  if (stories.length < 2) {
    if (nav) problems.push(`${label}: skim list on a one-story edition`);
    return;
  }
  if (!nav) {
    problems.push(`${label}: missing skim list`);
    return;
  }
  if (!nav[1].includes('id="skim-title"')) problems.push(`${label}: skim list has no heading`);
  const links = skimLinks(nav[1]);
  const expected = stories.slice(0, SKIM_LIMIT);
  if (links.length !== expected.length) {
    problems.push(`${label}: skim has ${links.length} lines, expected ${expected.length}`);
  }
  expected.forEach((story, index) => {
    const link = links[index];
    if (!link) return;
    if (link.anchor !== story.anchor || link.title !== story.title) {
      problems.push(`${label}: skim line ${index + 1} does not match the story`);
    }
    if (!html.includes(`id="${story.anchor}"`)) {
      problems.push(`${label}: skim target #${story.anchor} is missing`);
    }
  });
}

function sameSets(before, after) {
  if (before.length !== after.length) return false;
  return before.every((list, index) => list.join("\n") === after[index].join("\n"));
}

async function bulletinFiles(dir) {
  const names = await readdir(dir);
  return names.filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name)).sort();
}

function builtPath(siteDir, markdown) {
  const permalink = markdown.match(/^permalink:\s*"([^"]+)"/m)?.[1] || "";
  const rel = permalink.replace(/^\/+|\/+$/g, "");
  return rel ? path.join(siteDir, rel, "index.html") : "";
}

async function checkEdition(siteDir, bulletinDir, name) {
  const markdown = await readFile(path.join(bulletinDir, name), "utf8");
  const built = builtPath(siteDir, markdown);
  const label = name.replace(/\.md$/, "");
  if (!built) return [`${label}: no permalink`];
  let html = "";
  try {
    html = await readFile(built, "utf8");
  } catch {
    return [`${label}: built page missing`];
  }
  const stories = editionStories(html);
  const problems = [];
  if (stories.length === 0) problems.push(`${label}: no stories found`);
  expectSkim(html, stories, label, problems);
  const source = normalizeBulletin(markdown);
  const article = articleOf(html);
  const before = storySourceSets(source);
  const after = storySourceSets(article);
  const beforeExternal = externalStorySourceSets(source);
  const afterExternal = externalStorySourceSets(article);
  if (!sameSets(before, after) || !sameSets(beforeExternal, afterExternal)) {
    problems.push(`${label}: source URLs changed`);
  }
  return problems;
}

export async function skimProblems(siteDir, bulletinDir) {
  const names = await bulletinFiles(bulletinDir);
  const nested = await Promise.all(names.map((name) => checkEdition(siteDir, bulletinDir, name)));
  const problems = nested.flat();
  let home = "";
  try {
    home = await readFile(path.join(siteDir, "index.html"), "utf8");
  } catch {
    return [...problems, "homepage missing"];
  }
  const fullEdition = /<article\b[^>]*class="[^"]*\bbulletin\b/.test(home);
  const hasSkim = /<nav\b[^>]*class="[^"]*\bskim\b/.test(home);
  if (fullEdition) expectSkim(home, editionStories(home), "homepage", problems);
  else if (hasSkim) problems.push("homepage: skim list without the full edition");
  return problems;
}

function report(problems) {
  if (problems.length === 0) {
    console.error("check: skim lists and source links");
    return;
  }
  for (const problem of problems) console.error(`check: ${problem}`);
  process.exitCode = 1;
}

async function main() {
  const siteDir = path.resolve(root, process.argv[2] || "_site");
  report(await skimProblems(siteDir, path.join(root, "src", "bulletins")));
}

const invoked = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((err) => {
    console.error(`check: ${err && err.message ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
