// Edition-card view model. Countdown glyphs are a Chicago calendar-day
// count at build time. A date that has passed drops the glyph.

import { countdownGlyph } from "../src/_includes/chicago-date.js";

const SECTION_LABEL = {
  news: "News",
  notices: "Notices",
  next: "Next"
};

function sectionKey(section) {
  if (section === "good") return "notices";
  return section || "news";
}

function sectionAnchor(key) {
  return `h-${key}`;
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

function decorate(card, index, now) {
  const sources = Array.isArray(card.sources) ? card.sources : [];
  return {
    ...card,
    index,
    ...glyphText(card.glyph, now),
    timeline: placeTimeline(card.timeline),
    shownSources: sources.slice(0, 2),
    moreSources: sources.slice(2),
    signupBefore: false
  };
}

function openSection(key) {
  return {
    key,
    id: sectionAnchor(key),
    label: SECTION_LABEL[key] || "News",
    items: []
  };
}

function groupSections(body) {
  const sections = [];
  for (const item of body) {
    const key = sectionKey(item.section);
    const last = sections[sections.length - 1];
    const section = last && last.key === key ? last : openSection(key);
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
  return {
    lead,
    sections: groupSections(body),
    signupAtEnd: Boolean(lead) && !signupItem
  };
}
