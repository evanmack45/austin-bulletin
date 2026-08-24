// Gather Voice card candidates from Austin's Bluesky feeds.
//
// Usage:
//   node scripts/voices.mjs [--hours 30] [--limit 60] [--min-likes 0]
//
// Bluesky's post search needs a logged-in session, but its custom feeds are
// open to anyone. Several are Austin-specific, so this script finds them by
// name, reads each one, and prints recent posts as candidates for a Voice
// card. Nothing is written to disk: the point is a shortlist to read, from
// which you run `npm run card -- <post-url>` on the ones worth carrying.
//
// The feeds are run by individuals and go down without warning. Discovery is
// therefore dynamic rather than a hard-coded list, and a feed that errors is
// skipped and reported instead of failing the run.
//
// EDITORIAL.md governs what may become a card. In particular: no minors, no
// private facts, nothing that targets a private person, and cards carry
// opinion rather than new facts. On a contested public question cards run in
// pairs or not at all. This script filters for noise, not for those rules —
// that judgement is the writer's.
//
// See PIPELINE.md Step 4.

const API = "https://public.api.bsky.app/xrpc";
const USER_AGENT = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const TIMEOUT_MS = 45000;

// Feeds whose subject is a beat we do not cover, or that are reliably noise.
const SKIP_FEED = /\b(fc|soccer|football|tattoo|shooting)\b/i;

// Hashtag chains and link-drop accounts crowd out real local posts.
const NOISE = [
  /#\w+(\s+#\w+){3,}/,           // four or more hashtags in a row
  /^\s*(RT|repost)\b/i,
  /\b(onlyfans|crypto|airdrop|giveaway|promo code)\b/i
];

// Some feeds match the word "Austin" rather than the place, so they surface
// people named Austin. Rank on how local a post actually reads.
const STRONG_LOCAL = /\bATX\b|#atx|\bAustin,?\s*(TX|Texas)\b|\bCentral Texas\b/i;
const LOCAL_PLACES = new RegExp(
  "\\b(Barton Springs|Lady Bird|Zilker|Rainey|South Congress|SoCo|Congress Ave" +
  "|MoPac|I-?35|Ben White|Riverside|Mueller|Hyde Park|East Austin|South Austin" +
  "|Travis County|Hays County|Williamson County|Lake Travis|Pedernales" +
  "|UT Austin|Longhorns|Austin FC|Q2 Stadium|Moody Center|CapMetro|Austin ISD" +
  "|the Capitol|Hippie Hollow|Franklin|Torchy|H-E-B|HEB)\\b", "i");
// "Austin" immediately followed by a capitalised word is usually a person.
const NAME_LIKE = /\bAustin\s+[A-Z][a-z]+/;

function localScore(text) {
  let score = 0;
  if (STRONG_LOCAL.test(text)) score += 3;
  if (LOCAL_PLACES.test(text)) score += 2;
  if (NAME_LIKE.test(text) && score === 0) score -= 2;
  return score;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  const value = Number(process.argv[i + 1]);
  return Number.isFinite(value) ? value : fallback;
}

// These feeds run on hobbyist servers that are slow and often briefly down,
// so allow a generous timeout and one retry before writing a feed off.
async function api(method, params, attempts = 2) {
  const url = new URL(`${API}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const body = await res.json();
      if (body.error) throw new Error(`${body.error}: ${body.message || ""}`.trim());
      return body;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

function isNoise(text) {
  return NOISE.some((re) => re.test(text));
}

function postUrl(post) {
  return `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop()}`;
}

async function main() {
  const hours = arg("hours", 30);
  const perFeed = arg("limit", 60);
  const minLikes = arg("min-likes", 0);
  const now = Date.now();

  let discovered;
  try {
    discovered = await api("app.bsky.unspecced.getPopularFeedGenerators", {
      query: "austin",
      limit: 25
    });
  } catch (err) {
    console.error(`voices: could not list Austin feeds — ${err.message}`);
    process.exit(1);
  }

  const feeds = (discovered.feeds || [])
    .filter((f) => /austin/i.test(f.displayName || ""))
    .filter((f) => !SKIP_FEED.test(f.displayName || ""))
    .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    .slice(0, 6);

  if (!feeds.length) {
    console.error("voices: no Austin feeds found");
    process.exit(1);
  }

  const seen = new Set();
  const candidates = [];
  const skipped = [];

  for (const feed of feeds) {
    let page;
    try {
      page = await api("app.bsky.feed.getFeed", { feed: feed.uri, limit: perFeed });
    } catch (err) {
      skipped.push(`${feed.displayName} (${err.message})`);
      continue;
    }
    for (const item of page.feed || []) {
      const post = item.post;
      if (!post?.record?.createdAt) continue;
      if (item.reason) continue;                      // reposts, not the author's words
      if (post.record.reply) continue;                // replies lack their own context
      const ageHours = (now - new Date(post.record.createdAt).getTime()) / 3600000;
      if (!(ageHours >= 0 && ageHours <= hours)) continue;
      if ((post.likeCount || 0) < minLikes) continue;
      const text = (post.record.text || "").trim();
      if (text.length < 25 || isNoise(text)) continue;
      const url = postUrl(post);
      if (seen.has(url)) continue;
      seen.add(url);
      candidates.push({ ageHours, likes: post.likeCount || 0, handle: post.author.handle,
                        name: post.author.displayName || "", text, url, feed: feed.displayName,
                        local: localScore(text) });
    }
  }

  // Local first, then newest. A post whose only Austin is somebody's name
  // sinks to the bottom rather than being dropped — the call is the writer's.
  candidates.sort((a, b) => b.local - a.local || a.ageHours - b.ageHours);

  console.log(`Austin Bluesky voices — ${candidates.length} candidates from ` +
              `${feeds.length - skipped.length} of ${feeds.length} feeds, last ${hours}h`);
  console.log("These are candidates, not cleared copy. Some Austin feeds are");
  console.log("dominated by politicians of one party: a card on a contested");
  console.log("public question runs paired with the other side, or not at all.");
  console.log("EDITORIAL.md \"Voice cards and video\" is the rule.\n");
  for (const c of candidates) {
    const flag = c.local > 0 ? "local" : c.local < 0 ? "probably a person named Austin" : "unscored";
    console.log(`[${c.ageHours.toFixed(1)}h · ${c.likes} likes · ${c.feed} · ${flag}]`);
    console.log(`@${c.handle}${c.name ? ` (${c.name})` : ""}`);
    console.log(c.text.replace(/\n+/g, " ").slice(0, 280));
    console.log(`${c.url}\n`);
  }
  if (skipped.length) {
    console.log(`Feeds unavailable this run: ${skipped.join("; ")}`);
  }
  if (!candidates.length) {
    console.log("No candidates. Widen with --hours, or lower --min-likes.");
  }
}

main().catch((err) => {
  console.error(`voices: ${err.message}`);
  process.exit(1);
});
