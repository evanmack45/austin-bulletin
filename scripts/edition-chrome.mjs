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
    + `<a class="trust-link" href="${href}">About our reporting</a></span>`;
}

export function stripMorningGreeting(html) {
  return String(html).replace(GREETING_ONLY, "").replace(GREETING_PREFIX, "$1");
}

export function dropBriefingHeading(html, href) {
  const page = String(html);
  if (!page.includes('id="the-briefing"')) return page;
  if (!page.includes('id="skim-title"')) {
    const quiet = "<p class=\"briefing-meta\">"
      + `<a class="trust-link" href="${href}">About our reporting</a></p>\n`;
    return page.replace(BRIEFING_HEADING, quiet);
  }
  const link = trustMarkup(href);
  return page.replace(BRIEFING_HEADING, "").replace(SKIM_HEADING, `$1$2 ${link}$3`);
}

export function tidyEditionChrome(html, href) {
  return dropBriefingHeading(stripMorningGreeting(html), href);
}
