import { readFileSync } from "node:fs";

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

// Held until the $197,125,000 certificates-of-obligation item is verified.
const HELD = "Court weighs $197 million in certificates";

const raw = JSON.parse(readFileSync(new URL("./weekItems.json", import.meta.url), "utf8"));

function dateLabel(iso) {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

const items = raw.filter((item) => item.headline !== HELD).map((item) => ({
  ...item,
  iconFile: ICONS[item.icon] || "map-pin-bold",
  dateLabel: dateLabel(item.date)
}));

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

export default {
  heading: "This week",
  held: HELD,
  items,
  pins: placed,
  pinsJson: JSON.stringify(placed)
};
