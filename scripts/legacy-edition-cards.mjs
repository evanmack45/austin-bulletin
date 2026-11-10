// Older editions keep their published sentences. This only groups that HTML
// into the edition-card model. Missing fields stay empty.

import { editionSignup } from "./edition-chrome.mjs";
import { topLevelNodes } from "./edition-skim.mjs";
import { plainText } from "./metadata.mjs";
import { slug } from "./river.mjs";

const SECTION_ID = {
  news: "news",
  notices: "notices",
  "the-back-page": "next",
  weather: "weather",
  "the-big-story": "news",
  "the-river": "news",
  "city-desk": "news"
};

function openTag(node) {
  return String(node).match(/^<([a-zA-Z0-9]+)\b([^>]*)>/);
}

function classTokens(node) {
  const attrs = openTag(node)?.[2] ?? "";
  const cls = attrs.match(/\bclass="([^"]*)"/i)?.[1] ?? "";
  return cls.split(/\s+/).filter(Boolean);
}

function hasClass(node, name) {
  return classTokens(node).includes(name);
}

function tagName(node) {
  return openTag(node)?.[1]?.toLowerCase() ?? "";
}

function innerOf(node) {
  const open = openTag(node)?.[0] ?? "";
  const name = tagName(node);
  return String(node).slice(open.length, String(node).length - `</${name}>`.length);
}

function headingOf(node) {
  const match = String(node).trim().match(/^<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>$/i);
  if (!match) return null;
  return {
    level: Number(match[1].slice(1)),
    text: plainText(match[3]),
    id: match[2].match(/\sid="([^"]*)"/i)?.[1] || ""
  };
}

function uniqueId(base, used) {
  const stem = slug(base) || "story";
  let id = stem;
  let n = 2;
  while (used.has(id)) {
    id = `${stem}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function dropSignup(html) {
  return String(html).replace(
    /<section\b[^>]*class="[^"]*\bsignup\b[^"]*"[^>]*>[\s\S]*?<\/section>\s*/gi,
    ""
  );
}

function isSkip(node) {
  const trimmed = String(node).trim();
  if (!trimmed) return true;
  return /^<p\b[^>]*class="[^"]*\bto-top\b/i.test(trimmed);
}

function isRiver(node) {
  return hasClass(node, "river") && !hasClass(node, "river-story");
}

function isHold(node) {
  const info = headingOf(node);
  if (info && info.level === 4) return true;
  if (/^<nav\b/i.test(String(node).trim())) return true;
  return hasClass(node, "brief-slug");
}

function isStoryStart(node) {
  const info = headingOf(node);
  if (info && (info.level === 3 || info.level === 5)) return true;
  return tagName(node) === "p" && classTokens(node).includes("brief");
}

function ritualOf(node) {
  if (hasClass(node, "the-number")) return "number";
  if (hasClass(node, "countdown")) return "countdown";
  if (hasClass(node, "good-thing")) return "good";
  return "";
}

function structuralKind(node) {
  if (isSkip(node)) return "skip";
  if (hasClass(node, "morning-note")) return "note";
  const heading = headingOf(node);
  if (heading && heading.level === 2) return "h2";
  if (hasClass(node, "big-story")) return "lead";
  if (isRiver(node)) return "river";
  return "";
}

function storyKind(node) {
  if (isHold(node)) return "hold";
  if (isStoryStart(node)) return "story";
  if (ritualOf(node)) return "ritual";
  return "text";
}

function kindOf(node) {
  return structuralKind(node) || storyKind(node);
}

function sentenceOf(text) {
  const clean = String(text || "").trim();
  return clean.split(/(?<=[.!?])\s/)[0] || clean;
}

function ritualHeadline(node) {
  const strong = plainText(String(node).match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i)?.[1] || "");
  return sentenceOf(strong || plainText(node));
}

function storyTitle(node) {
  return headingOf(node)?.text || sentenceOf(plainText(node));
}

function sectionFromHeading(info) {
  const id = info.id || slug(info.text);
  if (/^the briefing$/i.test(info.text)) return null;
  const known = SECTION_ID[id];
  if (known) return { section: known, sectionLabel: "" };
  return { section: id || "news", sectionLabel: info.text };
}

function isComment(node) {
  return String(node).trim().startsWith("<!--");
}

function isLeadArt(node) {
  return /^<figure\b/i.test(String(node).trim()) && /\blead-photo\b/.test(String(node));
}

function isHeadingNode(node) {
  return /^<h[1-6]\b/i.test(String(node).trim());
}

function foldBucket(node, ledeTaken, hasHeading) {
  if (isLeadArt(node)) return "art";
  if (ledeTaken) return "more";
  if (isHeadingNode(node) && !hasHeading) return "heading";
  if (!isComment(node)) return "lede";
  return "more";
}

// Headline, art, and the first block stay visible. Later sentences and
// source lines stay in the page, inside the disclosure.
export function foldLegacyCopy(html) {
  const buckets = { heading: [], art: [], lede: [], more: [] };
  let ledeTaken = false;
  for (const node of topLevelNodes(html)) {
    if (!String(node).trim()) continue;
    const bucket = foldBucket(node, ledeTaken, buckets.heading.length > 0);
    buckets[bucket].push(node);
    if (bucket === "lede") ledeTaken = true;
  }
  return {
    headingHtml: buckets.heading.join("\n"),
    artHtml: buckets.art.join("\n"),
    ledeHtml: buckets.lede.join("\n"),
    moreHtml: buckets.more.join("\n")
  };
}

function pushCard(cards, card) {
  const html = card.parts.filter((part) => String(part).trim()).join("\n");
  const text = plainText(html);
  if (!card.headline && !text) return;
  const inHtml = html.includes(`id="${card.id}"`);
  const folded = foldLegacyCopy(html);
  cards.push({
    id: card.id,
    anchor: card.good || inHtml ? "" : card.id,
    legacy: true,
    lead: Boolean(card.lead),
    section: card.section || "news",
    sectionLabel: card.sectionLabel || "",
    headline: card.headline || sentenceOf(text),
    html,
    ...folded,
    good: Boolean(card.good),
    sources: []
  });
}

function closeCard(state) {
  if (!state.current) return;
  pushCard(state.cards, state.current);
  state.current = null;
}

function storyId(id, headline, state) {
  const taken = state.cards.some((card) => card.id === id);
  if (id && !taken) {
    state.used.add(id);
    return id;
  }
  return uniqueId(id || headline, state.used);
}

function startCard(state, headline, id, html, good, closeNow) {
  closeCard(state);
  state.current = {
    id: storyId(id, headline, state),
    lead: !state.leadTaken,
    section: state.section,
    sectionLabel: state.sectionLabel,
    headline,
    good,
    parts: [...state.pending, html]
  };
  state.pending = [];
  state.leadTaken = true;
  if (closeNow) closeCard(state);
}

function absorb(state, node) {
  if (state.current) state.current.parts.push(node);
  else state.pending.push(node);
}

function onH2(state, node) {
  const next = sectionFromHeading(headingOf(node));
  closeCard(state);
  if (!next) {
    state.briefing = true;
    return;
  }
  state.section = next.section;
  state.sectionLabel = next.sectionLabel;
}

function onLead(state, node) {
  const head = topLevelNodes(innerOf(node)).map((part) => part.trim()).find(isStoryStart);
  const info = head ? headingOf(head) : null;
  const headline = info?.text || sentenceOf(plainText(innerOf(node)));
  startCard(state, headline, info?.id || "", innerOf(node), false, true);
}

function onStory(state, node) {
  const info = headingOf(node);
  startCard(state, storyTitle(node), info?.id || "", node, false, false);
}

function onRitual(state, node) {
  const good = ritualOf(node) === "good";
  startCard(state, ritualHeadline(node), good ? "one-good-thing" : "", node, good, false);
}

function onRiver(state, node) {
  walkNodes(state, topLevelNodes(innerOf(node)));
}

function onNote(state, node) {
  state.preface.push(node);
}

function onHold(state, node) {
  state.pending.push(node);
}

const HANDLERS = {
  note: onNote,
  h2: onH2,
  lead: onLead,
  river: onRiver,
  hold: onHold,
  story: onStory,
  ritual: onRitual,
  text: onText
};

function hasSource(node) {
  return /class="[^"]*\b(?:src|source-line)\b/.test(String(node));
}

function isLooseBrief(node) {
  if (tagName(node) !== "p" || !hasSource(node)) return false;
  const blocked = /class="[^"]*\b(?:source-line|if-you|whats-next|good-thing|countdown)\b/;
  return !blocked.test(node);
}

function cardHasSource(card) {
  return Boolean(card && card.parts.some((part) => hasSource(part)));
}

function splitBrief(state, node) {
  if (!isLooseBrief(node)) return false;
  return !state.current || cardHasSource(state.current);
}

function onLooseBrief(state, node) {
  const headline = sentenceOf(plainText(node));
  startCard(state, headline, "", node, false, false);
}

function isSourceLine(node) {
  return tagName(node) === "p" && classTokens(node).includes("source-line");
}

function onSourceLine(state, node) {
  if (state.current) absorb(state, node);
  else onLooseBrief(state, node);
  closeCard(state);
}

function onText(state, node) {
  const paragraph = tagName(node) === "p" && plainText(node);
  if (!state.current && paragraph) {
    onLooseBrief(state, node);
    return;
  }
  absorb(state, node);
}

function applyNode(state, node) {
  if (isSourceLine(node)) {
    onSourceLine(state, node);
    return;
  }
  if (splitBrief(state, node)) {
    onLooseBrief(state, node);
    return;
  }
  const handler = HANDLERS[kindOf(node)];
  if (handler) handler(state, node);
}

function walkNodes(state, nodes) {
  for (const node of nodes) applyNode(state, String(node));
}

function flushPending(state) {
  if (!state.pending.length) return;
  const last = state.cards[state.cards.length - 1];
  if (last) last.html += `\n${state.pending.join("\n")}`;
  else state.preface.push(...state.pending);
}

export function legacyEditionCards(html) {
  const marked = dropSignup(editionSignup(String(html ?? "")));
  const state = {
    cards: [],
    preface: [],
    used: new Set([...marked.matchAll(/\sid="([^"]*)"/gi)].map((match) => match[1])),
    section: "news",
    sectionLabel: "",
    pending: [],
    current: null,
    leadTaken: false,
    briefing: false
  };
  walkNodes(state, topLevelNodes(marked));
  closeCard(state);
  flushPending(state);
  return {
    cards: state.cards,
    preface: state.preface.join("\n"),
    briefing: state.briefing
  };
}
