// Collapse a repeated publisher inside one source list.
// Every href stays. Link text that already names the document stays.
// A bare repeated name gets a label from the URL: agenda, PDF, or release.

import { plainText } from "./metadata.mjs";

const CONTAINER = /<(p|span)\b([^>]*\bclass="([^"]*)"[^>]*)>([\s\S]*?)<\/\1>/gi;

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function classTokens(className) {
  return String(className || "").split(/\s+/).filter(Boolean);
}

function isSourceList(className) {
  const tokens = classTokens(className);
  return tokens.includes("source-line") || tokens.includes("src");
}

function anchorCount(inner) {
  return inner.match(/<a\b/gi)?.length ?? 0;
}

function parseLinks(inner) {
  const re = /<a\b([^>]*?\bhref="([^"]*)"[^>]*)>([\s\S]*?)<\/a>/gi;
  return [...inner.matchAll(re)].map((match) => ({
    href: match[2],
    text: plainText(match[3]),
    start: match.index,
    end: match.index + match[0].length,
    raw: match[0]
  }));
}

function splitPublisher(text) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const paren = trimmed.match(/^(.*?)\s+\(([^)]*)\)\s*$/);
  if (paren?.[1] && paren[2]) return { key: paren[1], label: paren[2] };
  const colon = trimmed.match(/^([^:]{2,}?):\s+(\S.*)$/);
  if (colon) return { key: colon[1], label: colon[2] };
  const typed = trimmed.match(/^(.*\S)\s+((?:release|notice|agenda),\s+\S.*)$/i);
  if (typed) return { key: typed[1], label: typed[2] };
  return { key: trimmed, label: "" };
}

function hrefPath(href) {
  try {
    return new URL(plainText(href), "https://theaustinbulletin.com").pathname.toLowerCase();
  } catch {
    return "";
  }
}

export function documentLabel(href) {
  const path = hrefPath(href);
  if (path.includes("agenda")) return "agenda";
  if (path.endsWith(".pdf")) return "PDF";
  if (path.includes("/news/") || path.includes("/press")) return "release";
  return "link";
}

function withPublisher(link) {
  return { ...link, ...splitPublisher(link.text) };
}

function keyCounts(parts) {
  const counts = new Map();
  for (const part of parts) counts.set(part.key, (counts.get(part.key) ?? 0) + 1);
  return counts;
}

function hasRepeat(counts) {
  for (const count of counts.values()) if (count > 1) return true;
  return false;
}

function gapSeparator(gap) {
  const text = gap.replace(/\s+/g, " ").trim();
  if (text === "·" || text === "|" || text === "•") return " · ";
  if (text === "," || text === ";") return ", ";
  if (text === "") return ", ";
  return "";
}

function listSeparator(inner, links) {
  let chosen = "";
  for (let i = 1; i < links.length; i += 1) {
    const gap = plainText(inner.slice(links[i - 1].end, links[i].start));
    const sep = gapSeparator(gap);
    if (!sep || (chosen && chosen !== sep)) return "";
    chosen = sep;
  }
  return chosen || ", ";
}

function linkMarkup(part) {
  const label = part.label || documentLabel(part.href);
  return `<a href="${part.href}">${escapeText(label)}</a>`;
}

function groupMarkup(key, parts) {
  const links = parts.filter((part) => part.key === key).map(linkMarkup);
  return `<span class="source-group">${escapeText(key)}: ${links.join(", ")}</span>`;
}

function collapsedBody(parts, counts, sep) {
  const seen = new Set();
  const pieces = [];
  for (const part of parts) {
    if (seen.has(part.key)) continue;
    seen.add(part.key);
    const repeated = counts.get(part.key) > 1;
    pieces.push(repeated ? groupMarkup(part.key, parts) : part.raw);
  }
  return pieces.join(sep);
}

function collapseInner(inner) {
  if (inner.includes("source-group")) return null;
  const links = parseLinks(inner);
  if (links.length < 2 || anchorCount(inner) !== links.length) return null;
  const parts = links.map(withPublisher);
  const counts = keyCounts(parts);
  if (!hasRepeat(counts)) return null;
  const sep = listSeparator(inner, links);
  if (!sep) return null;
  const head = inner.slice(0, links[0].start);
  const tail = inner.slice(links[links.length - 1].end);
  return `${head}${collapsedBody(parts, counts, sep)}${tail}`;
}

export function collapseSourceLists(html) {
  return String(html ?? "").replace(CONTAINER, (full, tag, attrs, className, inner) => {
    if (!isSourceList(className)) return full;
    const next = collapseInner(inner);
    return next == null ? full : `<${tag}${attrs}>${next}</${tag}>`;
  });
}

function hrefsIn(inner) {
  return [...inner.matchAll(/\bhref="([^"]*)"/gi)].map((match) => plainText(match[1]));
}

export function sourceListHrefs(html) {
  const lists = [];
  const re = /<(p|span)\b[^>]*\bclass="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of String(html ?? "").matchAll(re)) {
    if (!isSourceList(match[2])) continue;
    lists.push(hrefsIn(match[3]).sort());
  }
  return lists;
}
