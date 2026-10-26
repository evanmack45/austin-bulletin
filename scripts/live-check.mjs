// Live check for the two public sites, after a deploy.
// Usage: node scripts/live-check.mjs [--date YYYY-MM-DD] [--site bulletin|ych]
// Exits 0 when every check passes. Not a CI gate.

import { pathToFileURL } from "node:url";
import { chicagoDate } from "./chicago-time.mjs";
import { readableDate, shortMonthDay, weekdayName } from "./edition-dates.mjs";

const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";

const SITES = [
  {
    id: "bulletin",
    home: "https://theaustinbulletin.com/",
    subscribe: "https://theaustinbulletin.com/subscribe/",
    kit: true
  },
  {
    id: "ych",
    home: "https://yallcityhall.org/",
    subscribe: "",
    kit: false
  }
];

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " "
};

const MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};

const DATE_TAGS = ["updated", "published", "pubdate", "date"];
const FEED_ROOTS = new Set(["feed", "rss", "rdf"]);
const KIT_EMBED = /<(?:script|iframe|form)\b[^>]*(?:kit\.com|convertkit\.com)[^>]*>/i;

export function parseIsoDay(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const stamp = new Date(Date.UTC(year, month - 1, day));
  if (stamp.getUTCFullYear() !== year || stamp.getUTCMonth() !== month - 1) return null;
  if (stamp.getUTCDate() !== day) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function expectedDate(override, now = new Date()) {
  if (!override) return chicagoDate(now);
  const day = parseIsoDay(override);
  if (!day) throw new Error(`bad date ${override}`);
  return day;
}

export function dateFormats(iso) {
  const day = parseIsoDay(iso);
  if (!day) throw new Error(`bad date ${iso}`);
  const instant = `${day}T00:00:00.000Z`;
  const masthead = `${weekdayName(instant)}, ${shortMonthDay(instant)}`;
  return {
    bulletin: [masthead],
    ych: [
      `Site built ${readableDate(instant)}`,
      `Updated ${shortMonthDay(instant)}`
    ]
  };
}

function replaceEntity(all, body) {
  if (body[0] !== "#") return NAMED_ENTITIES[body.toLowerCase()] ?? all;
  const hex = body[1] === "x" || body[1] === "X";
  const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
  if (!Number.isFinite(code)) return all;
  return String.fromCodePoint(code);
}

function decodeXml(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, replaceEntity);
}

export function visibleText(html) {
  return decodeXml(String(html ?? ""))
    .replace(/\u00a0/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseIn(text, phrase) {
  const body = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${body}(?!\\d)`).test(text);
}

export function pageShowsDate(html, phrases) {
  const text = visibleText(html);
  return phrases.some((phrase) => phraseIn(text, phrase));
}

function localName(tag) {
  const name = tag.includes(":") ? tag.slice(tag.indexOf(":") + 1) : tag;
  return name.toLowerCase();
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (const match of String(raw).matchAll(re)) {
    attrs[match[1].toLowerCase()] = decodeXml(match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function tokenRe() {
  const comment = "<!--[\\s\\S]*?-->";
  const cdata = "<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>";
  const pi = "<\\?[\\s\\S]*?\\?>";
  const close = "<\\/([A-Za-z0-9:._-]+)\\s*>";
  const open = "<([A-Za-z0-9:._-]+)([^>]*?)(\\/?)\\s*>";
  return new RegExp(`${comment}|${cdata}|${pi}|${close}|${open}`, "g");
}

function classify(match) {
  const raw = match[0];
  if (raw.startsWith("<!--") || raw.startsWith("<?")) return null;
  if (raw.startsWith("<![CDATA[")) return { type: "text", text: match[1] };
  if (match[2]) return { type: "close", name: localName(match[2]) };
  return {
    type: match[5] === "/" ? "empty" : "open",
    name: localName(match[3]),
    attrs: parseAttrs(match[4] || "")
  };
}

function readTokens(xml) {
  const src = String(xml).replace(/^\uFEFF/, "");
  const tokens = [];
  let last = 0;
  for (const match of src.matchAll(tokenRe())) {
    const text = src.slice(last, match.index);
    if (text) tokens.push({ type: "text", text });
    last = match.index + match[0].length;
    const token = classify(match);
    if (token) tokens.push(token);
  }
  if (src.slice(last).trim()) throw new Error("unparsed XML");
  return tokens;
}

function element(name, attrs) {
  return { name, attrs, children: [], text: "" };
}

function closeElement(stack, name) {
  const open = stack.pop();
  if (!open || open.name !== name || !stack.length) {
    throw new Error(`mismatched </${name}>`);
  }
  stack.at(-1).children.push(open);
}

function applyToken(stack, token) {
  if (token.type === "text") {
    stack.at(-1).text += token.text;
    return;
  }
  if (token.type === "open") {
    stack.push(element(token.name, token.attrs));
    return;
  }
  if (token.type === "empty") {
    stack.at(-1).children.push(element(token.name, token.attrs));
    return;
  }
  closeElement(stack, token.name);
}

function parseXml(xml) {
  const root = element("#root", {});
  const stack = [root];
  for (const token of readTokens(xml)) applyToken(stack, token);
  if (stack.length !== 1) throw new Error("unclosed XML");
  if (root.children.length !== 1) throw new Error("XML needs one root");
  return root.children[0];
}

function collectEntries(node, out = []) {
  for (const child of node.children) {
    if (child.name === "entry" || child.name === "item") out.push(child);
    else collectEntries(child, out);
  }
  return out;
}

export function calendarDate(value) {
  const text = decodeXml(String(value ?? "")).trim();
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const day = parseIsoDay(`${iso[1]}-${iso[2]}-${iso[3]}`);
    if (day) return day;
  }
  return rfcDate(text);
}

function rfcDate(text) {
  const match = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase().slice(0, 3)];
  if (!month) return null;
  const day = match[1].padStart(2, "0");
  return parseIsoDay(`${match[3]}-${month}-${day}`);
}

function childByName(node, name) {
  return node.children.find((child) => child.name === name);
}

function tagDate(entry) {
  for (const name of DATE_TAGS) {
    const child = childByName(entry, name);
    const found = child && calendarDate(child.text);
    if (found) return found;
  }
  return "";
}

function firstDate(values) {
  for (const value of values) {
    const found = calendarDate(value);
    if (found) return found;
  }
  return "";
}

function linkDate(entry) {
  const link = childByName(entry, "link");
  const guid = childByName(entry, "guid");
  return firstDate([
    link && link.attrs.href,
    link && link.text,
    guid && guid.text
  ]);
}

function entryRecord(entry) {
  return { date: tagDate(entry) || linkDate(entry) || null };
}

export function parseFeed(xml) {
  const root = parseXml(xml);
  if (!FEED_ROOTS.has(root.name)) throw new Error(`not a feed (${root.name})`);
  return { entries: collectEntries(root).map(entryRecord) };
}

export function newestEntryDate(feed) {
  const dates = feed.entries.map((entry) => entry.date).filter(Boolean).sort();
  return dates.at(-1) ?? null;
}

function quotedAttr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  if (!match) return "";
  return decodeXml(match[2] ?? match[3] ?? "");
}

function feedHref(tag) {
  if (!/\balternate\b/i.test(quotedAttr(tag, "rel"))) return "";
  if (!/application\/(?:atom|rss)\+xml/i.test(quotedAttr(tag, "type"))) return "";
  return quotedAttr(tag, "href");
}

export function alternateFeedUrl(html, pageUrl) {
  const tags = String(html ?? "").match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const href = feedHref(tag);
    if (href) return new URL(href, pageUrl).href;
  }
  return "";
}

export function hasKitEmbed(html) {
  return KIT_EMBED.test(String(html ?? ""));
}

function result(ok, scope, detail) {
  return { ok, line: `${ok ? "PASS" : "FAIL"} ${scope} ${detail}` };
}

function homepageCheck(site, page) {
  if (page.error) return result(false, site.id, `homepage ${page.error}`);
  return result(page.status === 200, site.id, `homepage HTTP ${page.status}`);
}

function bulletinDateline(html) {
  const match = String(html).match(
    /<p\b[^>]*class="[^"]*\bmasthead-dateline\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );
  return match ? match[1] : "";
}

function dateSource(site, html) {
  if (site.id === "bulletin") return bulletinDateline(html);
  return html;
}

function dateCheck(site, html, iso) {
  const phrases = dateFormats(iso)[site.id];
  const hit = phrases.find((phrase) => pageShowsDate(dateSource(site, html), [phrase]));
  if (hit) return result(true, site.id, `date ${hit}`);
  return result(false, site.id, `date missing ${phrases[0]}`);
}

async function load(url, fetchImpl) {
  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xml,*/*" },
      signal: AbortSignal.timeout(20000)
    });
    return { status: response.status, body: await response.text(), error: "" };
  } catch (error) {
    return { status: 0, body: "", error: error.message };
  }
}

async function readFeed(site, html, fetchImpl) {
  const url = alternateFeedUrl(html, site.home);
  if (!url) return result(false, site.id, "feed no alternate link");
  const page = await load(url, fetchImpl);
  if (page.error) return result(false, site.id, `feed ${page.error}`);
  if (page.status !== 200) return result(false, site.id, `feed HTTP ${page.status}`);
  const feed = parseFeed(page.body);
  if (!feed.entries.length) return result(false, site.id, "feed no entries");
  const newest = newestEntryDate(feed);
  if (!newest) return result(false, site.id, "feed no entry date");
  return result(true, site.id, `feed HTTP 200 newest ${newest} ${url}`);
}

async function feedCheck(site, html, fetchImpl) {
  try {
    return await readFeed(site, html, fetchImpl);
  } catch (error) {
    return result(false, site.id, `feed ${error.message}`);
  }
}

async function kitCheck(site, homeHtml, fetchImpl) {
  if (!site.kit) return null;
  if (hasKitEmbed(homeHtml)) return result(true, site.id, "kit embed on homepage");
  const sub = await load(site.subscribe, fetchImpl);
  const found = sub.status === 200 && hasKitEmbed(sub.body);
  if (found) return result(true, site.id, "kit embed on /subscribe/");
  return result(false, site.id, "kit embed missing");
}

async function siteChecks(site, iso, fetchImpl) {
  const home = await load(site.home, fetchImpl);
  const checks = [
    homepageCheck(site, home),
    dateCheck(site, home.body, iso),
    await feedCheck(site, home.body, fetchImpl)
  ];
  const kit = await kitCheck(site, home.body, fetchImpl);
  if (kit) checks.push(kit);
  return checks;
}

function readArg(args, argv, index) {
  const token = argv[index];
  if (token === "--date") return assignArg(args, "date", argv, index);
  if (token === "--site") return assignArg(args, "site", argv, index);
  throw new Error(`unknown argument ${token}`);
}

function assignArg(args, key, argv, index) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${argv[index]} needs a value`);
  args[key] = value;
  return index + 2;
}

export function parseLiveArgs(argv) {
  const args = { date: "", site: "" };
  let index = 0;
  while (index < argv.length) index = readArg(args, argv, index);
  if (args.site && args.site !== "bulletin" && args.site !== "ych") {
    throw new Error("--site must be bulletin or ych");
  }
  if (args.date) expectedDate(args.date);
  return args;
}

function liveOptions(options) {
  const settings = options || {};
  return {
    argv: settings.argv || [],
    now: settings.now || new Date(),
    fetch: settings.fetch || globalThis.fetch,
    log: settings.log || console.log
  };
}

function wantedSites(site) {
  if (!site) return SITES;
  return SITES.filter((item) => item.id === site);
}

async function collectChecks(args, settings) {
  const iso = expectedDate(args.date, settings.now);
  const results = [];
  for (const site of wantedSites(args.site)) {
    results.push(...await siteChecks(site, iso, settings.fetch));
  }
  return results;
}

function report(results, log) {
  for (const item of results) log(item.line);
  const failed = results.some((item) => !item.ok);
  return failed ? 1 : 0;
}

export async function runLiveCheck(options) {
  const settings = liveOptions(options);
  try {
    const args = parseLiveArgs(settings.argv);
    return report(await collectChecks(args, settings), settings.log);
  } catch (error) {
    settings.log(`FAIL live-check ${error.message}`);
    return 1;
  }
}

function isDirectRun() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isDirectRun()) {
  runLiveCheck({ argv: process.argv.slice(2) }).then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.log(`FAIL live-check ${error.message}`);
    process.exitCode = 1;
  });
}
