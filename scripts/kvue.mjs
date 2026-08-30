// Read a KVUE story through its licensed MSN syndication, when MSN has it.
//
// Usage:
//   node scripts/kvue.mjs <kvue-article-url>
//   node scripts/kvue.mjs --headline "<exact or close headline text>"
//
// Why this exists: kvue.com article pages 403 every automated client behind
// an Akamai/HUMAN bot wall (docs/reviews/kvue-access-research-2026-08-30.md).
// KVUE syndicates to an official "KVUE-TV Austin" MSN channel, and MSN's own
// content API is open. This tool finds a KVUE story's MSN copy and prints
// the licensed full text so the daily writer can verify facts against it —
// it is a research aid, not a publishing path; EDITORIAL's relay rules still
// govern what actually runs.
//
// HARD RULES, enforced by what this file fetches:
//   - Never touches any kvue.com path except its two RSS feeds and its
//     robots.txt. robots.txt disallows only /ajax/, /search/ and monitor
//     paths — this script uses neither, only /feeds/syndication/rss/*.
//   - Every request carries the honest UA below. Never a browser UA, never
//     headless-browser automation, never bot-wall evasion.
//
// DISCOVERY ROUTE (how a KVUE story becomes an MSN ar-ID):
//   Bing News search, RSS output: bing.com/news/search?q=...&format=RSS.
//   www.bing.com/robots.txt disallows "/search" for user-agent "*" but has
//   no rule at all for "/news" or "/news/search" (checked live 2026-08-30;
//   grepping the fetched robots.txt for "news" is empty) — a materially
//   different, unblocked path, not the disallowed one. It returns a plain
//   200 RSS response to plain `fetch` with the honest UA, no challenge.
//
//   Rejected: html.duckduckgo.com/html (also robots-clean, "Allow: /").
//   It worked for the first few live queries during development (3/3 exact
//   hits) but then started returning HTTP 202 with an "anomaly-modal"
//   CAPTCHA page to the same UA from the same IP — a bot wall that robots.txt
//   does not disclose. Bing News search never did this in testing and needs
//   no extra binary (curl) the way working around that wall would have.
//
// MSN CONTENT API: assets.msn.com/content/view/v2/Detail/en-us/<ar-id>.
// assets.msn.com serves no robots.txt at all (fetching it 404s with an XML
// "OutOfRangeInput" error body, not a robots file) — nothing disallows it.
// Returns JSON with title, authors, body (HTML), sourceHref (the original
// station URL) and timestamps. Plain `fetch`, honest UA, no dependencies.
//
// A result is accepted only when its sourceHref host is kvue.com AND its
// title closely matches the headline being searched for. If the input was a
// KVUE URL, sourceHref must also equal it (path match, query ignored) or the
// body is withheld as unverified — see printReport.
//
// See PIPELINE.md Step 1 and docs/reviews/kvue-access-research-2026-08-30.md.

import { pathToFileURL } from "node:url";

const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const TIMEOUT_MS = 20000;

const KVUE_FEEDS = [
  "https://www.kvue.com/feeds/syndication/rss/news/local",
  "https://www.kvue.com/feeds/syndication/rss/news"
];

const AR_ID_RE = /ar-(AA[0-9A-Za-z]{4,10})\b/g;
const CURLY_QUOTES = { "’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-" };
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", hellip: "…"
};

class NetworkFailure extends Error {
  constructor(url, status) {
    super(`${status} for ${url}`);
    this.url = url;
    this.status = status;
  }
}

class UsageError extends Error {}

// ---- Pure helpers (tested in tests/kvue.test.mjs, no network) ----

// Every distinct MSN article id ("AA2bbLQl") found in a blob of HTML or in a
// bare URL, in first-appearance order. MSN ids observed in the wild are
// always "AA" plus 6 alphanumeric characters; the length bound also keeps
// this from matching short, unrelated "ar-xx" locale fragments (e.g. a page
// footer's "ar-es" link) that are not ids at all.
export function extractArIds(text) {
  if (!text) return [];
  const seen = new Set();
  const out = [];
  for (const m of text.matchAll(AR_ID_RE)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

export function normalizeTitle(s) {
  if (!s) return "";
  let t = String(s);
  for (const [from, to] of Object.entries(CURLY_QUOTES)) t = t.split(from).join(to);
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function titlesMatch(a, b) {
  const na = normalizeTitle(a);
  return na.length > 0 && na === normalizeTitle(b);
}

// Same article, ignoring query string, trailing slash, and a leading "www."
export function sameArticleUrl(a, b) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const host = (u) => u.hostname.replace(/^www\./i, "").toLowerCase();
    const path = (u) => u.pathname.replace(/\/$/, "");
    return host(ua) === host(ub) && path(ua) === path(ub);
  } catch {
    return false;
  }
}

export function isKvueHost(urlString) {
  try {
    return new URL(urlString).hostname.replace(/^www\./i, "").toLowerCase() === "kvue.com";
  } catch {
    return false;
  }
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : m));
}

function cleanFragment(fragment) {
  return decodeEntities(fragment.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

// MSN's body HTML is <p> paragraphs interleaved with standalone <img>/<video>
// placeholders that carry no article text. Stripping tags inside each <p>
// (rather than pre-removing images) handles both cases uniformly: a
// standalone image between paragraphs is simply outside any <p> match, and
// an image nested inside one drops out with every other tag.
export function htmlBodyToText(html) {
  if (!html) return "";
  const matches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  const paragraphs = matches.map((m) => cleanFragment(m[1]));
  const blocks = paragraphs.length ? paragraphs : [cleanFragment(html)];
  return blocks.filter((p) => p.length > 0).join("\n\n");
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

export function parseRssItems(xml) {
  if (!xml) return [];
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return blocks
    .map((block) => ({
      title: decodeEntities(extractTag(block, "title")),
      link: decodeEntities(extractTag(block, "link"))
    }))
    .filter((item) => item.link);
}

export function findFeedItemForUrl(items, url) {
  return items.find((item) => sameArticleUrl(item.link, url)) || null;
}

export function buildSearchQuery(headline) {
  return `${String(headline).trim()} site:msn.com`;
}

// ---- Network (not unit-tested; exercised by the live verification runs) ----

async function fetchText(url) {
  let res;
  try {
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    res = await fetch(url, { headers: { "User-Agent": UA }, signal });
  } catch (err) {
    throw new NetworkFailure(url, `network error (${err.message})`);
  }
  if (!res.ok) throw new NetworkFailure(url, res.status);
  return res.text();
}

async function deriveHeadlineFromUrl(url) {
  const items = [];
  for (const feed of KVUE_FEEDS) {
    items.push(...parseRssItems(await fetchText(feed)));
  }
  const found = findFeedItemForUrl(items, url);
  return found ? found.title : null;
}

async function searchMsnCandidates(headline) {
  const query = encodeURIComponent(buildSearchQuery(headline));
  const text = await fetchText(`https://www.bing.com/news/search?q=${query}&format=RSS`);
  return extractArIds(text);
}

// Tolerant of failure per candidate: an expired/removed MSN id (410, 404) is
// an ordinary outcome of trying several search results, not a tool failure.
async function fetchMsnDetail(id) {
  try {
    const res = await fetch(`https://assets.msn.com/content/view/v2/Detail/en-us/${id}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function findMsnMatch(headline, ids) {
  for (const id of ids) {
    const detail = await fetchMsnDetail(id);
    if (!detail || !detail.sourceHref) continue;
    if (isKvueHost(detail.sourceHref) && titlesMatch(detail.title, headline)) {
      return { id, detail };
    }
  }
  return null;
}

// ---- CLI ----

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--headline") args.headline = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

function printReport(id, detail, { verified }) {
  console.log(`Title: ${detail.title}`);
  const authors = (detail.authors || []).map((a) => a.name).filter(Boolean).join(", ");
  console.log(`Authors: ${authors || "unknown"}`);
  console.log(`Published: ${detail.publishedDateTime || "unknown"}`);
  console.log(`Updated: ${detail.updatedDateTime || detail.publishedDateTime || "unknown"}`);
  console.log(`MSN id: ar-${id}`);
  console.log(`sourceHref: ${detail.sourceHref}`);
  console.log("");
  if (!verified) {
    console.log("NOT VERIFIED: sourceHref does not match the given KVUE URL.");
    console.log("Not printing the body — this MSN story may not be the same story.");
    return;
  }
  console.log(htmlBodyToText(detail.body));
}

function reportNoMatch(headline, candidateCount) {
  console.log(`kvue: "${headline}" — not on MSN (or not yet); fall back to the relay rules`);
  if (candidateCount > 0) {
    console.log(`(${candidateCount} MSN candidate(s) checked, none matched by outlet + title)`);
  }
}

async function resolveHeadline(inputUrl, headline) {
  if (inputUrl && !isKvueHost(inputUrl)) {
    throw new UsageError(`expected a kvue.com article URL, got: ${inputUrl}`);
  }
  if (!inputUrl && !headline) {
    throw new UsageError('give a kvue.com article URL or --headline "<text>"');
  }
  if (!inputUrl) return headline;
  const derived = await deriveHeadlineFromUrl(inputUrl);
  if (!derived) {
    throw new UsageError(`could not find ${inputUrl} in KVUE's RSS feeds; pass --headline instead`);
  }
  return derived;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputUrl = args._[0];

  try {
    const headline = await resolveHeadline(inputUrl, args.headline);
    const ids = await searchMsnCandidates(headline);
    const match = ids.length ? await findMsnMatch(headline, ids) : null;

    if (!match) {
      reportNoMatch(headline, ids.length);
      return;
    }

    const verified = inputUrl ? sameArticleUrl(match.detail.sourceHref, inputUrl) : true;
    printReport(match.id, match.detail, { verified });
  } catch (err) {
    if (err instanceof NetworkFailure) {
      console.error(`kvue: network failure — ${err.status} for ${err.url}`);
    } else {
      console.error(`kvue: ${err.message}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
