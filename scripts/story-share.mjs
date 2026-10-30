// Per-story permalinks on an edition page. Existing heading ids stay put.
import { canonicalUrl, plainText } from "./metadata.mjs";
import { slug } from "./river.mjs";

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function idsIn(html) {
  return new Set([...String(html).matchAll(/\sid="([^"]*)"/gi)].map((match) => match[1]));
}

function hashId(id) {
  return /^[A-Za-z0-9-]+$/.test(id) ? id : encodeURIComponent(id);
}

function idFor(attrs, title, used) {
  const existing = attrs.match(/\sid="([^"]*)"/i)?.[1];
  if (existing) return existing;
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

function headingTag(level, attrs, id, inner) {
  const next = /\sid="/i.test(attrs) ? attrs : `${attrs} id="${id}"`;
  return `<h${level}${next}>${inner}</h${level}>`;
}

function shareBlock(title, url) {
  const safeTitle = escapeAttr(title);
  const safeUrl = escapeAttr(url);
  const label = escapeAttr(`Share ${title}`);
  return `<div class="story-share">` +
    `<a class="story-share-link" href="${safeUrl}">Link</a>` +
    `<button type="button" class="story-share-button" hidden ` +
    `data-share-title="${safeTitle}" data-share-url="${safeUrl}" ` +
    `aria-label="${label}">Share</button>` +
    `<span class="story-share-status" aria-live="polite"></span></div>`;
}

function renderHeading(level, attrs, inner, page, used) {
  const title = plainText(inner) || "The Austin Bulletin";
  const id = idFor(attrs, title, used);
  return headingTag(level, attrs, id, inner) + shareBlock(title, `${page}#${hashId(id)}`);
}

function shareHeadings(html, level, page, used) {
  const re = new RegExp(`<h${level}\\b([^>]*)>([\\s\\S]*?)<\\/h${level}>`, "gi");
  return html.replace(re, (full, attrs, inner, offset) => {
    const rest = html.slice(offset + full.length);
    if (/^\s*<div class="story-share"/.test(rest)) return full;
    return renderHeading(level, attrs, inner, page, used);
  });
}

function mapSection(html, className, mapInner) {
  const re = new RegExp(
    `(<section\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>)([\\s\\S]*?)(</section>)`,
    "gi"
  );
  return html.replace(re, (_full, open, inner, close) => open + mapInner(inner) + close);
}

function divInnerEnd(html, openEnd) {
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = openEnd;
  let depth = 1;
  let match = re.exec(html);
  while (match) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return match.index;
    match = re.exec(html);
  }
  return -1;
}

function mapDivClass(html, className, mapInner) {
  const openRe = new RegExp(
    `<div\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`,
    "gi"
  );
  let out = "";
  let cursor = 0;
  for (const match of html.matchAll(openRe)) {
    const innerStart = match.index + match[0].length;
    const innerEnd = divInnerEnd(html, innerStart);
    if (innerEnd < 0) return html;
    out += html.slice(cursor, innerStart);
    out += mapInner(html.slice(innerStart, innerEnd));
    cursor = innerEnd;
  }
  return out + html.slice(cursor);
}

function collectIds(inner, level, ids) {
  const re = new RegExp(`<h${level}\\b([^>]*)>`, "gi");
  for (const match of inner.matchAll(re)) {
    ids.push(match[1].match(/\sid="([^"]*)"/i)?.[1] ?? "");
  }
}

export function storyAnchorIds(html) {
  const ids = [];
  const source = String(html ?? "");
  mapSection(source, "big-story", (inner) => {
    collectIds(inner, "3", ids);
    return inner;
  });
  mapDivClass(source, "river", (inner) => {
    collectIds(inner, "5", ids);
    return inner;
  });
  return ids;
}

export function editionRoute(outputPath) {
  const norm = String(outputPath ?? "").replaceAll("\\", "/");
  const match = norm.match(/\/(\d{4})\/(\d{2})\/(\d{2})\/index\.html$/);
  return match ? `/${match[1]}/${match[2]}/${match[3]}/` : "";
}

export function shouldAddStoryShare(baseHref, outputPath) {
  if (typeof baseHref === "string" && baseHref.startsWith("http")) return false;
  return Boolean(editionRoute(outputPath));
}

export function withStoryShare(html, route) {
  const source = String(html ?? "");
  const path = new URL(canonicalUrl(route)).pathname;
  if (!/^\/\d{4}\/\d{2}\/\d{2}\/$/.test(path)) return source;
  const page = canonicalUrl(route);
  const used = idsIn(source);
  const withLead = mapSection(source, "big-story", (inner) =>
    shareHeadings(inner, "3", page, used));
  return mapDivClass(withLead, "river", (inner) => shareHeadings(inner, "5", page, used));
}
