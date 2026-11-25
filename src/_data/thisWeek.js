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

// Homepage outcome marks come from homeOutcomes.json, refreshed with each edition.
const homeOutcomes = JSON.parse(readFileSync(new URL("./homeOutcomes.json", import.meta.url), "utf8"));
const outcomes = (homeOutcomes.items || []).map((item) => {
  const sources = Array.isArray(item.sources) ? item.sources : [];
  return {
    id: item.id,
    headline: item.headline || "",
    topic: item.glyph ? "" : (item.topic || ""),
    glyph: item.glyph || "",
    glyphLabel: item.glyph ? (item.glyphLabel || "") : "",
    text: item.text || "",
    // A long label cannot share a phone line with the next source. Stack
    // that row so the separator is not left at the end of a line.
    stackSources: sources.some((source) => String(source.label || "").length > 24),
    sources
  };
});

export default {
  heading: "This week",
  items,
  outcomes,
  outcomesLabel: homeOutcomes.label || "",
  pins: placed,
  pinsJson: JSON.stringify(placed),
  chicagoToday,
  upcomingOnly
};
