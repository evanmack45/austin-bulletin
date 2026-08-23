export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");

  eleventyConfig.addCollection("bulletins", (api) =>
    api.getFilteredByGlob("src/bulletins/**/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addFilter("readableDate", (d) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    })
  );

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
