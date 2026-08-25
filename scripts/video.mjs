// Fetch one YouTube video's metadata into a video embed.
//
// Usage: node scripts/video.mjs <youtube-url> [--date YYYY-MM-DD] [--reuse]
//
// If no --date is given, defaults to today in America/Chicago.
//
// A video's data file is keyed on the YouTube id alone, so re-fetching a clip
// that an already-published bulletin embeds would rewrite that edition's
// thumbnail path in place — a silent change to a published page. (This
// happened to the 2026-08-23 bulletin during the 2026-08-25 run.) So: if any
// bulletin already embeds this video, the script refuses and names it. Pass
// --reuse to deliberately embed the same clip again, which prints the tag and
// leaves the stored data and thumbnail untouched.
//
// Uses the official oEmbed endpoint (no API key needed) for title, author,
// and thumbnail. Downloads the thumbnail to src/images/<date>/video-<id>.jpg,
// writes src/_data/videos/yt-<id>.json (exposed to templates as
// `videos.yt-<id>`), and prints `{% video "yt-<id>" %}` to stdout so it can
// be pasted straight into a bulletin.
//
// See EDITORIAL.md "Voice cards and video" and PIPELINE.md Step 4.

import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const TIMEOUT_MS = 20000;

function fail(message) {
  console.error(`video: ${message}`);
  process.exit(1);
}

function safeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<url>";
  }
}

function computeDefaultDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${safeUrl(url)}`);
  }
  return res.json();
}

function usage(msg) {
  if (msg) fail(msg);
  console.error("Usage: node scripts/video.mjs <youtube-url> [--date YYYY-MM-DD] [--reuse]");
  process.exit(1);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") args.date = argv[++i];
    else if (a === "--reuse") args.reuse = true;
    else args._.push(a);
  }
  return args;
}

// Bulletins that already embed `{% video "<id>" %}`, newest filename first.
async function bulletinsUsing(repoRoot, id) {
  const dir = path.join(repoRoot, "src", "bulletins");
  let names;
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith(".md"));
  } catch {
    return [];
  }
  const needle = `{% video "${id}" %}`;
  const hits = [];
  for (const name of names.sort().reverse()) {
    let text;
    try {
      text = await readFile(path.join(dir, name), "utf8");
    } catch {
      continue;
    }
    if (text.includes(needle)) hits.push(name.replace(/\.md$/, ""));
  }
  return hits;
}

function extractVideoId(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return u.pathname.slice(1).split("/")[0] || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
    if (shorts) return shorts[1];
    const embed = u.pathname.match(/^\/embed\/([^/]+)/);
    if (embed) return embed[1];
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = args.date || computeDefaultDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) usage("--date must be YYYY-MM-DD");

  const rawUrl = args._[0];
  if (!rawUrl) usage("YouTube URL is required");

  const videoId = extractVideoId(rawUrl);
  if (!videoId) {
    fail(`could not find a video id in ${safeUrl(rawUrl)} (expected watch?v=, youtu.be/, or shorts/)`);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");
  const id = `yt-${videoId}`;

  // Refuse to rewrite a data file a published edition depends on.
  const usedBy = await bulletinsUsing(repoRoot, id);
  if (usedBy.length > 0) {
    if (args.reuse) {
      console.error(`video: reusing ${id}, already embedded in ${usedBy.join(", ")}; nothing rewritten`);
      console.log(`{% video "${id}" %}`);
      return;
    }
    fail(
      `${id} is already embedded in ${usedBy.join(", ")}. Re-fetching would rewrite ` +
        `that edition's stored thumbnail path. Pick a different clip, or pass --reuse ` +
        `to embed the same one again without touching the stored data.`
    );
  }

  let oembed;
  try {
    oembed = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`);
  } catch (err) {
    fail(`oEmbed fetch failed: ${err.message}`);
  }

  const title = oembed.title || "";
  const author = oembed.author_name || "";
  const thumbnailUrl = oembed.thumbnail_url || null;

  const imagesDir = path.join(repoRoot, "src", "images", date);
  const videosDir = path.join(repoRoot, "src", "_data", "videos");

  let thumbnail = null;
  if (thumbnailUrl) {
    try {
      const res = await fetch(thumbnailUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${safeUrl(thumbnailUrl)}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const jpeg = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      await mkdir(imagesDir, { recursive: true });
      const outPath = path.join(imagesDir, `video-${videoId}.jpg`);
      await writeFile(outPath, jpeg);
      thumbnail = `/images/${date}/video-${videoId}.jpg`;
    } catch (err) {
      console.error(`video: warning — could not save thumbnail: ${err.message}`);
    }
  }

  const output = {
    id,
    videoId,
    title,
    author,
    thumbnail,
    url: rawUrl,
    fetchedAt: new Date().toISOString()
  };

  await mkdir(videosDir, { recursive: true });
  const outPath = path.join(videosDir, `${id}.json`);
  await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.error(outPath);

  console.log(`{% video "${id}" %}`);
}

main().catch((err) => {
  fail(err && err.message ? err.message : String(err));
});
