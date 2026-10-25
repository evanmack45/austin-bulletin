import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import sharp from "sharp";
import yaml from "js-yaml";
import {
  editionImageProblems,
  leadForStory,
  leadMarkup,
  photoMarkup,
  withStoryPhotos,
} from "../scripts/edition-images.mjs";

const photo = {
  src: "/images/2026-10-24/viva-la-vida-960.webp",
  smallSrc: "/images/2026-10-24/viva-la-vida-480.webp",
  width: 960,
  height: 640,
  smallWidth: 480,
  alt: "Ginger Rodriguez singing at the Viva La Vida Festival.",
  caption: "File photo, 2022. Not the 2026 parade.",
  credit: "Sydney Wisner (Jyng3r)",
  source: "https://commons.wikimedia.org/wiki/File:Gingerrodriguezvivalavidafest2022.jpg",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
};

test("photo markup shows alt text, credit, and license links", () => {
  const html = photoMarkup(photo, {
    className: "lead-photo", loading: "eager", sizes: "100vw", fetchPriority: "high",
  });
  assert.ok(html.includes(`alt="${photo.alt}"`));
  assert.ok(html.includes(`href="${photo.source}"`));
  assert.ok(html.includes(`>${photo.credit}<`));
  assert.ok(html.includes(`href="${photo.licenseUrl}"`));
  assert.ok(html.includes(`>${photo.license}<`));
  assert.match(html, /fetchpriority="high"/);
  assert.doesNotMatch(html, /<script/i);
});

test("a remote file or a blank credit cannot render", () => {
  const bad = { ...photo, src: "https://example.com/a.webp", credit: "" };
  const problems = editionImageProblems({ lead: bad });
  assert.ok(problems.some((item) => /src/.test(item)));
  assert.ok(problems.some((item) => /credit/.test(item)));
  assert.throws(() => leadMarkup({ lead: bad }), /credit|src/);
});

test("a javascript license link is rejected", () => {
  const bad = { ...photo, licenseUrl: "javascript:bad" };
  const problems = editionImageProblems({ lead: bad });
  assert.ok(problems.some((item) => /licenseUrl/.test(item)));
});

test("missing derivative files are reported", () => {
  const problems = editionImageProblems({ lead: photo }, () => false);
  assert.ok(problems.some((item) => item.includes(photo.src)));
  assert.ok(problems.some((item) => item.includes(photo.smallSrc)));
});

test("a lead photograph renders only for the story it belongs to", () => {
  const tree = {
    ...photo,
    key: "tree",
    src: "/images/2026-10-24/zilker-tree-1200.webp",
    smallSrc: "/images/2026-10-24/zilker-tree-640.webp",
    width: 1200,
    height: 798,
    smallWidth: 640,
  };
  const images = { lead: tree, stories: [{ ...photo, key: "parade" }] };
  const parade = leadForStory(images, "parade");
  assert.match(parade, /viva-la-vida-960\.webp/);
  assert.doesNotMatch(parade, /zilker-tree/);
  assert.match(leadForStory(images, "tree"), /zilker-tree-1200\.webp/);
  const missing = leadForStory(images, "library");
  assert.match(missing, /austin-skyline\.svg/);
  assert.match(missing, /Original illustration/);
  assert.match(missing, /no photograph/i);
});

test("a missing lead renders the skyline illustration and its credit", () => {
  const html = leadMarkup(undefined);
  assert.match(html, /\/images\/fallback\/austin-skyline\.svg/);
  assert.match(html, /Original illustration/);
  assert.match(html, /The Austin Bulletin/);
  assert.match(html, /no photograph/i);
  assert.doesNotMatch(html, /\.webp/);
});

test("story photos attach only to the matching heading", () => {
  const html = "<h4 id=\"money-bills\">Money</h4>" +
    "<h5 id=\"place\">Places</h5><p>One</p><h5 id=\"other\">Other</h5><p>Two</p>";
  const images = { stories: [{ ...photo, key: "place" }] };
  const out = withStoryPhotos(html, images);
  const place = out.indexOf("id=\"place\"");
  const other = out.indexOf("id=\"other\"");
  const thumbs = [...out.matchAll(/<figure class="story-thumb"/g)];
  assert.equal(thumbs.length, 1);
  assert.ok(thumbs[0].index > place && thumbs[0].index < other);
  assert.match(out.slice(other), /austin-skyline\.svg/);
  assert.match(out, /beat-money-bills/);
});

test("a heading with no image record still gets a credited illustration", () => {
  const out = withStoryPhotos("<h5 id=\"solo\">Solo</h5>", undefined);
  assert.match(out, /austin-skyline\.svg/);
  assert.match(out, /<figcaption>/);
  assert.match(out, /Original illustration/);
});

test("duplicate story keys are rejected", () => {
  const images = { stories: [{ ...photo, key: "place" }, { ...photo, key: "place" }] };
  const problems = editionImageProblems(images);
  assert.ok(problems.some((item) => /repeats place/.test(item)));
});

test("October 24 rights files name Commons licenses and no city photograph", () => {
  const rights = readFileSync("src/images/2026-10-24/LICENSE.txt", "utf8");
  assert.match(rights, /CC BY-SA 2\.0/);
  assert.match(rights, /CC BY 4\.0/);
  assert.match(rights, /CC BY-SA 4\.0/);
  assert.match(rights, /That Other Paper/);
  assert.match(rights, /Larry D\. Moore/);
  assert.match(rights, /Sydney Wisner/);
  assert.match(rights, /Zilker/);
  assert.match(rights, /Esther/);
  assert.match(rights, /cropped/);
  assert.match(rights, /scaled only, not cropped/);
  assert.doesNotMatch(rights, /austintexas\.gov/);
  assert.doesNotMatch(rights, /written permission/);
  const skyline = readFileSync("src/images/fallback/LICENSE.txt", "utf8");
  assert.match(skyline, /Original illustration/);
  assert.match(skyline, /Not a photograph/);
});

test("October 24 derivatives match the front matter dimensions", async () => {
  const fm = readFileSync("src/bulletins/2026-10-24.md", "utf8").split("---")[1];
  const images = yaml.load(fm).images;
  for (const item of [images.lead, ...(images.stories ?? [])].filter(Boolean)) {
    const large = await sharp(`src${item.src}`).metadata();
    const small = await sharp(`src${item.smallSrc}`).metadata();
    assert.equal(large.width, item.width);
    assert.equal(large.height, item.height);
    assert.equal(small.width, item.smallWidth);
    assert.ok(statSync(`src${item.src}`).size < 180000);
  }
});

function leadFigure(html) {
  return html.match(/<figure class="lead-photo">([\s\S]*?)<\/figure>/)?.[1] ?? "";
}

test("built October 24 pages credit the lead and do not illustrate the library death", () => {
  const home = readFileSync("_site/index.html", "utf8");
  const edition = readFileSync("_site/2026/10/24/index.html", "utf8");
  const tree = "/images/2026-10-24/zilker-tree-1200.webp";
  const parade = "/images/2026-10-24/viva-la-vida-960.webp";
  assert.match(leadFigure(edition), new RegExp(parade.replaceAll(".", "\\.")));
  assert.doesNotMatch(leadFigure(edition), /zilker-tree/);
  const headline = edition.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "";
  assert.match(headline, /Viva La Vida parade and festival take over downtown today/);
  assert.doesNotMatch(headline, /murder|\$1\.2 million/);
  assert.ok(edition.includes(tree), "tree photograph stays with its story");
  assert.ok(edition.includes("That Other Paper"));
  assert.ok(edition.includes("File:Trail_of_Lights_Austin.jpg"));
  assert.ok(edition.includes("creativecommons.org/licenses/by-sa/2.0"));
  assert.ok(edition.includes("People walking at night under the Zilker Holiday Tree"));
  assert.ok(edition.includes("Larry D. Moore"));
  assert.ok(edition.includes("File:Esthers_follies_austin_tx_2014.jpg"));
  assert.ok(edition.includes("creativecommons.org/licenses/by/4.0"));
  assert.doesNotMatch(edition, /src="[^"]*austintexas\.gov/);
  assert.ok(home.includes("class=\"rail-thumb"));
  assert.ok(edition.includes("class=\"story-thumb\""));
  assert.ok(edition.includes("Ginger Rodriguez"));
  assert.ok(edition.includes("creativecommons.org/licenses/by-sa/4.0"));
  assert.ok(edition.includes("Esther's Follies on Sixth Street"));
  const library = "library-assault-death-ruled-a-homicide-suspect-now-charged-with-murder";
  const tampere = "austin-signs-a-five-year-partnership-with-tampere-finland";
  const between = edition.slice(edition.indexOf(library), edition.indexOf(tampere));
  assert.match(between, /austin-skyline\.svg/);
  assert.doesNotMatch(between, /\.webp/);
});
