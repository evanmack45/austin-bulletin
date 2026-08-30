import { HtmlBasePlugin } from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import markdownItAnchor from "markdown-it-anchor";

const SITE_URL = "https://theaustinbulletin.com/";

// Shared by the heading-anchor slugifier and the River's beat nav, so a beat
// heading's id and its jump-link href are always produced by the same rule.
// The default markdown-it-anchor slugifier percent-encodes "&", which turns
// "Roads & transit" into "roads-%26-transit" — drop it in favor of this.
function beatSlug(s) {
  return String(s).trim().toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Inline SVG glyphs (24x24, currentColor) for each Voice-card platform.
const GLYPH = {
  x:
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-7.4 8.` +
    `5L23 22h-6.9l-5.4-6.9L4.5 22H1.4l7.9-9L1 2h7l4.9 6.3L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z"` +
    `/></svg>`,
  bluesky:
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8.5C10.5` +
    ` 5.5 7 3 4.5 3.5c-.6 3 .5 7 3 8.5-2.5 1.5-3.6 5.5-3 8.5 2.5.5 6-2 7.5-5 1.5 3 5 5.5 7.5 5 .6` +
    `-3-.5-7-3-8.5 2.5-1.5 3.6-5.5 3-8.5C17 3 13.5 5.5 12 8.5Z"/></svg>`,
  reddit:
    `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.3" fill="none` +
    `" stroke="currentColor" stroke-width="1.6"/><circle cx="8.6" cy="12" r="1.3" fill="currentCo` +
    `lor"/><circle cx="15.4" cy="12" r="1.3" fill="currentColor"/><path d="M7.6 15.4c1.1 1.1 2.6 ` +
    `1.7 4.4 1.7s3.3-.6 4.4-1.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-line` +
    `cap="round"/></svg>`,
  facebook:
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 3h-2a5 ` +
    `5 0 0 0-5 5v2H6v4h2v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3z"/></svg>`,
  youtube:
    `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" ` +
    `rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="10,8.5 16,12 1` +
    `0,15.5" fill="currentColor"/></svg>`
};

const PLATFORM_NAME = {
  x: "X",
  bluesky: "Bluesky",
  reddit: "Reddit",
  facebook: "Facebook"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// HTML-escapes text, then turns newlines into <br>. Bare URLs are left as
// plain (escaped) text — never auto-linked.
function textToHtml(text) {
  return escapeHtml(text).replace(/\r\n|\r|\n/g, "<br>");
}

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/images");
  // Site icons, served from the root where browsers look for them.
  // Generated from src/favicon.svg by `npm run favicon`.
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/apple-touch-icon.png");
  eleventyConfig.addPassthroughCopy("src/icon-192.png");
  eleventyConfig.addPassthroughCopy("src/icon-512.png");

  // Heading ids (e.g. <h2 id="weather">) so in-page jump links work.
  // Uses beatSlug (above) so ids agree with the River's beat nav hrefs.
  let md;
  eleventyConfig.amendLibrary("md", (lib) => {
    md = lib.use(markdownItAnchor, { slugify: beatSlug });
    return md;
  });

  eleventyConfig.addCollection("bulletins", (api) =>
    api.getFilteredByGlob("src/bulletins/**/*.md").sort((a, b) => b.date - a.date)
  );

  // Atom feed of the ten newest bulletins at /feed.xml.
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    collection: { name: "bulletins", limit: 10 },
    metadata: {
      language: "en",
      title: "The Austin Bulletin",
      subtitle: "A daily, neutral news bulletin for Austin and Texas.",
      base: SITE_URL,
      author: { name: "The Austin Bulletin" }
    }
  });

  eleventyConfig.addFilter("readableDate", (d) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    })
  );
  eleventyConfig.addFilter("weekday", (d) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
  );
  eleventyConfig.addFilter("longDate", (d) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    })
  );
  // Edition number: 1 for the oldest bulletin, counting up. `bulletins` is newest-first.
  eleventyConfig.addFilter("editionNumber", (url, bulletins) => {
    const i = bulletins.findIndex((b) => b.url === url);
    return i === -1 ? bulletins.length : bulletins.length - i;
  });

  // Masthead volume: Vol. I is 2026, the founding year, and the volume rolls
  // on Jan. 1 (Evan, 2026-08-29) — computed so the unattended New Year's run
  // cannot print a stale volume.
  eleventyConfig.addFilter("volumeNumeral", (d) => {
    let v = new Date(d).getUTCFullYear() - 2025;
    const numerals = [["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
    let out = "";
    for (const [sym, val] of numerals) while (v >= val) { out += sym; v -= val; }
    return out;
  });

  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("commas", (n) => Number(n).toLocaleString("en-US"));

  // Links that leave the site open in a new tab, so readers keep their place.
  // Runs on our own generated HTML only; the pattern matches <a href="http…"> exactly as
  // the templates and bulletins emit it.
  eleventyConfig.addTransform("externalLinks", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return content.replace(
      /<a href="(https?:\/\/(?!theaustinbulletin\.com)[^"]*)"/g,
      '<a href="$1" target="_blank" rel="noopener"'
    );
  });

  // The One Good Thing closer is authored as raw HTML in each bulletin, so
  // published editions get their jump-link anchor here rather than by
  // restructuring their files.
  eleventyConfig.addTransform("goodThingAnchor", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return content.replace('<p class="good-thing"', '<p class="good-thing" id="one-good-thing"');
  });

  // {% voice "id" %} — renders one Voice card from src/_data/cards/<id>.json
  // (exposed as global data `cards.<id>`). See scripts/card.mjs and
  // EDITORIAL.md "Voice cards and video".
  eleventyConfig.addShortcode("voice", function (id) {
    const c = this.ctx.cards?.[id];
    if (!c) return `<!-- voice card ${escapeHtml(id)} not found -->`;
    const { platform, name, handle, date, text, image, imageAlt, avatar, stats, url } = c;
    const glyph = GLYPH[platform] || "";
    const platformName = PLATFORM_NAME[platform] || escapeHtml(platform);
    const textHtml = textToHtml(text);
    const avatarHtml = avatar
      ? `<img class="voice-avatar" src="${escapeHtml(avatar)}" alt="" width="40" ` +
        `height="40" loading="lazy">`
      : "";
    const imageHtml = image
      ? `<img class="voice-image" src="${escapeHtml(image)}" alt="` +
        `${escapeHtml(imageAlt || "Image from the post")}" loading="lazy">`
      : "";
    const statsHtml = stats ? `<span>${escapeHtml(stats)}</span>` : "";
    const dateHtml = date ? " · " + escapeHtml(date) : "";
    const whoHtml =
      `<div class="voice-who"><strong class="voice-name">${escapeHtml(name)}</strong>` +
      `<span class="voice-meta">${escapeHtml(handle)}${dateHtml}</span></div>`;
    const figcaptionHtml =
      `<figcaption class="voice-foot"><a href="${escapeHtml(url)}">View on ${platformName} ↗</a>` +
      `${statsHtml}</figcaption>`;
    return `<figure class="voice-card voice-${escapeHtml(platform)}">
  <div class="voice-head">
    <span class="voice-glyph" aria-hidden="true">${glyph}</span>
    ${avatarHtml}
    ${whoHtml}
  </div>
  <p class="voice-text">${textHtml}</p>
  ${imageHtml}
  ${figcaptionHtml}
</figure>`;
  });

  // {% video "id" %} — renders one embedded YouTube frame from
  // src/_data/videos/<id>.json (exposed as global data `videos.<id>`).
  // See scripts/video.mjs.
  eleventyConfig.addShortcode("video", function (id) {
    const v = this.ctx.videos?.[id];
    if (!v) return `<!-- video ${escapeHtml(id)} not found -->`;
    const { videoId, title, author } = v;
    const videoBoxHtml =
      `<div class="video-box"><iframe src="https://www.youtube-nocookie.com/embed/` +
      `${escapeHtml(videoId)}" title="${escapeHtml(title)}" loading="lazy" ` +
      `allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen ` +
      `referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    return `<figure class="video-frame">
  ${videoBoxHtml}
  <figcaption>Video: ${escapeHtml(author)} — ${escapeHtml(title)}</figcaption>
</figure>`;
  });

  // {% river %}…{% endriver %} — wraps the day's River in a <div class="river">,
  // running the inner markdown through the same markdown-it instance (with
  // heading anchors) used for the rest of the page. Markdown-inside-a-div is
  // otherwise unreliable, since the outer Nunjucks->markdown-it pipeline only
  // passes raw HTML blocks through unchanged.
  // The River renders its own beat navigation: readers who want City Hall
  // should not have to scroll past Public safety to reach it. Both the
  // heading ids (via markdown-it-anchor above) and these hrefs come from the
  // same beatSlug function, so a jump link always lands on its heading.
  eleventyConfig.addPairedShortcode("river", (content) => {
    const beats = [...content.matchAll(/^####\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
    const nav = beats.length
      ? `<nav class="beat-nav" aria-label="Jump to a beat">` +
        beats.map((b) => `<a href="#${beatSlug(b)}">${b}</a>`).join("") +
        `</nav>\n`
      : "";
    const top = `<p class="to-top"><a href="#top">Back to top</a></p>\n`;
    return `<div class="river">\n${nav}${md.render(content)}${top}</div>`;
  });

  // {% bigstory %}…{% endbigstory %} — same idea, for the day's Big Story.
  eleventyConfig.addPairedShortcode(
    "bigstory",
    (content) => `<section class="big-story">\n${md.render(content)}</section>`
  );

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
