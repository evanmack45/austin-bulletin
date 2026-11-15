import { readFileSync } from "node:fs";
import { chicagoToday, upcomingOnly } from "../_includes/week-upcoming.js";


const ICONS = {
  water: "drop-bold",
  parks: "tree-bold",
  transit: "bus-bold",
  meeting: "calendar-blank-bold",
  safety: "gavel-bold",
  vote: "bank-bold",
  money: "currency-dollar-bold"
};

const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
  "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

const raw = JSON.parse(readFileSync(new URL("./weekItems.json", import.meta.url), "utf8"));
const editionCards = JSON.parse(readFileSync(new URL("./editionCardData.json", import.meta.url), "utf8"));

function dateLabel(iso) {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

const items = upcomingOnly(raw.map((item) => ({
  ...item,
  iconFile: ICONS[item.icon] || "map-pin-bold",
  dateLabel: dateLabel(item.date)
})));

const pins = [];
for (const item of items) {
  const key = `${Number(item.lat).toFixed(4)},${Number(item.lng).toFixed(4)}`;
  let pin = pins.find((entry) => entry.key === key);
  if (!pin) {
    pin = { key, lat: item.lat, lng: item.lng, location: item.location, items: [] };
    pins.push(pin);
  }
  pin.items.push(item);
}

const placed = pins.map((pin) => ({ ...pin, count: pin.items.length }));

const HOME_LABELS = {
  "county-court-weighs-197-million-in-borrowing-for-2027-projects": ["Vote record", "Video"],
  "kaskade-origin-permit": ["Vote record"]
};

function homeVideoLabel(label) {
  return label === "Meeting video" ? "Video" : label;
}

function homeSources(card) {
  const sources = Array.isArray(card.sources) ? card.sources : [];
  const labels = HOME_LABELS[card.id] || [];
  return sources.map((source, index) => {
    const label = homeVideoLabel(labels[index] || source.label);
    return { ...source, label, shortLabel: label };
  });
}

const outcomes = (editionCards["2026-11-10"]?.cards || [])
  .filter((card) => Number.isInteger(card.outcome))
  .sort((a, b) => a.outcome - b.outcome)
  .map((card) => {
    const sources = homeSources(card);
    // Homepage only. The edition headline still carries "4-0". A non-breaking
    // hyphen keeps the tally in the mark from splitting the way a headline wrap did.
    const kaskade = card.id === "kaskade-origin-permit";
    const glyph = kaskade ? "4\u20110" : (card.glyph?.value || "");
    return {
      id: card.id,
      headline: kaskade ? "Kaskade permit approved" : (card.headline || ""),
      topic: glyph ? "" : (card.topic || ""),
      glyph,
      glyphLabel: glyph ? (card.glyph?.qualifier || "") : "",
      text: card.homeDek || "",
      // A long label cannot share a phone line with the next source. Stack
      // that row so the separator is not left at the end of a line.
      stackSources: sources.some((source) => String(source.label || "").length > 24),
      sources
    };
  });

const OUTCOME_EDITION = "2026-11-10";
const NB_HYPHEN = "\u2011";
const BOARD_ORDER = [
  { role: "a", ids: ["county-court-weighs-197-million-in-borrowing-for-2027-projects"] },
  { role: "b", ids: ["678-million-contract-for-new-star-flight-helicopters-is-up-today"] },
  { role: "c", ids: ["kaskade-origin-permit"] },
  { role: "d", ids: ["county-could-start-work-on-a-2027-bond-election-today"] },
  { role: "e", ids: ["cwep-barton-springs-balcones-briefing", "cwep-pease-park-briefing"] }
];

function cardHref(id) {
  const [year, month, day] = OUTCOME_EDITION.split("-");
  return `/${year}/${month}/${day}/#${id}`;
}

function millionsDollars(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  return Math.round(Number(match[1]) * 1e6);
}

function exactDollars(text) {
  const match = text.match(/\$(\d{1,3}(?:,\d{3})+\.\d+)/);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

function formatMillions(dollars) {
  const millions = Math.round(dollars / 1e5) / 10;
  const body = Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
  return `$${body}M`;
}

function spokenMillions(dollars) {
  return formatMillions(dollars).replace(/M$/, " million");
}

function ratio(part, whole) {
  return (Math.round((part / whole) * 10000) / 10000).toFixed(4);
}

function cardText(card) {
  return [card.summary, card.homeDek, ...(card.full || [])].filter(Boolean).join(" ");
}

function bodyTag(cards) {
  const urls = cards.flatMap((card) => (card.sources || []).map((source) => source.url)).join(" ");
  if (/traviscotx|traviscountytx/.test(urls)) return "County court";
  if (/austintexas\.gov|swagit\.com/.test(urls)) return "Council committee";
  return cards[0].topic || "";
}

function uniqueSources(cards) {
  const seen = new Set();
  const sources = [];
  for (const card of cards) {
    for (const source of homeSources(card)) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      sources.push(source);
    }
  }
  return sources;
}

function barModel(amount, scale, added) {
  const end = ratio(amount, scale);
  const add = added ? ratio(added, scale) : "";
  const base = added ? ratio(amount - added, scale) : end;
  return {
    base,
    add,
    end,
    callout: added ? `+${formatMillions(added)} added` : ""
  };
}

function borrowingFacts(card) {
  const text = cardText(card);
  const added = millionsDollars(text, /raised[^$]{0,80}\$(\d+(?:\.\d+)?)\s*million/i);
  const total = millionsDollars(text, /to\s+\$(\d+(?:\.\d+)?)\s*million/i);
  if (!added || !total) throw new Error(`borrowing figures missing on ${card.id}`);
  const year = (text.match(/\b(20\d{2})\b/) || [])[1];
  const label = year && /borrowing/i.test(card.id) && /approved/i.test(card.headline || "")
    ? `${year} borrowing approved`
    : card.headline;
  return { added, total, label };
}

function contractFacts(card) {
  const text = cardText(card);
  const amount = exactDollars(text);
  if (!amount) throw new Error(`contract amount missing on ${card.id}`);
  const note = /unanimous/i.test(text) && /vote record not posted/i.test(text)
    ? "Called unanimous; vote record not posted"
    : "";
  return { amount, note, label: card.headline };
}

function tallyFacts(card) {
  const vote = (card.headline || "").match(/(\d+)\s*-\s*(\d+)/);
  if (!vote) throw new Error(`vote tally missing on ${card.id}`);
  const yea = Number(vote[1]);
  const nay = Number(vote[2]);
  const text = cardText(card);
  const date = text.match(/Nov\.\s*(\d+)\s*-\s*(\d+)/);
  const note = date && /Approved/i.test(text) && /event/i.test(text)
    ? {
      before: "Approved for",
      date: `Nov.\u00a0${date[1]}${NB_HYPHEN}${date[2]}`,
      after: "event"
    }
    : null;
  const label = (card.headline || "")
    .replace(/,?\s*\d+\s*-\s*\d+/, "")
    .replace(/\s+approved$/i, "")
    .trim();
  return { yea, nay, note, label };
}

function actionFacts(card) {
  const match = (card.headline || "").match(/^(No action) on (.+)$/);
  if (!match) throw new Error(`action mark missing on ${card.id}`);
  const rest = match[2];
  return {
    word: match[1],
    label: rest.charAt(0).toUpperCase() + rest.slice(1),
    note: (card.homeDek || "").replace(/\.$/, "")
  };
}

function rowLabel(card) {
  const text = `${card.headline || ""} ${cardText(card)}`;
  if (text.includes("Barton Springs aquifer")) return "Barton Springs aquifer";
  if (text.includes("Pease Park") && /restoration/i.test(text)) return "Pease Park restoration";
  return card.headline || "";
}

function briefingFacts(group) {
  const text = group.map((card) => `${card.topic || ""} ${cardText(card)}`).join(" ");
  return {
    mark: String(group.length),
    label: /no vote/i.test(text) ? "Briefings, no votes" : "Briefings",
    rows: group.map((card) => ({
      href: cardHref(card.id),
      icon: card.icon || "",
      label: rowLabel(card)
    }))
  };
}

function tileBase(role, group) {
  return {
    role,
    tag: bodyTag(group),
    tagIcon: "",
    markKind: "",
    mark: "",
    bar: null,
    axis: null,
    squares: [],
    tallyLabel: "",
    label: "",
    href: group.length === 1 ? cardHref(group[0].id) : "",
    note: null,
    rows: [],
    sources: uniqueSources(group)
  };
}

function moneyTile(role, card, amount, scale, added, label, aria, note) {
  const tile = tileBase(role, [card]);
  tile.tagIcon = "currency-dollar";
  tile.markKind = "money";
  tile.mark = formatMillions(amount);
  tile.label = label;
  tile.bar = { ...barModel(amount, scale, added), label: aria };
  tile.axis = amount < scale ? ["$0", formatMillions(scale)] : null;
  tile.note = note ? { text: note } : null;
  return tile;
}

function outcomeTile(spec, byId, scale) {
  const group = spec.ids.map((id) => {
    const card = byId.get(id);
    if (!card) throw new Error(`outcome card missing: ${id}`);
    return card;
  });
  if (spec.role === "a") {
    const facts = borrowingFacts(group[0]);
    return { facts, tile: null, scale: facts.total, star: null };
  }
  if (spec.role === "b") {
    const facts = contractFacts(group[0]);
    return { facts, tile: null, scale, star: facts.amount, card: group[0] };
  }
  if (spec.role === "c") {
    const facts = tallyFacts(group[0]);
    const tile = tileBase(spec.role, group);
    tile.tagIcon = group[0].icon || "gavel";
    tile.markKind = "tally";
    tile.mark = `${facts.yea}${NB_HYPHEN}${facts.nay}`;
    tile.squares = Array.from({ length: facts.yea }, (_, index) => index);
    tile.tallyLabel = `${facts.yea} votes for, ${facts.nay} against`;
    tile.label = facts.label;
    tile.note = facts.note;
    return { tile };
  }
  if (spec.role === "d") {
    const facts = actionFacts(group[0]);
    const tile = tileBase(spec.role, group);
    tile.tagIcon = group[0].icon || "bank";
    tile.markKind = "word";
    tile.mark = facts.word;
    tile.label = facts.label;
    tile.note = facts.note ? { text: facts.note } : null;
    return { tile };
  }
  const facts = briefingFacts(group);
  const tile = tileBase(spec.role, group);
  tile.markKind = "count";
  tile.mark = facts.mark;
  tile.label = facts.label;
  tile.href = "";
  tile.rows = facts.rows;
  return { tile };
}

function buildBoard(editionCardsByDate, count) {
  const cards = editionCardsByDate[OUTCOME_EDITION]?.cards || [];
  const byId = new Map(cards.map((card) => [card.id, card]));
  const leadCard = byId.get(BOARD_ORDER[0].ids[0]);
  const starCard = byId.get(BOARD_ORDER[1].ids[0]);
  const lead = borrowingFacts(leadCard);
  const star = contractFacts(starCard);
  const leadAria = `Bar: ${spokenMillions(lead.total)}, including a ${spokenMillions(lead.added)} increase. `
    + `Same scale as the ${spokenMillions(star.amount)} bar below.`;
  const starAria = `Bar: ${spokenMillions(star.amount)}, on the same scale as ${spokenMillions(lead.total)} above.`;
  const tiles = [
    moneyTile("a", leadCard, lead.total, lead.total, lead.added, lead.label, leadAria, ""),
    moneyTile("b", starCard, star.amount, lead.total, 0, star.label, starAria, star.note)
  ];
  for (const spec of BOARD_ORDER.slice(2)) {
    tiles.push(outcomeTile(spec, byId).tile);
  }
  return {
    dateLabel: dateLabel(OUTCOME_EDITION),
    count,
    tiles
  };
}

const board = buildBoard(editionCards, outcomes.length);

export default {
  heading: "This week",
  items,
  outcomes,
  board,
  pins: placed,
  pinsJson: JSON.stringify(placed),
  chicagoToday,
  upcomingOnly
};
