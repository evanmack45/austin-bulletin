// Fetch one public social post into a Voice card.
//
// Usage:
//   node scripts/card.mjs <post-url> [--date YYYY-MM-DD] [--alt "image description"]
//   node scripts/card.mjs --manual <json-file> [--date YYYY-MM-DD]
//
// Supported post URLs: x.com/twitter.com status, bsky.app post, reddit.com
// comments. YouTube is not a card — use scripts/video.mjs. Facebook has no
// public API: use --manual with a hand-prepared JSON file instead.
//
// If no --date is given, defaults to today in America/Chicago.
//
// Output: writes src/_data/cards/<id>.json (exposed to templates as
// `cards.<id>`), downloads the post image (if any) to
// src/images/<date>/card-<id>.jpg (max width 1200, JPEG q80) and the avatar
// to src/images/<date>/avatar-<id>.jpg (96x96 cover), and prints
// `{% voice "<id>" %}` to stdout so it can be pasted straight into a bulletin.
//
// See EDITORIAL.md "Voice cards and video" and PIPELINE.md Step 4.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import sharp from "sharp";

const USER_AGENT = "TheAustinBulletin/1.0 (contact@theaustinbulletin.com)";
const TIMEOUT_MS = 20000;

const AP_MONTH = {
  January: "Jan.", February: "Feb.", March: "March", April: "April", May: "May",
  June: "June", July: "July", August: "Aug.", September: "Sept.", October: "Oct.",
  November: "Nov.", December: "Dec."
};

function fail(message) {
  console.error(`card: ${message}`);
  process.exit(1);
}

// URL without its query string, for error messages (never echo tokens).
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

// Fetch a URL's text with curl, for hosts that reject Node's HTTP client.
// Sends the same honest User-Agent as every other request we make.
// Reddit rate-limits hard: a burst of requests earns an HTTP 429 with an
// empty body. Retry a couple of times before giving up.
async function curlText(url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await curlTextOnce(url);
    } catch (err) {
      lastErr = err;
      if (!/HTTP 429|HTTP 5\d\d/.test(err.message) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr;
}

function curlTextOnce(url) {
  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      ["-sSL", "--max-time", String(Math.round(TIMEOUT_MS / 1000)),
       "-A", USER_AGENT, "-w", "\n%{http_code}", url],
      { maxBuffer: 20 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(new Error(`curl failed: ${err.message}`));
        const cut = stdout.lastIndexOf("\n");
        const status = stdout.slice(cut + 1).trim();
        if (status !== "200") {
          return reject(new Error(`HTTP ${status} for ${safeUrl(url)}`));
        }
        resolve(stdout.slice(0, cut));
      }
    );
  });
}

function decodeEntities(s) {
  return s
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "");
}

// Formats a real Date/instant as "Aug. 21" in America/Chicago, AP-style.
function formatApDate(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "America/Chicago" }).format(date);
  const day = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "America/Chicago" }).format(date);
  return `${AP_MONTH[month] || month} ${day}`;
}

// Formats a "Month D, YYYY" string (no reliable timezone) as "Aug. 21"
// without going through Date parsing at all.
function apDateFromLongString(s) {
  const m = s && s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+\d{4}$/);
  if (!m) return null;
  const month = AP_MONTH[m[1]];
  if (!month) return null;
  return `${month} ${Number(m[2])}`;
}

// --- CLI ---------------------------------------------------------------

function usage(msg) {
  if (msg) fail(msg);
  console.error('Usage: node scripts/card.mjs <post-url> [--date YYYY-MM-DD] [--alt "image description"]');
  console.error("       node scripts/card.mjs --manual <json-file> [--date YYYY-MM-DD]");
  process.exit(1);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") args.date = argv[++i];
    else if (a === "--alt") args.alt = argv[++i];
    else if (a === "--manual") args.manual = true;
    else args._.push(a);
  }
  return args;
}

// --- platform detection --------------------------------------------------

function detectPlatform(url) {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "x.com" || host === "twitter.com") return "x";
  if (host === "bsky.app") return "bluesky";
  if (host === "reddit.com" || host.endsWith(".reddit.com")) return "reddit";
  if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") return "youtube";
  return null;
}

// --- X ---------------------------------------------------------------------

async function fetchX(originalUrl, statusId) {
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(originalUrl)}&omit_script=true&dnt=true`;
  const oembed = await fetchJson(oembedUrl);
  const html = oembed.html || "";

  let text = "";
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (pMatch) {
    text = decodeEntities(stripTags(pMatch[1].replace(/<br\s*\/?>/gi, "\n"))).trim();
  }

  let name = oembed.author_name || "";
  let handle = "";
  let date = null;
  const authorMatch = html.match(/&mdash;\s*([^(]+)\(@([^)]+)\)[^<]*<a[^>]*>([^<]+)<\/a>/);
  if (authorMatch) {
    if (!name) name = decodeEntities(authorMatch[1]).trim();
    handle = authorMatch[2].trim();
    date = apDateFromLongString(decodeEntities(authorMatch[3]).trim());
  }
  if (!handle && oembed.author_url) {
    const m = oembed.author_url.match(/(?:x|twitter)\.com\/([^/?]+)/);
    if (m) handle = m[1];
  }

  let imageUrl = null;
  let avatarUrl = null;
  let stats = null;
  try {
    const fx = await fetchJson(`https://api.fxtwitter.com/status/${statusId}`);
    const tweet = fx.tweet;
    if (tweet?.media?.photos?.[0]?.url) imageUrl = tweet.media.photos[0].url;
    if (tweet?.author?.avatar_url) avatarUrl = tweet.author.avatar_url;
    if (typeof tweet?.likes === "number") stats = `${tweet.likes} likes`;
  } catch {
    // Unofficial media API — best effort only. No image/avatar/stats is fine.
  }

  return {
    platform: "x",
    name: name || (handle ? `@${handle}` : "X user"),
    handle: handle ? `@${handle}` : "",
    date,
    text,
    imageUrl,
    imageAlt: null,
    avatarUrl,
    stats
  };
}

// --- Bluesky -----------------------------------------------------------

async function fetchBluesky(handleOrDid, rkey) {
  let did = handleOrDid;
  if (!did.startsWith("did:")) {
    const resolved = await fetchJson(
      `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handleOrDid)}`
    );
    did = resolved.did;
  }
  const uri = `at://${did}/app.bsky.feed.post/${rkey}`;
  const postsRes = await fetchJson(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`
  );
  const post = postsRes.posts && postsRes.posts[0];
  if (!post) throw new Error("post not found (getPosts returned no results)");

  const record = post.record || {};
  const author = post.author || {};
  const embed = post.embed || {};
  const images = embed.images || (embed.media && embed.media.images) || [];
  const img = images[0];

  return {
    platform: "bluesky",
    name: author.displayName || author.handle || "Bluesky user",
    handle: author.handle ? `@${author.handle}` : "",
    date: formatApDate(record.createdAt ? new Date(record.createdAt) : null),
    text: record.text || "",
    imageUrl: img?.fullsize || null,
    imageAlt: img?.alt || null,
    avatarUrl: author.avatar || null,
    stats: typeof post.likeCount === "number" ? `${post.likeCount} likes` : null
  };
}

// --- Reddit ------------------------------------------------------------

// Reddit's .json endpoints return 403 to us; the Atom feed at .rss on the
// same URL is open and carries everything a card needs except the score.
async function fetchReddit(url) {
  const clean = new URL(url);
  clean.search = "";
  const rssUrl = `${clean.toString().replace(/\/$/, "")}/.rss`;
  // Reddit 403s Node's HTTP client whatever headers we send — it is
  // fingerprinting the client, not the User-Agent. curl gets 200 with the
  // same honest User-Agent, so shell out for this one request.
  const xml = await curlText(rssUrl);

  // The first <entry> is the post itself; later entries are its comments.
  const entry = xml.split("<entry>")[1];
  if (!entry) throw new Error("no post entry in reddit feed");
  const pick = (tag) => {
    const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return m ? m[1].trim() : "";
  };

  const title = decodeEntities(pick("title"));
  const author = pick("name").replace(/^\/u\//, "");
  const updated = pick("updated");
  // <content> is HTML-escaped markup; unescape once, then read it.
  const contentHtml = decodeEntities(pick("content"));

  let imageUrl = null;
  const img = contentHtml.match(/<img[^>]+src="([^"]+\.(?:jpg|jpeg|png|webp))[^"]*"/i);
  if (img) imageUrl = decodeEntities(img[1]);

  // Drop the "submitted by" footer Reddit appends to every entry.
  const bodyHtml = contentHtml.split(/<!--\s*SC_OFF\s*-->/).pop().split(/<!--\s*SC_ON\s*-->/)[0];
  const body = decodeEntities(stripTags(bodyHtml)).replace(/\s+\n/g, "\n").trim();

  let text = title;
  if (body && !body.startsWith("submitted by")) {
    text += "\n\n" + body.slice(0, 400);
  }

  return {
    platform: "reddit",
    name: `r/${clean.pathname.split("/")[2] || "Austin"}`,
    handle: author ? `u/${author}` : "",
    date: formatApDate(updated ? new Date(updated) : null),
    text,
    imageUrl,
    imageAlt: null,
    avatarUrl: null,
    stats: null
  };
}

// --- image handling ------------------------------------------------------

async function fetchImageBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${safeUrl(url)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeCardImage(buffer, outPath) {
  const jpeg = await sharp(buffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  await writeFile(outPath, jpeg);
}

async function writeAvatarImage(buffer, outPath) {
  const jpeg = await sharp(buffer).resize({ width: 96, height: 96, fit: "cover" }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  await writeFile(outPath, jpeg);
}

// --- main ------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = args.date || computeDefaultDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) usage("--date must be YYYY-MM-DD");

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");
  const cardsDir = path.join(repoRoot, "src", "_data", "cards");
  const imagesDir = path.join(repoRoot, "src", "images", date);

  let id, platform, url, name, handle, cardDate, text, imageAlt, stats;
  let imageSource = null; // {kind:"url"|"file", value}
  let avatarSource = null; // {kind:"url", value}

  if (args.manual) {
    const jsonFile = args._[0];
    if (!jsonFile) usage("--manual requires a JSON file path");
    let raw;
    try {
      raw = JSON.parse(await readFile(jsonFile, "utf8"));
    } catch (err) {
      fail(`could not read/parse manual JSON file: ${err.message}`);
    }
    if (!raw.platform || !raw.url || !raw.name || !raw.text) {
      fail("manual JSON must include at least platform, url, name, and text");
    }
    const hash = crypto.createHash("sha256").update(raw.url).digest("hex").slice(0, 8);
    id = `manual-${hash}`;
    platform = raw.platform;
    url = raw.url;
    name = raw.name;
    handle = raw.handle || "";
    cardDate = raw.date || null;
    text = raw.text;
    imageAlt = args.alt || raw.imageAlt || null;
    imageSource = raw.image ? { kind: "file", value: raw.image } : null;
    stats = raw.stats || null;
  } else {
    const rawUrl = args._[0];
    if (!rawUrl) usage("post URL is required");
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      usage(`not a valid URL: ${rawUrl}`);
    }
    const platformGuess = detectPlatform(parsed);

    if (platformGuess === "youtube") {
      fail(`that's a YouTube URL — use "npm run video -- ${rawUrl}" instead.`);
    }
    if (platformGuess === "x") {
      const m = parsed.pathname.match(/\/status\/(\d+)/);
      if (!m) fail(`not a post URL — expected an x.com/twitter.com .../status/<id> URL (got ${safeUrl(rawUrl)})`);
      const statusId = m[1];
      let data;
      try {
        data = await fetchX(rawUrl, statusId);
      } catch (err) {
        fail(`X fetch failed: ${err.message}`);
      }
      id = `x-${statusId}`;
      ({ platform, name, handle, date: cardDate, text, stats } = data);
      url = rawUrl;
      imageAlt = args.alt || data.imageAlt;
      imageSource = data.imageUrl ? { kind: "url", value: data.imageUrl } : null;
      avatarSource = data.avatarUrl ? { kind: "url", value: data.avatarUrl } : null;
    } else if (platformGuess === "bluesky") {
      const m = parsed.pathname.match(/\/profile\/([^/]+)\/post\/([^/]+)/);
      if (!m) fail(`not a post URL — expected a bsky.app .../profile/<handle>/post/<rkey> URL (got ${safeUrl(rawUrl)})`);
      const [, handleOrDid, rkey] = m;
      let data;
      try {
        data = await fetchBluesky(handleOrDid, rkey);
      } catch (err) {
        fail(`Bluesky fetch failed: ${err.message}`);
      }
      id = `bsky-${rkey}`;
      ({ platform, name, handle, date: cardDate, text, stats } = data);
      url = rawUrl;
      imageAlt = args.alt || data.imageAlt;
      imageSource = data.imageUrl ? { kind: "url", value: data.imageUrl } : null;
      avatarSource = data.avatarUrl ? { kind: "url", value: data.avatarUrl } : null;
    } else if (platformGuess === "reddit") {
      const m = parsed.pathname.match(/\/r\/([^/]+)\/comments\/([^/]+)/);
      if (!m) fail(`not a post URL — expected a reddit.com .../r/<sub>/comments/<id>/... URL (got ${safeUrl(rawUrl)})`);
      const redditId = m[2];
      let data;
      try {
        data = await fetchReddit(rawUrl);
      } catch (err) {
        fail(`Reddit fetch failed: ${err.message}`);
      }
      id = `reddit-${redditId}`;
      ({ platform, name, handle, date: cardDate, text, stats } = data);
      url = rawUrl;
      imageAlt = args.alt || data.imageAlt;
      imageSource = data.imageUrl ? { kind: "url", value: data.imageUrl } : null;
      avatarSource = null;
    } else {
      fail(
        `unsupported URL — expected an x.com/twitter.com status, bsky.app post, or reddit.com comments URL ` +
          `(use --manual for Facebook). Got ${safeUrl(rawUrl)}`
      );
    }
  }

  let image = null;
  let avatar = null;

  if (imageSource) {
    const outPath = path.join(imagesDir, `card-${id}.jpg`);
    try {
      await mkdir(imagesDir, { recursive: true });
      const buffer =
        imageSource.kind === "url" ? await fetchImageBuffer(imageSource.value) : await readFile(imageSource.value);
      await writeCardImage(buffer, outPath);
      image = `/images/${date}/card-${id}.jpg`;
    } catch (err) {
      console.error(`card: warning — could not save post image: ${err.message}`);
    }
  }

  if (avatarSource) {
    const outPath = path.join(imagesDir, `avatar-${id}.jpg`);
    try {
      await mkdir(imagesDir, { recursive: true });
      const buffer = await fetchImageBuffer(avatarSource.value);
      await writeAvatarImage(buffer, outPath);
      avatar = `/images/${date}/avatar-${id}.jpg`;
    } catch (err) {
      console.error(`card: warning — could not save avatar: ${err.message}`);
    }
  }

  const output = {
    id,
    platform,
    url,
    name,
    handle,
    date: cardDate,
    text,
    image,
    imageAlt: imageAlt || null,
    avatar,
    stats: stats || null,
    fetchedAt: new Date().toISOString()
  };

  await mkdir(cardsDir, { recursive: true });
  const outPath = path.join(cardsDir, `${id}.json`);
  await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.error(outPath);

  console.log(`{% voice "${id}" %}`);
}

main().catch((err) => {
  fail(err && err.message ? err.message : String(err));
});
