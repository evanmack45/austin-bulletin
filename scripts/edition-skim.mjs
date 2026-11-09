// Skim lines for an edition page. Titles and anchors come from the rendered
// edition: the briefing headline, City Desk lead headlines, and brief
// sentences. Nothing here writes a new claim.

import { plainText } from "./metadata.mjs";
import { slug } from "./river.mjs";

const SKIM_LIMIT = 5;
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "source", "track", "wbr"]);

function idsIn(html) {
  return new Set([...String(html).matchAll(/\sid="([^"]*)"/gi)].map((match) => match[1]));
}

function takeId(title, used) {
  const base = slug(title) || "story";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function openAttrs(node) {
  return node.match(/^<[a-zA-Z0-9]+\b([^>]*)>/)?.[1] ?? "";
}

function attrId(node) {
  return openAttrs(node).match(/\sid="([^"]*)"/i)?.[1] || "";
}

function stampOpen(node, anchor) {
  if (attrId(node)) return node;
  return node.replace(/^<([a-zA-Z0-9]+)/, `<$1 id="${anchor}"`);
}

function idFor(node, title, used) {
  const current = attrId(node);
  if (current) {
    used.add(current);
    return current;
  }
  return takeId(title, used);
}

function openClasses(node) {
  const open = String(node).match(/^<[^>]+>/)?.[0] ?? "";
  const cls = open.match(/\bclass="([^"]*)"/i)?.[1] ?? "";
  return cls.split(/\s+/).filter(Boolean);
}

function hasSrc(node) {
  return /class="[^"]*\bsrc\b/.test(node);
}

function hasSourceLine(node) {
  return /class="[^"]*\bsource-line\b/.test(node);
}

function isBriefClass(node) {
  return openClasses(node).includes("brief");
}

function summaryOf(node) {
  const withoutSrc = node.replace(
    /<span\b[^>]*class="[^"]*\bsrc\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    " "
  );
  return plainText(withoutSrc);
}

function nodeKind(node) {
  if (/^<h5\b/i.test(node)) return "h5";
  if (/^<h3\b/i.test(node)) return "h3";
  if (/^<(?:h4|nav)\b/i.test(node)) return "boundary";
  if (/^<p\b[^>]*class="[^"]*\bbrief-slug\b/i.test(node)) return "boundary";
  if (/^<p\b/i.test(node)) return "p";
  return "other";
}

function tagName(open) {
  return open.match(/^<([a-zA-Z0-9]+)/)?.[1]?.toLowerCase() || "";
}

function findClose(source, from, name) {
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, "gi");
  re.lastIndex = from;
  let depth = 1;
  let match = re.exec(source);
  while (match) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return { start: match.index, end: match.index + match[0].length };
    match = re.exec(source);
  }
  return null;
}

function pushTag(source, index, nodes) {
  const close = source.indexOf(">", index);
  if (close < 0) {
    nodes.push(source.slice(index));
    return source.length;
  }
  const open = source.slice(index, close + 1);
  const name = tagName(open);
  const voidTag = !name || VOID_TAGS.has(name) || /\/>$/.test(open);
  if (voidTag) {
    nodes.push(open);
    return close + 1;
  }
  const end = findClose(source, close + 1, name);
  if (!end) {
    nodes.push(source.slice(index));
    return source.length;
  }
  nodes.push(source.slice(index, end.end));
  return end.end;
}

export function topLevelNodes(html) {
  return topLevel(html);
}

function topLevel(html) {
  const nodes = [];
  const source = String(html ?? "");
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("<!--", index)) {
      const end = source.indexOf("-->", index);
      const stop = end < 0 ? source.length : end + 3;
      nodes.push(source.slice(index, stop));
      index = stop;
      continue;
    }
    if (source[index] !== "<") {
      const next = source.indexOf("<", index);
      const end = next < 0 ? source.length : next;
      nodes.push(source.slice(index, end));
      index = end;
      continue;
    }
    index = pushTag(source, index, nodes);
  }
  return nodes;
}

function mapRegion(html, tag, className, render) {
  // A class token, so river does not also match river-story.
  const re = new RegExp(
    `<${tag}\\b[^>]*class="(?:[^"]*\\s)?${className}(?:\\s[^"]*)?"[^>]*>`,
    "gi"
  );
  let out = "";
  let last = 0;
  for (const match of html.matchAll(re)) {
    const openEnd = match.index + match[0].length;
    const close = findClose(html, openEnd, tag);
    if (!close) return html;
    out += html.slice(last, openEnd);
    out += render(html.slice(openEnd, close.start));
    out += html.slice(close.start, close.end);
    last = close.end;
  }
  return out + html.slice(last);
}

function storyFromTag(node, tag, used) {
  const match = node.match(new RegExp(`^<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>$`, "i"));
  if (!match) return null;
  const title = plainText(match[1]);
  if (!title) return null;
  return { title, anchor: idFor(node, title, used) };
}

function stampBigStory(inner, used, stories) {
  const match = inner.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/i);
  if (!match) return inner;
  const story = storyFromTag(match[0], "h3", used);
  if (!story) return inner;
  stories.push(story);
  return inner.replace(match[0], stampOpen(match[0], story.anchor));
}

function visitHeading(state, node, tag) {
  const story = storyFromTag(node, tag, state.used);
  state.leadOpen = true;
  if (!story) return node;
  state.stories.push(story);
  return stampOpen(node, story.anchor);
}

function closeLead(state, node) {
  state.leadOpen = false;
  return node;
}

function noteSource(state, node) {
  if ((hasSrc(node) || hasSourceLine(node)) && state.leadOpen) state.leadOpen = false;
  return node;
}

function visitBrief(state, node) {
  const title = summaryOf(node);
  if (!title) return node;
  const anchor = idFor(node, title, state.used);
  state.stories.push({ title, anchor });
  return stampOpen(node, anchor);
}

function visitSourced(state, node, kind) {
  if (hasSourceLine(node)) return noteSource(state, node);
  if (isBriefClass(node) && !state.leadOpen && kind === "p") return visitBrief(state, node);
  if (!hasSrc(node) || state.leadOpen) return noteSource(state, node);
  if (kind !== "p") return node;
  return visitBrief(state, node);
}

function visitElement(state, node) {
  const kind = nodeKind(node);
  if (kind === "h5" || kind === "h3") return visitHeading(state, node, kind);
  if (kind === "boundary") return closeLead(state, node);
  return visitSourced(state, node, kind);
}

export function expandRiverStories(nodes) {
  const out = [];
  for (const node of nodes) {
    const trimmed = String(node).trim();
    const open = trimmed.match(/^<div\b([^>]*)>/i);
    const cls = open?.[1].match(/\bclass="([^"]*)"/i)?.[1] ?? "";
    if (!cls.split(/\s+/).includes("river-story")) {
      out.push(node);
      continue;
    }
    const inner = trimmed.slice(open[0].length, trimmed.length - "</div>".length);
    out.push(...topLevel(inner));
  }
  return out;
}

function stampRiver(inner, used, stories) {
  const state = { leadOpen: false, used, stories };
  return expandRiverStories(topLevel(inner)).map((node) => (
    node.startsWith("<") ? visitElement(state, node) : node
  )).join("");
}

export function scanEdition(html) {
  const source = String(html ?? "");
  const used = idsIn(source);
  const stories = [];
  const withLead = mapRegion(source, "section", "big-story", (inner) =>
    stampBigStory(inner, used, stories));
  return {
    html: mapRegion(withLead, "div", "river", (inner) => stampRiver(inner, used, stories)),
    stories
  };
}

export function withStoryAnchors(html) {
  return scanEdition(html).html;
}

export function editionStories(html) {
  return scanEdition(html).stories;
}

export function skimList(html) {
  const stories = editionStories(html);
  if (stories.length < 2) return [];
  return stories.slice(0, SKIM_LIMIT);
}

// Sunday's news and notice titles are direct subsections of those h2s.
// Other editions keep the h5 lead markup already published.
export function sundaySectionHeadings(html, outputPath) {
  if (!String(outputPath || "").endsWith("/2026/11/08/index.html")) return html;
  return String(html).replace(/<(\/?)h5\b/gi, "<$1h3");
}
