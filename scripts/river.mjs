// Parses a {% river %} block into typed items and beats.
//
// Two kinds of item, per EDITORIAL.md "The shape of a day":
//   lead  — a ##### headline over a 50–70 word summary
//   brief — one sentence, no headline
//
// Careful: `startsWith("####")` is true for "#####" as well. Lead detection
// must be tested before beat detection, or every lead is read as a beat.

export const BEATS = [
  "Roads & transit",
  "Public safety & courts",
  "City Hall & county",
  "Schools",
  "Health",
  "Business & tech",
  "Around town",
  "Texas",
  "Sports"
];

export function words(block) {
  return block
    .replace(/!\[[\s\S]*?\]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(block) {
  const t = words(block);
  return t ? t.split(" ").length : 0;
}

function visualKind(block) {
  if (block.startsWith("{% voice")) return "voice";
  if (block.startsWith("{% video")) return "video";
  if (block.startsWith("![") || block.startsWith("<figure")) return "graphic";
  return null;
}

export function parseRiver(river) {
  const blocks = river
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const beats = [];
  const items = [];
  const visuals = { voice: 0, video: 0, graphic: 0 };
  let current = null;

  for (const block of blocks) {
    if (block.startsWith("#####")) {
      const [head, ...rest] = block.split("\n");
      const headline = head.replace(/^#####\s*/, "").trim();
      const body = rest.join("\n").trim();
      const item = { kind: "lead", headline, body, words: wordCount(body), beat: current?.name ?? null };
      items.push(item);
      current?.items.push(item);
      continue;
    }

    if (block.startsWith("####")) {
      current = { name: block.replace(/^####\s*/, "").trim(), items: [], visuals: 0, voice: 0, words: 0 };
      beats.push(current);
      continue;
    }

    const kind = visualKind(block);
    if (kind) {
      visuals[kind] += 1;
      if (current) {
        current.visuals += 1;
        if (kind === "voice") current.voice += 1;
      }
      continue;
    }

    if (block.startsWith("{%") || block.startsWith('<p class="source-line"') || block.startsWith("<figcaption")) {
      continue;
    }

    const item = { kind: "brief", headline: null, body: block, words: wordCount(block), beat: current?.name ?? null };
    items.push(item);
    current?.items.push(item);
  }

  for (const beat of beats) {
    beat.words = beat.items.reduce((n, i) => n + i.words, 0);
  }

  return {
    beats,
    items,
    leads: items.filter((i) => i.kind === "lead"),
    briefs: items.filter((i) => i.kind === "brief"),
    visuals
  };
}
