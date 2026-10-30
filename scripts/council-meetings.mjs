// Links a Bulletin item about one Austin City Council or council committee
// meeting to that meeting's page on Y'all City Hall. The line is added at
// build time. Story text is not edited.
//
// A page is linked only when Y'all City Hall lists it (meetings feed, the
// meetings index, or the sitemap) and that URL returns HTTP 200.
// An item can name its meeting with <!-- desk:meeting YYYY-MM-DD -->.
// Otherwise the item has to say, in one sentence, that council or a council
// committee met, voted, or took up an agenda on a date we can resolve.

import { shortMonthDay } from "./edition-dates.mjs";

const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const SOURCES = [
  "https://yallcityhall.org/meetings/feed.xml",
  "https://yallcityhall.org/meetings/",
  "https://yallcityhall.org/sitemap-0.xml"
];
const MARKER = /<!--\s*desk:meeting\s+(\d{4}-\d{2}-\d{2})\s*-->/;
const MONTH = "(January|February|March|April|May|June|July|August|September|" +
  "October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)";
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const VOID_TAGS = new Set(["br", "hr", "img", "meta", "link", "input", "source", "wbr"]);
const MONTH_NUMBER = new Map([
  ["january", 1], ["jan", 1], ["february", 2], ["feb", 2], ["march", 3], ["mar", 3],
  ["april", 4], ["apr", 4], ["may", 5], ["june", 6], ["jun", 6], ["july", 7], ["jul", 7],
  ["august", 8], ["aug", 8], ["september", 9], ["sept", 9], ["sep", 9],
  ["october", 10], ["oct", 10], ["november", 11], ["nov", 11], ["december", 12], ["dec", 12]
]);
let pending = null;

export function meetingUrl(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("bad meeting date");
  return `https://yallcityhall.org/meetings/${date}/`;
}

export function meetingDatesIn(text) {
  const re = /\/meetings\/(\d{4}-\d{2}-\d{2})\//g;
  return [...new Set([...String(text).matchAll(re)].map((match) => match[1]))];
}

export function councilDidParagraph(date) {
  const label = shortMonthDay(`${date}T00:00:00Z`);
  const href = meetingUrl(date);
  const text = `${label} meeting on Y'all City Hall`;
  return `<p class="council-did">What council did: see the <a href="${href}">${text}</a>.</p>`;
}

export function previewMeetingDate(url) {
  const match = String(url || "").match(/^\/council\/(\d{4}-\d{2}-\d{2})-preview\/?$/);
  return match ? match[1] : "";
}

export function pageMeetingDate(url, councilMeeting) {
  const fromUrl = previewMeetingDate(url);
  if (fromUrl) return fromUrl;
  if (/^\/\d{4}\/\d{2}\/\d{2}\/?$/.test(String(url || ""))) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(String(councilMeeting || "")) ? String(councilMeeting) : "";
}

export function meetingDateForItem(raw, editionDate, liveDates) {
  const live = liveDates instanceof Set ? liveDates : new Set(liveDates || []);
  const marked = String(raw || "").match(MARKER);
  if (marked) return live.has(marked[1]) ? marked[1] : "";
  const date = inferMeetingDate(raw, editionDate);
  return date && live.has(date) ? date : "";
}

export function inferMeetingDate(text, editionDate) {
  const edition = String(editionDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(edition)) return "";
  const visible = visibleItemText(text);
  return chooseMeetingDate(actionSentences(visible), visible, edition);
}

function chooseMeetingDate(sentences, visible, edition) {
  if (sentences.some(meetingIsToday)) return edition;
  const explicit = rankedExplicit(sentences, edition);
  if (explicit) return explicit;
  const weekdays = sentences.flatMap((sentence) => weekdayDates(sentence, edition));
  if (weekdays.length) return closestDate(weekdays, edition);
  const loose = agendaWeekday(visible, edition);
  if (loose) return loose;
  return sentences.some(isPresentMeeting) ? edition : "";
}

export function withCouncilMeetingLinks(html, editionDate, liveDates) {
  const live = liveDates instanceof Set ? liveDates : new Set(liveDates || []);
  const edition = String(editionDate || "").slice(0, 10);
  const stories = mapElements(String(html ?? ""), "section", "big-story", (inner) =>
    annotateBlock(inner, edition, live));
  return mapElements(stories, "div", "river", (inner) => annotateRiver(inner, edition, live));
}

export function withPreviewMeetingHtml(html, url, councilMeeting, liveDates) {
  const live = liveDates instanceof Set ? liveDates : new Set(liveDates || []);
  const date = pageMeetingDate(url, councilMeeting);
  if (!date || !live.has(date)) return html;
  if (String(html).includes('class="council-did"')) return html;
  const line = `\n${councilDidParagraph(date)}\n`;
  const placed = String(html).replace(/(<\/h[12]>)/i, `$1${line}`);
  return placed === String(html) ? `${line}${html}` : placed;
}

export async function loadLiveMeetings({ fetchImpl = fetch } = {}) {
  const catalog = new Set();
  for (const url of SOURCES) await addListedDates(catalog, url, fetchImpl);
  const live = new Set();
  await mapPool([...catalog], 8, async (date) => {
    if (await meetingReturns200(date, fetchImpl)) live.add(date);
  });
  return live;
}

export function cachedLiveMeetings() {
  if (!pending) {
    pending = loadLiveMeetings().then((live) => {
      console.log(`ych meetings: ${live.size} pages returned 200`);
      return live;
    }).catch((err) => {
      console.warn(`ych meetings: ${err.message}`);
      return new Set();
    });
  }
  return pending;
}

async function addListedDates(catalog, url, fetchImpl) {
  try {
    const res = await request(url, fetchImpl, "GET");
    if (!res || res.status !== 200) {
      console.warn(`ych meetings: skipped ${url} (${res ? res.status : "error"})`);
      return;
    }
    for (const date of meetingDatesIn(await res.text())) catalog.add(date);
  } catch (err) {
    console.warn(`ych meetings: skipped ${url} (${err.message})`);
  }
}

export async function meetingReturns200(date, fetchImpl = fetch) {
  const url = meetingUrl(date);
  const res = await liveResponse(url, fetchImpl);
  if (!res || res.status !== 200) return false;
  try {
    const path = new URL(res.url || url).pathname.replace(/\/+$/, "");
    return path === `/meetings/${date}`;
  } catch {
    return false;
  }
}

async function liveResponse(url, fetchImpl) {
  const head = await request(url, fetchImpl, "HEAD");
  if (!head) return null;
  if (head.status === 200 || head.status === 404 || head.status === 410) return head;
  return request(url, fetchImpl, "GET");
}

async function request(url, fetchImpl, method) {
  try {
    const res = await fetchImpl(url, {
      method,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml,*/*" },
      signal: AbortSignal.timeout(12000)
    });
    if (method !== "GET") await res.body?.cancel?.().catch(() => {});
    return res;
  } catch {
    return null;
  }
}

async function mapPool(items, limit, fn) {
  if (!items.length) return;
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await fn(items[index], index);
    }
  });
  await Promise.all(workers);
}

function visibleItemText(html) {
  return String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|#38);/g, "&")
    .replace(/&(?:nbsp|#160);/g, " ")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function mentionsToday(sentence) {
  return /\b(?:today|this morning|tonight)\b/i.test(sentence);
}

function meetingIsToday(sentence) {
  return mentionsToday(sentence) && !hasWeekday(sentence);
}

function hasWeekday(sentence) {
  return /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(sentence);
}

function actionSentences(text) {
  return splitSentences(text).map(normalizeSentence).filter(isActionSentence);
}

function splitSentences(text) {
  const masked = text
    .replace(/\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\./g, (token) =>
      `${token.slice(0, -1)}§`)
    .replace(/\b[ap]\.m\./gi, (token) => token.replaceAll(".", "§"));
  return masked.split(/(?<=[.!?])\s+/)
    .map((part) => part.replaceAll("§", ".").trim())
    .filter(Boolean);
}

function normalizeSentence(sentence) {
  const otherCity = new RegExp(
    "\\b(?:Kyle|Bee Cave|Pflugerville|Round Rock|Cedar Park|Leander|Georgetown|" +
    "San Marcos|Buda|Lakeway|Sunset Valley|West Lake Hills|Rollingwood|Manor|" +
    "Elgin|Hutto|Taylor)(?:'s|’s)?(?: City)? Council\\b",
    "g"
  );
  return sentence
    .replace(otherCity, " ")
    .replace(nonMeetingCouncil, " ")
    .replace(/\bCouncil (?:Member|Members)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const nonMeetingCouncil = new RegExp(
  "\\bCity Council (?:race|races|candidate|candidates|seat|seats|election|" +
  "elections|district|districts|campaign|campaigns)\\b",
  "gi"
);
const ACTION = new RegExp(
  "\\b(?:agendas?|meetings?|meets|voted|votes|vote|approved|approves|passed|" +
  "considers|consider|adopted|directed|takes up|public hearing|consent|pulled)\\b",
  "i"
);
const COUNCIL_NEAR = new RegExp(
  "\\b(?:Austin City Council|City Council|Council|agendas?|meetings?|" +
  "voted|votes|vote|passed|meets|directed)\\b",
  "i"
);

function isActionSentence(sentence) {
  if (isCommitteeSentence(sentence)) return true;
  if (!namesCouncil(sentence)) return false;
  if (/\btold Council\b/.test(sentence)) return true;
  return ACTION.test(sentence);
}

function isCommitteeSentence(sentence) {
  if (!/\b(?:committee meeting|council committee)\b/i.test(sentence)) return false;
  const school = /\b(?:school board|AISD|school district)\b/i.test(sentence);
  if (school && !/\bCouncil\b/.test(sentence)) return false;
  return /\b(?:Austin|City|Council|city officials)\b/.test(sentence);
}

function namesCouncil(sentence) {
  if (/\b(?:Austin City Council|City Council)\b/.test(sentence)) return true;
  const stripped = sentence
    .replace(/\b(?:Electric )?Reliability Council(?: of Texas)?\b/g, " ")
    .replace(/\bCouncil of (?:Texas|Governments)\b/g, " ")
    .replace(/\bAustin Council of\b/g, " ");
  return /\bCouncil\b/.test(stripped);
}

function isPresentMeeting(sentence) {
  const text = normalizeSentence(sentence);
  if (!namesCouncil(text) || pastAction(text)) return false;
  const present = "agenda|votes|will consider|considers|set to vote|takes up|public hearing";
  return new RegExp(`\\b(?:${present}|item \\d+)\\b`, "i").test(text);
}

function pastAction(sentence) {
  const cleaned = sentence
    .replace(/\b(?:has|have|had) not (?:yet )?(?:been )?approved\b/gi, " ")
    .replace(/\bnot (?:yet )?approved\b/gi, " ");
  return /\b(?:voted|approved|passed|adopted|directed|pulled)\b/i.test(cleaned);
}

function rankedExplicit(sentences, edition) {
  const groups = { past: [], rest: [] };
  for (const sentence of sentences) {
    const dates = explicitDates(sentence, edition);
    const bucket = pastAction(sentence) ? "past" : "rest";
    if (dates.length) groups[bucket].push(...dates);
  }
  if (groups.past.length) return closestDate(groups.past, edition);
  return groups.rest.length ? closestDate(groups.rest, edition) : "";
}

function explicitDates(sentence, edition) {
  const found = [];
  const re = new RegExp(
    `\\b${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`,
    "g"
  );
  for (const match of sentence.matchAll(re)) {
    if (!dateNearCouncil(sentence, match.index, match[0].length)) continue;
    const iso = dateFromMatch(match, edition);
    if (iso) found.push(iso);
  }
  return found;
}

function dateNearCouncil(sentence, start, length) {
  // 120 covers "City Council and the Austin Housing Finance Corporation
  // approved … on Oct. 22". The short window after the date keeps a league
  // end date from sticking to "approved by City Council" later in the sentence.
  const before = sentence.slice(Math.max(0, start - 120), start);
  const after = sentence.slice(start + length, start + length + 24);
  return COUNCIL_NEAR.test(before) || COUNCIL_NEAR.test(after);
}

function agendaWeekday(text, edition) {
  if (!/\bCity Council\b/.test(text)) return "";
  const dated = splitSentences(text)
    .map(normalizeSentence)
    .filter((sentence) => /\bagenda\b/i.test(sentence))
    .filter((sentence) => !/\b(?:school board|AISD)\b/i.test(sentence))
    .flatMap((sentence) => weekdayDates(sentence, edition));
  return dated.length ? closestDate(dated, edition) : "";
}

function dateFromMatch(match, edition) {
  const month = MONTH_NUMBER.get(match[1].toLowerCase());
  const inferred = !match[3];
  const year = inferred ? Number(edition.slice(0, 4)) : Number(match[3]);
  const iso = isoFromParts(year, month, Number(match[2]));
  if (!iso || (inferred && !inWindow(iso, edition))) return "";
  return iso;
}

function isoFromParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return valid ? date.toISOString().slice(0, 10) : "";
}

function inWindow(iso, edition) {
  const delta = dayNumber(iso) - dayNumber(edition);
  return delta >= -200 && delta <= 45;
}

function dayNumber(iso) {
  return Date.parse(`${iso}T00:00:00Z`) / 86400000;
}

function closestDate(dates, edition) {
  const origin = dayNumber(edition);
  return dates.reduce((best, iso) =>
    Math.abs(dayNumber(iso) - origin) < Math.abs(dayNumber(best) - origin) ? iso : best);
}

function weekdayDates(sentence, edition) {
  if (explicitDates(sentence, edition).length) return [];
  const found = [];
  const day = "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday";
  const re = new RegExp(`\\b(?:(last|next|this)\\s+)?(${day})(?:'s|’s)?\\b`, "g");
  for (const match of sentence.matchAll(re)) {
    found.push(shiftWeekday(edition, match[2], weekdayDirection(sentence, match[1])));
  }
  return found.filter(Boolean);
}

function weekdayDirection(sentence, qualifier) {
  if (qualifier === "last") return "past";
  if (qualifier === "next" || qualifier === "this") return "future";
  if (pastAction(sentence)) return "past";
  const upcoming = "agendas?|will consider|considers|set to vote|votes|meets|meetings?|takes up";
  if (new RegExp(`\\b(?:${upcoming})\\b`, "i").test(sentence)) {
    return "future";
  }
  return "nearest";
}

function shiftWeekday(edition, name, direction) {
  const current = new Date(`${edition}T00:00:00Z`).getUTCDay();
  const target = WEEKDAYS.indexOf(name.toLowerCase());
  if (target < 0) return "";
  const date = new Date(`${edition}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + adjustDelta(target - current, direction));
  return date.toISOString().slice(0, 10);
}

function adjustDelta(delta, direction) {
  if (direction === "past" && delta > 0) return delta - 7;
  if (direction === "future" && delta < 0) return delta + 7;
  if (direction !== "nearest") return delta;
  if (delta > 3) return delta - 7;
  return delta < -3 ? delta + 7 : delta;
}

function annotateBlock(inner, edition, live) {
  if (inner.includes('class="council-did"')) return inner;
  const date = meetingDateForItem(inner, edition, live);
  if (!date) return inner;
  return `${inner.replace(/\s*$/, "")}\n${councilDidParagraph(date)}\n`;
}

function annotateRiver(inner, edition, live) {
  const state = {
    out: [], bucket: [], mode: "beat", pending: "",
    dateFor: (html) => meetingDateForItem(html, edition, live)
  };
  for (const node of topLevelNodes(inner)) absorb(state, node);
  flush(state);
  return state.out.join("");
}

function isLooseMarker(node) {
  return MARKER.test(node) && !/^<[a-z]/i.test(node.trim());
}

function absorb(state, node) {
  if (isLooseMarker(node)) return holdMarker(state, node);
  return absorbElement(state, node);
}

function absorbElement(state, node) {
  const kind = nodeKind(node);
  if (kind === "boundary") return boundary(state, node);
  if (kind === "lead") return startLead(state, node);
  if (kind === "p" && state.mode !== "lead") return startItem(state, node);
  return keepOrEmit(state, node);
}

function keepOrEmit(state, node) {
  if (state.mode === "lead" || state.bucket.length) state.bucket.push(node);
  else state.out.push(node);
  return state;
}

function holdMarker(state, node) {
  if (state.mode === "lead" || state.bucket.length) state.bucket.push(node);
  else state.pending += node;
  return state;
}

function boundary(state, node) {
  flush(state);
  state.out.push(node);
  if (/^<h4\b/i.test(node)) state.mode = "beat";
  else if (/brief-slug/.test(node)) state.mode = "briefs";
  return state;
}

function startLead(state, node) {
  flush(state);
  state.mode = "lead";
  state.bucket = [state.pending + node];
  state.pending = "";
  return state;
}

function startItem(state, node) {
  flush(state);
  state.bucket = [state.pending + node];
  state.pending = "";
  return state;
}

function flush(state) {
  if (!state.bucket.length) return;
  const html = state.bucket.join("");
  state.out.push(html);
  const date = state.dateFor(html);
  if (date && !html.includes('class="council-did"')) state.out.push(councilDidParagraph(date));
  state.bucket = [];
}

function nodeKind(node) {
  if (/^<(?:nav|h4)\b/i.test(node)) return "boundary";
  if (/^<p\b[^>]*class="[^"]*\b(?:brief-slug|to-top)\b/i.test(node)) return "boundary";
  if (/^<h5\b/i.test(node)) return "lead";
  if (/^<p\b/i.test(node)) return "p";
  return "other";
}

function mapElements(html, tag, className, renderInner) {
  const re = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, "gi");
  let out = "";
  let last = 0;
  for (let match = re.exec(html); match; match = re.exec(html)) {
    const openEnd = html.indexOf(">", match.index);
    const close = matchingClose(html, openEnd + 1, tag);
    const inner = html.slice(openEnd + 1, close.closeAt);
    const rendered = renderInner(inner);
    out += html.slice(last, openEnd + 1) + rendered + html.slice(close.closeAt, close.end);
    last = close.end;
    re.lastIndex = close.end;
  }
  return out + html.slice(last);
}

function matchingClose(html, from, name) {
  const token = new RegExp(`<(/?)${name}\\b[^>]*>`, "gi");
  token.lastIndex = from;
  let depth = 1;
  for (let match = token.exec(html); match; match = token.exec(html)) {
    const closing = match[1] === "/";
    if (!closing && /\/\s*>$/.test(match[0])) continue;
    depth += closing ? -1 : 1;
    if (depth === 0) return { closeAt: match.index, end: match.index + match[0].length };
  }
  return { closeAt: html.length, end: html.length };
}

export function topLevelNodes(html) {
  const nodes = [];
  const source = String(html ?? "");
  let index = 0;
  while (index < source.length) index = pushNode(source, index, nodes);
  return nodes;
}

function tagName(open) {
  const match = open.match(/^<([a-zA-Z0-9]+)/);
  return match ? match[1].toLowerCase() : "";
}

function isVoidOpen(open, name) {
  if (!name || VOID_TAGS.has(name)) return true;
  return /\/\s*>$/.test(open);
}

function pushNode(source, index, nodes) {
  if (source[index] !== "<") return pushText(source, index, nodes);
  if (source.startsWith("<!--", index)) return pushComment(source, index, nodes);
  return pushElement(source, index, nodes);
}

function pushElement(source, index, nodes) {
  const openEnd = source.indexOf(">", index);
  if (openEnd === -1) {
    nodes.push(source.slice(index));
    return source.length;
  }
  const open = source.slice(index, openEnd + 1);
  const name = tagName(open);
  if (isVoidOpen(open, name)) {
    nodes.push(open);
    return openEnd + 1;
  }
  const close = matchingClose(source, openEnd + 1, name);
  nodes.push(source.slice(index, close.end));
  return close.end;
}

function pushText(source, index, nodes) {
  const next = source.indexOf("<", index);
  const end = next === -1 ? source.length : next;
  const text = source.slice(index, end);
  if (text.trim()) nodes.push(text);
  return end;
}

function pushComment(source, index, nodes) {
  const end = source.indexOf("-->", index);
  const close = end === -1 ? source.length : end + 3;
  nodes.push(source.slice(index, close));
  return close;
}
