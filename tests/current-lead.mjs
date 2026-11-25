// The homepage follows the newest edition that has card data. Tests written
// against one day's homepage are skipped once a newer edition leads, so a new
// edition does not need test edits; tests/home-current-lead.test.mjs checks
// whatever edition currently leads.
import { readFileSync } from "node:fs";

const file = new URL("../src/_data/editionCardData.json", import.meta.url);
const cards = JSON.parse(readFileSync(file, "utf8"));

export const LEAD_DATE = Object.keys(cards)
  .filter((date) => cards[date]?.cards?.some((card) => card.lead))
  .sort()
  .at(-1);

export const LEAD = cards[LEAD_DATE].cards.find((card) => card.lead);

export function pinnedHome(date) {
  if (LEAD_DATE === date) return {};
  return { skip: `pinned to the ${date} homepage; ${LEAD_DATE} leads now` };
}
