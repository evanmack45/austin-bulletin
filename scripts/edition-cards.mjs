// Edition-card view model. Countdown glyphs are a Chicago calendar-day
// count at build time. A date that has passed drops the glyph.

import { countdownGlyph } from "../src/_includes/chicago-date.js";

const SECTION_LABEL = {
  news: "News",
  notices: "Notices",
  next: "Next",
  weather: "Weather"
};

function sectionKey(section) {
  if (section === "good") return "notices";
  return section || "news";
}

function sectionAnchor(key, legacy) {
  if (!legacy) return `h-${key}`;
  if (key === "next") return "the-back-page";
  return key;
}

function placeTimeline(points) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const days = points.map((point) => Number(point.day) || 0);
  const min = Math.min(...days);
  const span = Math.max(...days) - min || 1;
  return points.map((point) => ({
    ...point,
    left: (((Number(point.day) || 0) - min) / span) * 100,
    hi: Boolean(point.hi)
  }));
}

function glyphText(glyph, now) {
  if (!glyph) return { glyphValue: "", glyphQualifier: "" };
  const glyphValue = glyph.countdown
    ? countdownGlyph(glyph.countdown, now)
    : (glyph.value || "");
  const glyphQualifier = glyphValue ? (glyph.qualifier || "") : "";
  return { glyphValue, glyphQualifier };
}

function paragraphs(card) {
  return Array.isArray(card.full)
    ? card.full.map((part) => String(part).trim()).filter(Boolean)
    : [];
}

function splitSentences(text) {
  const months = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
  const titles = "Inc|St|Mr|Dr";
  const masked = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[ap]\.m\./gi, (token) => token.replaceAll(".", "\u0000"))
    .replace(
      new RegExp(`\\b(?:${months}|${titles})\\.`, "g"),
      (token) => `${token.slice(0, -1)}\u0000`
    );
  return masked
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replaceAll("\u0000", ".").trim())
    .filter(Boolean);
}

// Opened scoreboard copy. A full recap wins. The summary is the collapsed
// checker line and is shown only when there is no fuller recap.
function boardRecap(card) {
  const full = paragraphs(card);
  if (full.length) return full;
  const summary = String(card.summary || "").trim();
  if (!summary || summary === String(card.deck || "").trim()) return [];
  return [summary];
}

// Compact Next rows keep the long published paragraphs, plus any summary
// sentence that is not already inside them.
function listRecap(card) {
  const full = paragraphs(card);
  if (!full.length) return [];
  const blob = full.join(" ");
  const summary = String(card.summary || "").trim();
  const extras = summary
    ? splitSentences(summary).filter((sentence) => sentence && !blob.includes(sentence))
    : [];
  return [...extras, ...full];
}

function displayMark(card, glyphValue) {
  const raw = card.mark || glyphValue || card.topic || "";
  return String(raw).replace(/(\d)-(\d)/g, "$1\u2011$2");
}

function decorate(card, index, now) {
  const sources = Array.isArray(card.sources) ? card.sources : [];
  const glyph = glyphText(card.glyph, now);
  const markText = displayMark(card, glyph.glyphValue);
  return {
    ...card,
    index,
    ...glyph,
    markText,
    markQualifier: card.markQualifier || glyph.glyphQualifier,
    markWord: /^[A-Za-z]/.test(markText),
    boardRecap: boardRecap(card),
    listRecap: listRecap(card),
    timeline: placeTimeline(card.timeline),
    shownSources: sources.slice(0, 2),
    moreSources: sources.slice(2),
    signupBefore: false
  };
}

function openSection(key, label, legacy) {
  return {
    key,
    id: sectionAnchor(key, legacy),
    label,
    items: []
  };
}

function scoreboardLayout(sections) {
  const boards = [];
  let nextItems = [];
  let noticeItems = [];
  for (const section of sections) {
    const compactNotice = section.key === "notices"
      && section.items.every((item) => !item.full);
    if (section.key === "next") nextItems = section.items;
    else if (compactNotice) noticeItems = section.items;
    else boards.push(section);
  }
  return { boards, nextItems, noticeItems };
}

function groupSections(body) {
  const sections = [];
  for (const item of body) {
    const key = sectionKey(item.section);
    const label = item.sectionLabel || SECTION_LABEL[key] || "News";
    const last = sections[sections.length - 1];
    const same = last && last.key === key && last.label === label;
    const section = same ? last : openSection(key, label, Boolean(item.legacy));
    if (section !== last) sections.push(section);
    section.items.push(item);
  }
  return sections;
}

export function editionCardModel(cards, now = new Date()) {
  const list = Array.isArray(cards) ? cards : [];
  const indexed = list.map((card, index) => decorate(card, index, now));
  const lead = indexed.find((card) => card.lead) || indexed[0] || null;
  const body = indexed.filter((card) => card !== lead);
  const signupItem = indexed.find((card) => card !== lead && card.index > 2);
  if (signupItem) signupItem.signupBefore = true;
  const sections = groupSections(body);
  return {
    lead,
    sections,
    ...scoreboardLayout(sections),
    signupAtEnd: Boolean(lead) && !signupItem
  };
}
