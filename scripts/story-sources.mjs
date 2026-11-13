// One Sources line per story. Link text stays the publisher name already
// in the tag. Every source href stays, deduped by URL. Photo credits and
// in-sentence action links are not source tags, so they stay put.

import markdownIt from "markdown-it";
import { plainText } from "./metadata.mjs";
import { expandRiverStories, topLevelNodes } from "./edition-skim.mjs";
import { alsoSlugs } from "./river.mjs";

const bulletinMarkdown = markdownIt({ html: true });
bulletinMarkdown.disable("code");

const SOURCE_SRC = "<(p|span)\\b[^>]*class=\"[^\"]*\\b(?:source-line|src)\\b[^\"]*\""
  + "[^>]*>([\\s\\S]*?)<\\/\\1>";
const ANCHOR_SRC = "<a\\b[^>]*\\bhref=\"([^\"]*)\"[^>]*>([\\s\\S]*?)<\\/a>";

function sourcePattern() {
  return new RegExp(SOURCE_SRC, "gi");
}

function anchorPattern() {
  return new RegExp(ANCHOR_SRC, "gi");
}
const SITE = "theaustinbulletin.com";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hasSource(node) {
  return /class="[^"]*\b(?:src|source-line)\b/.test(String(node));
}

function tagIs(node, name) {
  return new RegExp(`^<${name}\\b`, "i").test(String(node));
}

function isBriefSlug(node) {
  return /^<p\b[^>]*class="[^"]*\bbrief-slug\b/i.test(node);
}

function blockedBrief(node) {
  return /class="[^"]*\b(?:source-line|if-you|whats-next|good-thing)\b/.test(node);
}

function isBriefParagraph(node) {
  return tagIs(node, "p") && hasSource(node) && !blockedBrief(node);
}

function opensAsBrief(node) {
  const cls = outerOpen(node).match(/\bclass="([^"]*)"/i)?.[1] ?? "";
  return cls.split(/\s+/).includes("brief");
}

function isBoundary(node, closed) {
  if (tagIs(node, "h4") || tagIs(node, "h5") || isBriefSlug(node)) return true;
  if (opensAsBrief(node)) return true;
  return closed && isBriefParagraph(node);
}

function outerOpen(node) {
  return String(node).match(/^<[^>]+>/)?.[0] ?? "";
}

function innerOf(node) {
  const open = outerOpen(node);
  const name = open.match(/^<([a-zA-Z0-9]+)/)?.[1] ?? "";
  return String(node).slice(open.length, String(node).length - `</${name}>`.length);
}

function rebuild(node, inner) {
  const open = outerOpen(node);
  const name = open.match(/^<([a-zA-Z0-9]+)/)?.[1] ?? "";
  return `${open}${inner}</${name}>`;
}

function isRegion(node, tag, className) {
  const open = outerOpen(node);
  return tagIs(node, tag) && new RegExp(`\\b${className}\\b`).test(open);
}

export function publisherName(text) {
  const trimmed = plainText(text).replace(/\s+/g, " ").trim();
  const paren = trimmed.match(/^(.*?)\s+\([^)]*\)\s*$/);
  if (paren?.[1]) return paren[1].trim();
  const colon = trimmed.match(/^([^:]{2,}?):\s+\S.*$/);
  if (colon) return colon[1].trim();
  return trimmed;
}

export function canonicalHref(href) {
  return plainText(href).trim();
}

export function isExternalSource(href) {
  let url;
  try {
    url = new URL(canonicalHref(href), `https://${SITE}`);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return url.hostname.replace(/^www\./, "") !== SITE;
}

function anchorsIn(inner) {
  return [...String(inner).matchAll(anchorPattern())].map((match) => ({
    href: match[1],
    text: plainText(match[2])
  }));
}

function containerInners(html) {
  return [...String(html).matchAll(sourcePattern())].map((match) => match[2]);
}

function collectLinks(html) {
  const seen = new Set();
  const links = [];
  for (const inner of containerInners(html)) {
    for (const link of anchorsIn(inner)) {
      const key = canonicalHref(link.href);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      links.push({ href: link.href, name: publisherName(link.text) });
    }
  }
  return links;
}

function containerNote(inner) {
  const without = String(inner).replace(anchorPattern(), " ");
  return plainText(without)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^sources?:\s*/i, "")
    .replace(/^[·•|,;:\s]+|[·•|,;:\s]+$/g, "")
    .trim();
}

function notesIn(html, names) {
  const notes = [];
  for (const inner of containerInners(html)) {
    const note = containerNote(inner);
    if (!note || names.includes(note) || notes.includes(note)) continue;
    notes.push(note);
  }
  return notes;
}

function stripSources(html) {
  return String(html)
    .replace(sourcePattern(), "")
    .replace(/<p\b[^>]*>\s*<\/p>/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

const SHORT_LABELS = {
  "National Weather Service forecast": "NWS forecast",
  "Travis County active-alert snapshot": "Travis alerts"
};

function displayName(name) {
  return SHORT_LABELS[name] || name;
}

function attributionLabel(_linkCount, _noteCount) {
  return "Sources";
}

function groupedSources(label, note, links) {
  return links.map((link, index) => {
    const anchor = `<a href="${link.href}">${escapeHtml(displayName(link.name))}</a>`;
    if (index > 0) return `<span class="source-group">${anchor}</span>`;
    const lead = note ? `${escapeHtml(note)} ` : "";
    const marked = `<span class="source-label">${label}:</span> `;
    return `<span class="source-group">${marked}${lead}${anchor}</span>`;
  }).join("");
}

function sourcesMarkup(links, notes) {
  if (!links.length) return "";
  const label = attributionLabel(links.length, notes.length);
  return `<p class="source-line">${groupedSources(label, notes.join(" "), links)}</p>`;
}

export function presentSourceHtml(html) {
  const text = String(html ?? "").trim();
  if (!text || text.includes("source-group")) return text;
  const links = collectLinks(text);
  if (!links.length) return text;
  const notes = notesIn(text, links.map((link) => link.name));
  const label = attributionLabel(links.length, notes.length);
  const groups = groupedSources(label, notes.join(" "), links);
  if (text.startsWith("<p")) return `<p class="source-line">${groups}</p>`;
  return `<span class="src">${groups}</span>`;
}

function markBrief(html) {
  if (!tagIs(html, "p")) return html;
  if (/^<p\b[^>]*\bclass="/i.test(html)) {
    return html.replace(/^<p\b([^>]*?)\bclass="/i, '<p$1class="brief ');
  }
  return html.replace(/^<p\b/i, '<p class="brief"');
}

function finishStory(html, brief) {
  const links = collectLinks(html);
  const notes = notesIn(html, links.map((link) => link.name));
  if (!links.length && !notes.length) return html;
  let body = stripSources(html).trim();
  if (brief) body = markBrief(body);
  const line = sourcesMarkup(links, notes);
  return body ? `${body}\n${line}` : line;
}

function riverRanges(nodes) {
  const ranges = [];
  let i = 0;
  while (i < nodes.length) {
    if (tagIs(nodes[i], "h5")) {
      const start = i;
      i += 1;
      let closed = false;
      while (i < nodes.length && !isBoundary(nodes[i], closed)) {
        if (hasSource(nodes[i])) closed = true;
        i += 1;
      }
      ranges.push({ start, end: i });
      continue;
    }
    if (hasSource(nodes[i])) {
      ranges.push({ start: i, end: i + 1 });
      i += 1;
      continue;
    }
    i += 1;
  }
  return ranges;
}

function rewriteRiver(inner) {
  const nodes = expandRiverStories(topLevelNodes(inner));
  const ranges = riverRanges(nodes);
  let cursor = 0;
  let out = "";
  for (const range of ranges) {
    const brief = range.end - range.start === 1 && isBriefParagraph(nodes[range.start]);
    out += nodes.slice(cursor, range.start).join("");
    out += finishStory(nodes.slice(range.start, range.end).join(""), brief);
    cursor = range.end;
  }
  return out + nodes.slice(cursor).join("");
}

function rewriteTop(node) {
  if (isRegion(node, "section", "big-story")) return rebuild(node, finishStory(innerOf(node)));
  if (isRegion(node, "div", "river")) return rebuild(node, rewriteRiver(innerOf(node)));
  if (hasSource(node)) return finishStory(node);
  return node;
}

export function consolidateStorySources(html) {
  return topLevelNodes(String(html ?? "")).map(rewriteTop).join("");
}

function riverRegions(node) {
  const nodes = expandRiverStories(topLevelNodes(innerOf(node)));
  return riverRanges(nodes).map((range) => nodes.slice(range.start, range.end).join(""));
}

function shouldDescend(node) {
  if (isRegion(node, "div", "edition-wrap") || isRegion(node, "div", "grid")) return true;
  if (!tagIs(node, "section") || isRegion(node, "section", "signup")) return false;
  return !isRegion(node, "section", "big-story");
}

function regionOf(node) {
  if (isRegion(node, "section", "big-story")) return [innerOf(node)];
  if (isRegion(node, "div", "river")) return riverRegions(node);
  const card = isRegion(node, "article", "card") || isRegion(node, "article", "lead");
  return card ? [innerOf(node)] : null;
}

function collectRegions(nodes, regions) {
  for (const node of nodes) {
    const found = regionOf(node);
    if (found) regions.push(...found);
    else if (shouldDescend(node)) collectRegions(topLevelNodes(innerOf(node)), regions);
    else if (hasSource(node)) regions.push(node);
  }
}

export function bulletinArticle(html) {
  const page = String(html ?? "");
  const open = page.search(/<article\b[^>]*class="[^"]*\bbulletin\b/i);
  if (open < 0) return page;
  return nestedInner(page, open);
}

function nestedInner(page, open) {
  const start = page.indexOf(">", open) + 1;
  const re = /<\/?article\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 1;
  let match = re.exec(page);
  while (match) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return page.slice(start, match.index);
    match = re.exec(page);
  }
  return page.slice(start);
}

function storyRegions(html) {
  const regions = [];
  collectRegions(topLevelNodes(html), regions);
  return regions;
}

function hrefsIn(region) {
  const hrefs = [];
  for (const inner of containerInners(region)) {
    for (const link of anchorsIn(inner)) {
      const key = canonicalHref(link.href);
      if (key) hrefs.push(key);
    }
  }
  return hrefs;
}

function uniqueSorted(hrefs) {
  return [...new Set(hrefs)].sort();
}

export function storySourceSets(html) {
  return storyRegions(html)
    .map((region) => uniqueSorted(hrefsIn(region)))
    .filter((set) => set.length > 0);
}

export function externalStorySourceSets(html) {
  return storyRegions(html)
    .map((region) => uniqueSorted(hrefsIn(region).filter(isExternalSource)))
    .filter((set) => set.length > 0);
}

function stripFrontMatter(markdown) {
  return String(markdown ?? "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function renderPair(inner, tag, className) {
  const html = bulletinMarkdown.render(inner).trim();
  return `<${tag} class="${className}">\n${html}\n</${tag}>`;
}

function renderBigStory(_match, inner) {
  return renderPair(inner, "section", "big-story");
}

function renderRiver(_match, inner) {
  const tiered = /^#####\s/m.test(inner);
  const content = tiered ? alsoSlugs(inner) : inner;
  const cls = tiered ? "river river--tiered" : "river";
  return renderPair(content, "div", cls);
}

export function normalizeBulletin(markdown) {
  const expanded = stripFrontMatter(markdown)
    .replace(/\{%\s*bigstory\s*%\}([\s\S]*?)\{%\s*endbigstory\s*%\}/g, renderBigStory)
    .replace(/\{%\s*river\s*%\}([\s\S]*?)\{%\s*endriver\s*%\}/g, renderRiver);
  return bulletinMarkdown.render(expanded);
}
