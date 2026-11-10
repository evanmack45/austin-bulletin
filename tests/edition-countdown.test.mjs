import { test } from "node:test";
import assert from "node:assert/strict";
import { countdownGlyph, daysUntil } from "../src/_includes/chicago-date.js";
import { editionCardModel } from "../scripts/edition-cards.mjs";

test("a day countdown is counted in Chicago and hidden once the date passes", () => {
  assert.equal(daysUntil("2026-11-12", "2026-11-10"), 2);
  assert.equal(countdownGlyph("2026-11-12", "2026-11-10"), "2 days");
  assert.equal(countdownGlyph("2026-11-12", "2026-11-11"), "1 day");
  assert.equal(countdownGlyph("2026-11-12", "2026-11-12"), "Today");
  assert.equal(countdownGlyph("2026-11-12", "2026-11-13"), "");
  assert.equal(countdownGlyph("2026-11-12", new Date("2026-11-13T15:00:00Z")), "");
  assert.equal(countdownGlyph("not-a-date", "2026-11-10"), "");
});

test("a passed countdown drops the glyph and keeps the card", () => {
  const model = editionCardModel([
    { id: "lead", lead: true, section: "news", headline: "Lead", summary: "One." },
    {
      id: "thursday",
      section: "next",
      headline: "Thursday meeting",
      summary: "Commissioners meet.",
      glyph: { countdown: "2026-11-12", qualifier: "to the runoff registration deadline" }
    }
  ], "2026-11-13");
  const card = model.sections[0].items[0];
  assert.equal(card.glyphValue, "");
  assert.equal(card.glyphQualifier, "");
  assert.equal(card.headline, "Thursday meeting");
});
