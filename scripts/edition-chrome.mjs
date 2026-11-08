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

export function sundayEditionSignup(html, editionIso) {
  if (editionIso !== "2026-11-08") return html;
  const page = String(html);
  const at = page.search(SUNDAY_SIGNUP_BEFORE);
  if (at < 0) throw new Error("Sunday signup has no third-story marker");
  if (page.includes('class="signup signup--edition"')) return page;
  return `${page.slice(0, at)}${EDITION_SIGNUP}${page.slice(at)}`;
}
