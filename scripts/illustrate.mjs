// Generate one house-style editorial illustration with Google's Nano Banana 2
// (gemini-3.1-flash-image) and save it as a web-ready JPEG.
//
// Usage:  node scripts/illustrate.mjs YYYY-MM-DD <slug> "<one-sentence subject>"
// Env:    GEMINI_API_KEY (required)
// Output: src/images/YYYY-MM-DD/<slug>.jpg  (1200px wide, 3:2, JPEG)
// Prints the markdown to paste under the story.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MODEL = "gemini-3.1-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// The house style: every illustration on the site shares this look so the
// bulletin reads as one publication. Keep edits here, not in per-story prompts.
const HOUSE_STYLE = [
  "An editorial illustration for a broadsheet newspaper, in the style of a",
  "19th-century wood engraving: black ink line work with fine cross-hatching on",
  "warm cream paper (#f6efe2), with one restrained accent of deep oxblood red",
  "(#7a1f1f) used sparingly. Landscape composition. A clear, simple, iconic",
  "subject with generous negative space and no clutter.",
  "No text, no letters, no numbers, no captions, no signature, no watermark,",
  "no border or frame. No real or recognizable people; any human figures are",
  "small, generic, and seen from a distance."
].join(" ");

function usage(msg) {
  if (msg) console.error(`Error: ${msg}`);
  console.error('Usage: node scripts/illustrate.mjs YYYY-MM-DD <slug> "<one-sentence subject>"');
  process.exit(1);
}

const [date, slug, subject] = process.argv.slice(2);
if (!date || !slug || !subject) usage();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) usage("date must be YYYY-MM-DD");
if (!/^[a-z0-9-]+$/.test(slug)) usage("slug must be lowercase letters, digits, and hyphens");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) usage("GEMINI_API_KEY is not set");

const body = {
  contents: [{ parts: [{ text: `${HOUSE_STYLE}\n\nSubject: ${subject}` }] }],
  generationConfig: {
    responseModalities: ["IMAGE"],
    imageConfig: { aspectRatio: "3:2", imageSize: "1K" }
  }
};

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
if (!res.ok) {
  console.error(`Gemini API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const parts = data.candidates?.[0]?.content?.parts ?? [];
const image = parts.find((p) => p.inlineData?.data);
if (!image) {
  console.error("No image in response (possibly refused). Response was:");
  console.error(JSON.stringify(data, null, 2).slice(0, 2000));
  process.exit(1);
}

const outDir = path.join("src", "images", date);
const outFile = path.join(outDir, `${slug}.jpg`);
await mkdir(outDir, { recursive: true });
const jpeg = await sharp(Buffer.from(image.inlineData.data, "base64"))
  .resize({ width: 1200, withoutEnlargement: true })
  .jpeg({ quality: 80, mozjpeg: true })
  .toBuffer();
await writeFile(outFile, jpeg);

console.error(`Wrote ${outFile} (${Math.round(jpeg.length / 1024)} KB)`);
console.log(`![${subject}](/images/${date}/${slug}.jpg)`);
console.log(`<figcaption>AI-generated illustration</figcaption>`);
