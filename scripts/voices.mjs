// Gather Voice card candidates from Austin's Bluesky feeds and from X.
//
// Usage:
//   node scripts/voices.mjs [--hours 30] [--limit 60] [--min-likes 0]
//   node scripts/voices.mjs --search "barton springs"    (needs credentials)
//
// Three sources, and the script uses whichever are available. A missing or
// rejected credential is reported and the run carries on with the rest, so
// nothing here can fail the morning bulletin.
//
// 1. Austin's public Bluesky custom feeds. Open to anyone, so these always
//    run. Found by name each morning, since they are run by individuals and
//    come and go.
//
// 2. Bluesky post search, when BLUESKY_HANDLE and BLUESKY_APP_PASSWORD are
//    set — an app password from Bluesky's settings, never the account
//    password. Free, so it runs a spread of Austin queries.
//
// 3. X search, when X_BEARER_TOKEN is set — an app-only bearer token from
//    the X developer portal. X bills per request, so this is deliberately
//    two calls a morning: the queries use OR to cover many terms at once.
//    Widen a query rather than adding one. On a rejected token or a rate
//    limit it stops immediately instead of spending another billed call.
//
// Nothing is written to disk: the point is a shortlist to read, from which
// you run `npm run card -- <post-url>` on the ones worth carrying.
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
const AUTH_API = "https://bsky.social/xrpc";
const USER_AGENT = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const TIMEOUT_MS = 45000;

// Searched when logged in and --search was not given. Kept narrow: these are
// looking for Austinites talking about Austin, not for national news.
const DEFAULT_QUERIES = [
  "Austin Texas", "ATX", "Barton Springs", "CapMetro",
  "Austin traffic", "Austin heat", "Austin ISD", "Travis County"
];

// X charges per call, so the same ground is covered in two requests using
// OR rather than one request per term. Two calls a morning, every morning.
// Adding a term here is free; adding a query costs a call on every run.
const X_API = "https://api.x.com/2";
const X_QUERIES = [
  '(ATX OR "Austin Texas" OR "Austin, TX") -is:retweet -is:reply lang:en',
  '(CapMetro OR "Barton Springs" OR "Travis County" OR "Austin ISD" OR ' +
    '"Lady Bird Lake" OR "Zilker" OR "Austin City Council") -is:retweet -is:reply lang:en'
];

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

// `npm run voices -- --search "barton springs"` arrives as two separate
// argv entries, because npm re-splits the arguments it forwards. Take
// everything up to the next flag so a multi-word term survives either way.
function strArg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i === process.argv.length - 1) return null;
  const words = [];
  for (let j = i + 1; j < process.argv.length; j++) {
    if (process.argv[j].startsWith("--")) break;
    words.push(process.argv[j]);
  }
  return words.length ? words.join(" ") : null;
}

// Trade the app password for a short-lived token. The password itself is
// never logged, and neither is the token.
async function login() {
  // BSKY_* are the names the last30days skill uses; accept either so one
  // pair of environment variables serves both.
  const identifier = process.env.BLUESKY_HANDLE || process.env.BSKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD || process.env.BSKY_APP_PASSWORD;
  if (!identifier || !password) return null;
  const res = await fetch(`${AUTH_API}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ identifier, password }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.accessJwt) {
    const why = body.error === "AuthenticationRequired"
      ? "handle or app password rejected — check BLUESKY_HANDLE and that the app password is current"
      : `${body.error || res.status}: ${body.message || res.statusText}`;
    throw new Error(why);
  }
  return body.accessJwt;
}

async function searchPosts(token, query, limit) {
  const url = new URL(`${AUTH_API}/app.bsky.feed.searchPosts`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("sort", "latest");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (body.error) throw new Error(`${body.error}: ${body.message || ""}`.trim());
  return (body.posts || []).map((post) => ({ post }));
}

// X search. Needs X_BEARER_TOKEN — an app-only bearer token from the X
// developer portal. Returns items in the same shape as the Bluesky paths so
// everything downstream treats them alike.
async function searchX(query, limit, sinceIso) {
  const url = new URL(`${X_API}/tweets/search/recent`);
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", String(Math.min(Math.max(limit, 10), 100)));
  url.searchParams.set("sort_order", "recency");
  url.searchParams.set("start_time", sinceIso);
  url.searchParams.set("tweet.fields", "created_at,public_metrics");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name");
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
      "User-Agent": USER_AGENT
    },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (res.status === 401) throw new Error("X_BEARER_TOKEN rejected — regenerate it in the X developer portal");
  if (res.status === 429) throw new Error("X rate limit reached");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${body.slice(0, 120)}`.trim());
  }
  const body = await res.json();
  const users = new Map((body.includes?.users || []).map((u) => [u.id, u]));
  return (body.data || []).map((t) => {
    const user = users.get(t.author_id) || {};
    return {
      post: {
        uri: `x:${t.id}`,
        author: { handle: user.username || "unknown", displayName: user.name || "" },
        likeCount: t.public_metrics?.like_count || 0,
        record: { text: t.text, createdAt: t.created_at },
        xUrl: `https://x.com/${user.username || "i"}/status/${t.id}`
      }
    };
  });
}

function isNoise(text) {
  return NOISE.some((re) => re.test(text));
}

function postUrl(post) {
  if (post.xUrl) return post.xUrl;
  return `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop()}`;
}

async function main() {
  const hours = arg("hours", 30);
  const perFeed = arg("limit", 60);
  const minLikes = arg("min-likes", 0);
  const searchTerm = strArg("search");
  const now = Date.now();

  const seen = new Set();
  const candidates = [];
  const skipped = [];
  const sources = [];

  // --- search, when we have a session -------------------------------------
  let token = null;
  try {
    token = await login();
  } catch (err) {
    skipped.push(`search login failed (${err.message})`);
  }
  if (!token && !(process.env.BLUESKY_HANDLE || process.env.BSKY_HANDLE)) {
    sources.push("feeds only — set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD to add search");
  }
  if (!token && searchTerm) {
    console.error("voices: --search needs BLUESKY_HANDLE and BLUESKY_APP_PASSWORD");
    process.exit(1);
  }

  const searchGroups = [];
  if (token) {
    const queries = searchTerm ? [searchTerm] : DEFAULT_QUERIES;
    for (const q of queries) {
      try {
        searchGroups.push({ label: `search:${q}`, items: await searchPosts(token, q, perFeed) });
      } catch (err) {
        skipped.push(`search "${q}" (${err.message})`);
      }
    }
    sources.push(`search on ${queries.length} ${queries.length === 1 ? "query" : "queries"}`);
  }

  // --- X, when a bearer token is present ----------------------------------
  // X bills per request, so this is deliberately two calls a morning (or one
  // when chasing a story with --search). Widen X_QUERIES, not their number.
  if (process.env.X_BEARER_TOKEN) {
    const sinceIso = new Date(now - hours * 3600000).toISOString();
    const xQueries = searchTerm
      ? [`"${searchTerm}" (Austin OR ATX OR Texas) -is:retweet -is:reply lang:en`]
      : X_QUERIES;
    let ok = 0;
    for (const q of xQueries) {
      try {
        searchGroups.push({ label: "X", items: await searchX(q, perFeed, sinceIso) });
        ok++;
      } catch (err) {
        skipped.push(`X search (${err.message})`);
        // A rejected token or a rate limit will not fix itself on the next
        // query — stop rather than spend another billed call to be told so.
        if (/rejected|rate limit/.test(err.message)) break;
      }
    }
    if (ok) sources.push(`X on ${ok} ${ok === 1 ? "query" : "queries"}`);
  }

  // --- the public Austin feeds --------------------------------------------
  const feedGroups = [];
  if (!searchTerm) {
    let discovered = null;
    try {
      discovered = await api("app.bsky.unspecced.getPopularFeedGenerators", {
        query: "austin",
        limit: 25
      });
    } catch (err) {
      skipped.push(`feed discovery (${err.message})`);
    }
    const feeds = (discovered?.feeds || [])
      .filter((f) => /austin/i.test(f.displayName || ""))
      .filter((f) => !SKIP_FEED.test(f.displayName || ""))
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      .slice(0, 6);
    for (const feed of feeds) {
      try {
        const page = await api("app.bsky.feed.getFeed", { feed: feed.uri, limit: perFeed });
        feedGroups.push({ label: feed.displayName, items: page.feed || [] });
      } catch (err) {
        skipped.push(`${feed.displayName} (${err.message})`);
      }
    }
    sources.push(`${feedGroups.length} of ${feeds.length} Austin feeds`);
  }

  if (!searchGroups.length && !feedGroups.length) {
    console.error("voices: no sources available — nothing to show");
    process.exit(1);
  }

  for (const group of [...searchGroups, ...feedGroups]) {
    const feed = { displayName: group.label };
    for (const item of group.items) {
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

  console.log(`Austin voices — ${candidates.length} candidates, last ${hours}h`);
  console.log(`Sources: ${sources.join(" · ")}`);
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
    console.log(`Unavailable this run: ${[...new Set(skipped)].join("; ")}`);
  }
  if (!candidates.length) {
    console.log("No candidates. Widen with --hours, or lower --min-likes.");
  }
}

main().catch((err) => {
  console.error(`voices: ${err.message}`);
  process.exit(1);
});
