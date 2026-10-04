// Presentation metadata only: excerpts of already-rendered source text, never new prose.
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

function plainText(value) {
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

function leadFrom(content) {
  const section = String(content ?? "").match(
    /<section\b[^>]*class="[^"]*\bbig-story\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i
  )?.[1] ?? "";
  const heading = reliableText(section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
  const paragraphs = [...section.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)];
  const paragraph = paragraphs.filter(match => !/source-line|whats-next/.test(match[1]))
    .map(match => reliableText(match[2])).find(Boolean) ?? "";
  return { heading, paragraph };
}

function titleFor(originalTitle, content, lead) {
  const date = reliableText(String(content ?? "").match(
    /<h1\b[^>]*class="[^"]*\bedition-date\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i
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
  return {
    canonical, title: titleFor(originalTitle, content, lead),
    description: excerpt(descriptionFor(normalized, lead, description)),
    indexable: normalized !== "/404.html",
    type: dated ? "article" : "website",
    image: `${SITE_URL}icon-512.png`, imageAlt: "The Austin Bulletin brand icon",
    card: "summary"
  };
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
