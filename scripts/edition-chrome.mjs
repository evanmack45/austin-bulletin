// Reader chrome on a built edition. The morning greeting and the Briefing
// heading are labels, not the news. Source markdown stays so the daily gate
// still sees both.

const GREETING_ONLY =
  /<p class="morning-note">\s*Good morning,\s+Austin\.?\s*<\/p>\s*/gi;
const GREETING_PREFIX =
  /(<p class="morning-note">)\s*Good morning,\s+Austin\.\s*/gi;
const BRIEFING_HEADING =
  /<h2\b[^>]*\bid="the-briefing"[^>]*>[\s\S]*?<\/h2>\s*/i;
const SKIM_HEADING =
  /(<h2\b[^>]*\bid="skim-title"[^>]*>)([\s\S]*?)(<\/h2>)/i;

function trustMarkup(href) {
  return "<span class=\"briefing-meta\"> · "
    + `<a class="trust-link" href="${href}">How this site is made</a></span>`;
}

export function stripMorningGreeting(html) {
  return String(html).replace(GREETING_ONLY, "").replace(GREETING_PREFIX, "$1");
}

export function dropBriefingHeading(html, href) {
  const page = String(html);
  if (!page.includes('id="the-briefing"')) return page;
  if (!page.includes('id="skim-title"')) {
    const quiet = "<p class=\"briefing-meta\">"
      + `<a class="trust-link" href="${href}">How this site is made</a></p>\n`;
    return page.replace(BRIEFING_HEADING, quiet);
  }
  const link = trustMarkup(href);
  return page.replace(BRIEFING_HEADING, "").replace(SKIM_HEADING, `$1$2 ${link}$3`);
}

export function tidyEditionChrome(html, href) {
  return dropBriefingHeading(stripMorningGreeting(html), href);
}

const SUNDAY_SIGNUP_BEFORE =
  /<h[35]\b[^>]*\bid="draft-amendments-would-change-the-citys-muny-agreement-with-ut"/;
const EDITION_SIGNUP = [
  '<section class="signup signup--edition" data-signup="edition" ',
  'data-signup-inline aria-labelledby="signup-edition-title">\n',
  '  <h2 id="signup-edition-title">The morning edition</h2>\n',
  '  <div class="signup-bar-top">\n',
  '    <p class="signup-value" id="signup-edition-value">Get the morning email.</p>\n',
  "    \n",
  "  </div>\n",
  '  <form class="signup-form" method="post" ',
  'action="https://app.kit.com/forms/10083630/subscriptions" ',
  'data-uid="e956043af1">\n',
  '    <label class="signup-label" for="signup-email-edition">Email</label>\n',
  '    <input id="signup-email-edition" class="signup-email" type="email" ',
  'name="email_address" autocomplete="email" inputmode="email" required>\n',
  "    <button type=\"submit\">Subscribe</button>\n",
  "  </form>\n",
  '  <p class="signup-note" id="signup-edition-note">Sign up and the first ',
  'issue reaches you once it goes out. <a href="/feed.xml">Or follow by RSS</a>.</p>\n',
  "</section>\n"
].join("");

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "source", "track", "wbr"]);

function readComment(html, index) {
  const end = html.indexOf("-->", index);
  const next = end < 0 ? html.length : end + 3;
  return { node: html.slice(index, next), next };
}

function readText(html, index) {
  const end = html.indexOf("<", index);
  const next = end < 0 ? html.length : end;
  return { node: html.slice(index, next), next };
}

function balancedClose(html, from, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = from;
  let depth = 1;
  let match = re.exec(html);
  while (match) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return { start: match.index, end: match.index + match[0].length };
    match = re.exec(html);
  }
  return null;
}

function readTag(html, index) {
  const open = html.slice(index).match(/^<([a-zA-Z0-9]+)(\s[^>]*)?>/);
  if (!open) return { node: html[index], next: index + 1 };
  const openTag = open[0];
  const tag = open[1].toLowerCase();
  if (VOID.has(tag) || /\/\s*>$/.test(openTag)) {
    return { node: openTag, next: index + openTag.length };
  }
  const close = balancedClose(html, index + openTag.length, tag);
  if (!close) return { node: html.slice(index), next: html.length };
  return { node: html.slice(index, close.end), next: close.end };
}

function readNode(html, index) {
  if (html.startsWith("<!--", index)) return readComment(html, index);
  if (html[index] !== "<") return readText(html, index);
  return readTag(html, index);
}

function topLevel(html) {
  const nodes = [];
  let index = 0;
  while (index < html.length) {
    const read = readNode(html, index);
    nodes.push(read.node);
    if (read.next <= index) break;
    index = read.next;
  }
  return nodes;
}

function storyStart(node) {
  return /^<h[35]\b/i.test(node.trim());
}

function columnBreak(node) {
  const trimmed = node.trim();
  return /^<h[1246]\b/i.test(trimmed)
    || /^<nav\b/i.test(trimmed)
    || /^<section\b/i.test(trimmed)
    || /^<p\b[^>]*\bclass="[^"]*\bto-top\b/i.test(trimmed);
}

function wrapStories(inner) {
  const out = [];
  let story = null;
  const close = () => {
    if (!story) return;
    out.push(`<div class="river-story">${story.join("")}</div>`);
    story = null;
  };
  for (const node of topLevel(inner)) {
    if (!node.trim()) {
      if (story) story.push(node);
      else out.push(node);
      continue;
    }
    if (storyStart(node)) {
      close();
      story = [node];
      continue;
    }
    if (story && columnBreak(node)) close();
    if (story) story.push(node);
    else out.push(node);
  }
  close();
  return keepSourcesWithStory(out.join(""));
}

// The river appends Back to top, and source consolidation then places the
// last story's source line after that link. Pull the line back into the story.
function keepSourcesWithStory(html) {
  const top = String.raw`\s*<p\b[^>]*\bto-top\b[^>]*>[\s\S]*?<\/p>\s*`;
  const line = String.raw`<p\b[^>]*\bsource-line\b[^>]*>[\s\S]*?<\/p>`;
  const pattern = new RegExp(`</div>(${top})(${line})`, "gi");
  return html.replace(pattern, (match, back, source) => `${source}</div>${back}`);
}

function riverLayout(inner) {
  const stories = inner.match(/<div class="river-story"/g)?.length ?? 0;
  const split = /<section\b[^>]*\bsignup\b/.test(inner);
  if (stories > 1 && !split) return "river--pair";
  if (stories > 0) return "river--measure";
  return "";
}

function withLayoutClass(open, layout) {
  if (!layout || open.includes(layout)) return open;
  return open.replace(/class="([^"]*)"/, `class="$1 ${layout}"`);
}

// Group each river headline with its own paragraphs so desktop can pair
// stories without splitting a headline from its text. A div, not an article:
// the edition page is already one article. Beat labels, the signup, and
// Back to top stay outside the group.
export function wrapRiverStories(html) {
  const source = String(html ?? "");
  const openRe = /<div\b[^>]*class="(?:[^"]*\s)?river(?:\s[^"]*)?"[^>]*>/gi;
  let out = "";
  let cursor = 0;
  for (const match of source.matchAll(openRe)) {
    const innerStart = match.index + match[0].length;
    const close = balancedClose(source, innerStart, "div");
    if (!close) return source;
    const inner = wrapStories(source.slice(innerStart, close.start));
    out += source.slice(cursor, match.index);
    out += withLayoutClass(match[0], riverLayout(inner));
    out += inner;
    cursor = close.start;
  }
  return out + source.slice(cursor);
}

export function sundayEditionSignup(html, editionIso) {
  if (editionIso !== "2026-11-08") return html;
  const page = String(html);
  const at = page.search(SUNDAY_SIGNUP_BEFORE);
  if (at < 0) throw new Error("Sunday signup has no third-story marker");
  if (page.includes('class="signup signup--edition"')) return page;
  return `${page.slice(0, at)}${EDITION_SIGNUP}${page.slice(at)}`;
}
