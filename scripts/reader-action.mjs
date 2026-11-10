// Optional per-item reader action. The markers live in the story. The
// edition filter and the homepage render one line from the same pair.
//
//   <!-- action_text: Register to vote -->
//   <!-- action_url: https://example.gov/register -->
//
// Both are required. A missing or unsafe pair renders nothing.

const TEXT = /<!--\s*action_text:\s*([\s\S]*?)\s*-->/i;
const ACTION_URL = /<!--\s*action_url:\s*(\S+)\s*-->/i;
const MARKERS = /<!--\s*action_(?:text|url):[\s\S]*?-->/gi;
const SOURCE = /<p\b[^>]*\bsource-line\b[^>]*>[\s\S]*?<\/p>/gi;
const TRAILING_TOP = /(\s*<p\b[^>]*\bto-top\b[^>]*>[\s\S]*?<\/p>\s*)$/i;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function field(block, pattern) {
  const match = String(block ?? "").match(pattern);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function safeUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  return value;
}

function safeText(value) {
  if (!value || value.length > 140) return "";
  if (/:\/\//.test(value) || /\bwww\./i.test(value)) return "";
  return value;
}

export function parseReaderAction(block) {
  const text = safeText(field(block, TEXT));
  const url = safeUrl(field(block, ACTION_URL));
  if (!text || !url) return null;
  return { text, url };
}

function sentenceStop(text) {
  return /[.!?]$/.test(text) ? "" : ".";
}

export function readerActionMarkup(action) {
  if (!action) return "";
  const text = escapeHtml(action.text);
  const url = escapeHtml(action.url);
  return "<p class=\"what-you-can-do\">"
    + "<span class=\"what-you-can-do-label\">What you can do:</span> "
    + `<a href="${url}">${text}</a>${sentenceStop(action.text)}</p>`;
}

export function stripActionComments(html) {
  return String(html ?? "").replace(MARKERS, "");
}

function placeAction(chunk, markup) {
  const clean = stripActionComments(chunk);
  if (!markup) return clean;
  if (TRAILING_TOP.test(clean)) return clean.replace(TRAILING_TOP, `\n${markup}$1`);
  return `${clean.replace(/\s*$/, "")}\n${markup}\n`;
}

export function withReaderActions(html) {
  const source = String(html ?? "");
  const lines = source.match(SOURCE) || [];
  const parts = source.split(SOURCE);
  let out = "";
  for (let index = 0; index < parts.length; index += 1) {
    const action = parseReaderAction(parts[index]);
    out += placeAction(parts[index], readerActionMarkup(action));
    if (lines[index]) out += lines[index];
  }
  return out;
}
