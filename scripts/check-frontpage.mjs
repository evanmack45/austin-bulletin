// Structural checks only. Source reading and independent editorial review are separate gates.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { validateCuration } from "./frontpage.mjs";
import { selectedIllustration } from "./frontpage.mjs";
import { loadIllustrationAssets } from "./front-art.mjs";

const directory = new URL("../src/_data/frontpages/", import.meta.url);
async function warnInvalidArt(bundle) {
  const assets = await loadIllustrationAssets([bundle]);
  for (const card of [bundle.lead, bundle.access, ...(bundle.developments ?? []),
    bundle.feature, bundle.goodThing].filter(Boolean)) {
    if (card.illustration && !selectedIllustration(card, bundle.date, assets)) {
      console.warn(`frontpage: ${bundle.date} ${card.key}: optional art omitted`);
    }
  }
}
let count = 0;
try {
  if (existsSync(directory)) {
    for (const filename of readdirSync(directory).filter((name) => name.endsWith(".json"))) {
      const contents = readFileSync(new URL(filename, directory), "utf8");
      const bundle = validateCuration(JSON.parse(contents));
      if (filename !== `${bundle.date}.json`) throw new Error(`Date/file mismatch: ${filename}`);
      await warnInvalidArt(bundle);
      count++;
    }
  }
  console.error(`frontpage: ${count} curation packet(s) pass structural checks, ` +
    "not fact verification");
} catch (error) {
  console.error(`frontpage: ${error.message}. Do not publish.`);
  process.exitCode = 1;
}
