import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import sharp from "sharp";
import { selectedIllustration, sourceHash } from "./frontpage.mjs";

// Read only the packet's confined raster and provenance paths; no source/network fetch.
export async function loadIllustrationAssets(packets, srcRoot = "src") {
  let root;
  try { root = realpathSync(resolve(srcRoot, "images/editorial")); }
  catch { return {}; }
  const assets = {};
  for (const packet of packets) {
    const cards = [packet?.lead, packet?.access, ...(packet?.developments ?? []),
      packet?.feature, packet?.goodThing].filter(Boolean);
    for (const card of cards) {
      const art = card.illustration;
      if (!art || typeof art.src !== "string") continue;
      const shape = {[art.src]:{sha256:art.sha256,width:art.width,height:art.height,
        rightsPath:art.rightsPath}};
      if (!selectedIllustration(card, packet.date, shape)) continue;
      try {
        const file = realpathSync(resolve(srcRoot, art.src.slice(1)));
        const rights = realpathSync(resolve(srcRoot, art.rightsPath.slice(1)));
        if (![file, rights].every(path => path.startsWith(root + sep))) continue;
        if (!readFileSync(rights, "utf8").trim()) continue;
        const bytes = readFileSync(file);
        const metadata = await sharp(bytes).metadata();
        if (!["png", "webp"].includes(metadata.format)) continue;
        assets[art.src] = {sha256:sourceHash(bytes),width:metadata.width,
          height:metadata.height,rightsPath:art.rightsPath};
      } catch {
        // Original art is optional. Independent factual/rights review remains required.
      }
    }
  }
  return assets;
}
