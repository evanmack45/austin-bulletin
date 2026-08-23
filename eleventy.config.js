import { HtmlBasePlugin } from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import markdownItAnchor from "markdown-it-anchor";

const SITE_URL = "https://theaustinbulletin.com/";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy("src/css");

  // Heading ids (e.g. <h2 id="weather">) so in-page jump links work.
  eleventyConfig.amendLibrary("md", (md) => md.use(markdownItAnchor));

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

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
