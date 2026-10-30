// Presentation metadata only: excerpts of already-rendered source text, never new prose.
import { isoDate } from "./edition-dates.mjs";
export const SITE_URL = "https://theaustinbulletin.com/";
const GENERIC = "A daily, neutral news bulletin for Austin and Texas.";
const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  hellip: "…", middot: "·"
};
const DESCRIPTIONS = {
  "/archive/": "Browse past Austin and Texas daily bulletins and search the archive.",
  "/about/": "How The Austin Bulletin gathers, sources, reviews and corrects its daily news.",
  "/corrections/": "Public, dated log of corrections to The Austin Bulletin, with sources.",
  "/vote-2026/": "Official November 2026 registration links, key dates and county voting guidance."
};

export function canonicalUrl(route) {
  if (typeof route !== "string" || !route.startsWith("/") || route.startsWith("//")) {
    throw new Error("Canonical URL requires a local site route");
  }
  const url = new URL(route, SITE_URL);
  if (url.origin !== new URL(SITE_URL).origin) throw new Error("Unexpected canonical origin");
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/index\.html$/, "/");
  if (!url.pathname.endsWith("/") && !/\.[^/]+$/.test(url.pathname)) url.pathname += "/";
  return url.href;
}

function entity(match, name) {
  if (!name.startsWith("#")) return ENTITIES[name.toLowerCase()] ?? match;
  const hex = name.slice(1).toLowerCase().startsWith("x");
  const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
  if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return match;
  return String.fromCodePoint(code);
}

export function plainText(value) {
  return String(value ?? "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, entity)
    .replace(/\s+/g, " ").trim();
}

function reliableText(value) {
  const text = plainText(value);
  // Unsupported named entities are preferable to an unreliable decoded excerpt:
  // fall back rather than showing markup-like text in search/sharing descriptions.
  return /&[a-z]+;/i.test(text) ? "" : text;
}

function excerpt(text) {
  if (text.length <= 190) return text;
  const clipped = text.slice(0, 190);
  return `${clipped.slice(0, clipped.lastIndexOf(" "))}…`;
}

function bigStoryLead(content) {
  const section = String(content ?? "").match(
    /<section\b[^>]*class="[^"]*\bbig-story\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i
  )?.[1] ?? "";
  const heading = reliableText(section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
  const paragraphs = [...section.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)];
  const skip = /source-line|whats-next|council-did/;
  const paragraph = paragraphs.filter(match => !skip.test(match[1]))
    .map(match => reliableText(match[2])).find(Boolean) ?? "";
  return { heading, paragraph };
}

function frontPageLead(content) {
  const section = String(content ?? "").match(
    /<section\b[^>]*class="[^"]*\bfront-lead\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i
  )?.[1] ?? "";
  const heading = reliableText(section.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  const paragraph = reliableText(section.match(
    /<p\b[^>]*class="[^"]*\bfront-deck\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  )?.[1]);
  return { heading, paragraph };
}

function leadFrom(content) {
  const story = bigStoryLead(content);
  if (story.heading) return story;
  const front = frontPageLead(content);
  if (front.heading) return front;
  return story;
}

const BRAND_IMAGE = `${SITE_URL}icon-512.png`;
const BRAND_ALT = "The Austin Bulletin brand icon";

function attrValue(tag, name) {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1] ?? "";
}

function sameOriginImage(src) {
  if (typeof src !== "string" || !src.startsWith("/") && !src.startsWith("https:")) return "";
  try {
    const url = new URL(src, SITE_URL);
    return url.origin === new URL(SITE_URL).origin ? url.href : "";
  } catch {
    return "";
  }
}

function firstImage(html) {
  const tags = String(html ?? "").match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const src = sameOriginImage(attrValue(tag, "src"));
    if (!src) continue;
    return { src, alt: reliableText(attrValue(tag, "alt")) };
  }
  return null;
}

function leadFigure(content) {
  return String(content ?? "").match(
    /<figure\b[^>]*class="[^"]*\blead-photo\b[^"]*"[^>]*>[\s\S]*?<\/figure>/i
  )?.[0] ?? "";
}

function storySection(content) {
  return String(content ?? "").match(
    /<section\b[^>]*class="[^"]*\b(?:big-story|front-lead)\b[^"]*"[^>]*>[\s\S]*?<\/section>/i
  )?.[0] ?? "";
}

function imageFor(content, edition) {
  const brand = { image: BRAND_IMAGE, imageAlt: BRAND_ALT };
  if (!edition) return { ...brand, card: "summary" };
  const found = firstImage(leadFigure(content)) || firstImage(storySection(content));
  if (!found) return { ...brand, card: "summary_large_image" };
  return { image: found.src, imageAlt: found.alt || BRAND_ALT, card: "summary_large_image" };
}

function titleFor(originalTitle, content, lead) {
  const date = reliableText(String(content ?? "").match(
    /<(?:h1|p|time)\b[^>]*class="[^"]*\bedition-date\b[^"]*"[^>]*>([\s\S]*?)<\/(?:h1|p|time)>/i
  )?.[1]);
  if (lead.heading && date) return `${lead.heading} — ${date} | The Austin Bulletin`;
  const sourceTitle = reliableText(originalTitle) || "The Austin Bulletin";
  return sourceTitle.includes("The Austin Bulletin") ? sourceTitle
    : `${sourceTitle} | The Austin Bulletin`;
}

function descriptionFor(normalized, lead, description) {
  return reliableText(description) || DESCRIPTIONS[normalized]
    || (lead.heading ? lead.paragraph : "") || GENERIC;
}

export function pageMetadata(route, originalTitle, content, description) {
  const canonical = canonicalUrl(route);
  const normalized = new URL(canonical).pathname;
  const dated = /^\/\d{4}\/\d{2}\/\d{2}\/$/.test(normalized);
  const edition = normalized === "/" || dated;
  const lead = edition ? leadFrom(content) : { heading: "", paragraph: "" };
  const title = titleFor(originalTitle, content, lead);
  return {
    canonical, title, ogTitle: lead.heading || title,
    description: excerpt(descriptionFor(normalized, lead, description)),
    indexable: normalized !== "/404.html",
    type: dated ? "article" : "website",
    ogType: edition ? "article" : "website",
    ...imageFor(content, edition),
    headline: dated ? lead.heading : ""
  };
}

// NewsArticle structured data for a dated edition, built only from its metadata.
export function articleJsonLd(meta, date) {
  if (meta?.type !== "article") return "";
  const publisher = {
    "@type": "NewsMediaOrganization", name: "The Austin Bulletin", url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}icon-512.png` }
  };
  const data = {
    "@context": "https://schema.org", "@type": "NewsArticle",
    headline: excerpt(meta.headline || meta.title).slice(0, 110),
    description: meta.description, url: meta.canonical,
    mainEntityOfPage: meta.canonical, image: [meta.image],
    datePublished: isoDate(date),
    isAccessibleForFree: true, inLanguage: "en-US",
    author: publisher, publisher
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function sitemapPages(items) {
  const pages = items.filter(item => {
    const output = item.outputPath ?? item.data?.page?.outputPath ?? "";
    return output.endsWith(".html") && item.url && item.url !== "/404.html";
  }).map(item => new URL(canonicalUrl(item.url)).pathname);
  return [...new Set(pages)].sort();
}

export function xmlEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// The Briefing's ### headline from an edition's markdown source, as plain text.
export function briefingHeadline(markdown) {
  const match = /^### +(.+)$/m.exec(String(markdown ?? ""));
  return match ? plainText(match[1]).replace(/[*_`]/g, "").trim() : "";
}

const DAY_MS = 86400000;
const gapDate = (ms, opts) =>
  new Date(ms).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

// Days with no edition between two newer-first neighbors: "October 7–9", or "" when none.
export function editionGap(newer, older) {
  const start = Date.parse(older) + DAY_MS;
  const end = Date.parse(newer) - DAY_MS;
  if (!(end >= start)) return "";
  const first = gapDate(start, { month: "long", day: "numeric" });
  if (end === start) return first;
  const sameMonth = gapDate(start, { month: "long" }) === gapDate(end, { month: "long" });
  const last = gapDate(end, sameMonth ? { day: "numeric" } : { month: "long", day: "numeric" });
  return `${first}–${last}`;
}
