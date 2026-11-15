import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import yaml from "js-yaml";
import { leadForStory } from "../scripts/edition-images.mjs";
import {
  declaredLeadSrc,
  duplicateLeadProblems,
  leadFileFor,
  leadReuseProblems
} from "../scripts/lead-photos.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chart = "/images/2026-11-04/election-results.webp";

test("a shared lead fails when any edition is new", () => {
  const entries = [
    { date: "2026-11-03", file: "/images/p-courthouse.jpg" },
    { date: "2026-11-04", file: "/images/p-courthouse.jpg" }
  ];
  const problems = duplicateLeadProblems(entries, ["2026-11-03"]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /p-courthouse\.jpg/);
  assert.match(problems[0], /2026-11-04/);
});

test("grandfathered editions may share a lead file", () => {
  const entries = [
    { date: "2026-11-02", file: "/images/p-courthouse.jpg" },
    { date: "2026-11-03", file: "/images/p-courthouse.jpg" }
  ];
  const allowed = ["2026-11-02", "2026-11-03"];
  assert.deepEqual(duplicateLeadProblems(entries, allowed), []);
});

test("two new editions cannot share a lead file", () => {
  const entries = [
    { date: "2026-11-04", file: "/images/a.webp" },
    { date: "2026-11-05", file: "/images/a.webp" }
  ];
  assert.equal(duplicateLeadProblems(entries, []).length, 1);
});

test("an edition with no lead photo is not a duplicate", () => {
  const entries = [
    { date: "2026-11-04", file: "" },
    { date: "2026-11-05", file: "" }
  ];
  assert.deepEqual(duplicateLeadProblems(entries, []), []);
});

test("declared front matter wins over the shared catalog", () => {
  const markdown = [
    "---",
    "images:",
    "  lead:",
    `    src: ${chart}`,
    "---",
    "<!-- desk:photo courthouse -->"
  ].join("\n");
  const catalog = { courthouse: { file: "/images/p-courthouse.jpg" } };
  assert.equal(leadFileFor(markdown, catalog), chart);
  assert.equal(declaredLeadSrc("hello"), "");
});

test("the published archive does not reuse a lead outside the allowlist", async () => {
  const problems = await leadReuseProblems(root, path.join(root, "src/bulletins"));
  assert.deepEqual(problems, []);
  const allowPath = path.join(root, "src/_data/leadPhotoAllowlist.json");
  const allow = JSON.parse(readFileSync(allowPath, "utf8"));
  for (const date of allow.editions) assert.ok(date < "2026-11-04", date);
  const nov4 = readFileSync(path.join(root, "src/bulletins/2026-11-04.md"), "utf8");
  const catalog = { courthouse: { file: "/images/p-courthouse.jpg" } };
  assert.equal(leadFileFor(nov4, catalog), chart);
  assert.doesNotMatch(nov4, /p-courthouse/);
});

const chartLead = {
  kind: "chart",
  src: chart,
  smallSrc: "/images/2026-11-04/election-results-800.webp",
  width: 1280,
  height: 1080,
  smallWidth: 800,
  alt: "Chart: Travis County unofficial results.",
  caption: "Chart: Travis County unofficial results.",
  credit: "Travis County unofficial results",
  source: "https://results.enr.clarityelections.com/TX/Travis/127492/",
  license: "CC0 1.0",
  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/"
};

test("a chart lead is labeled, eager, and offers an 800w source", () => {
  const html = leadForStory({ lead: chartLead }, "", () => true, {
    sizes: "(max-width: 760px) calc(100vw - 32px), 1280px"
  });
  assert.match(html, /class="lead-photo lead-photo--flat"/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /width="1280" height="1080"/);
  assert.match(html, /election-results-800\.webp 800w/);
  assert.match(html, /election-results\.webp 1280w/);
  assert.match(html, /Chart: Travis County unofficial results/);
  assert.doesNotMatch(html, /Not a photograph/);
  assert.doesNotMatch(html, /Photo:/);
  assert.doesNotMatch(html, />Travis County unofficial results</);
  assert.match(html, /creativecommons\.org\/publicdomain\/zero\/1\.0/);
});

test("November 4 lead files match the front matter and stay under 200KB", async () => {
  const fm = readFileSync("src/bulletins/2026-11-04.md", "utf8").split("---")[1];
  const lead = yaml.load(fm).images.lead;
  const large = await sharp(`src${lead.src}`).metadata();
  const small = await sharp(`src${lead.smallSrc}`).metadata();
  assert.equal(large.width, lead.width);
  assert.equal(large.height, lead.height);
  assert.equal(small.width, lead.smallWidth);
  assert.ok(statSync(`src${lead.src}`).size < 200000);
  assert.ok(statSync(`src${lead.smallSrc}`).size < 200000);
});

test("a chart without a label cannot render", () => {
  const lead = { ...chartLead, alt: "Voters in line.", caption: "Election night." };
  assert.throws(() => leadForStory({ lead }, ""), /Chart or Illustration/);
});
