import { test } from "node:test";
import assert from "node:assert/strict";
import thisWeek from "../src/_data/thisWeek.js";

test("dollar bars share the 2027 borrowing scale", () => {
  const [lead, star] = thisWeek.board.tiles;
  assert.equal(lead.mark, "$197.1M");
  assert.equal(lead.bar.callout, "+$13.5M added");
  assert.equal(lead.bar.base, "0.9315");
  assert.equal(lead.bar.add, "0.0685");
  assert.equal(star.mark, "$67.8M");
  assert.equal(star.bar.base, "0.3438");
  const full = Number(lead.bar.base) + Number(lead.bar.add);
  const share = Number(star.bar.base) / full;
  assert.ok(Math.abs(share - 0.3438) < 0.0001);
});

test("each board tile names its first source", () => {
  assert.equal(thisWeek.board.tiles.length, 5);
  assert.equal(thisWeek.board.count, 6);
  for (const tile of thisWeek.board.tiles) {
    assert.ok(tile.sources[0]?.label, tile.role);
    for (const source of tile.sources) {
      assert.equal(source.label === "Meeting video", false, tile.role);
      assert.equal(source.label.includes("http"), false, source.label);
    }
  }
  const kaskade = thisWeek.board.tiles[2];
  assert.equal(kaskade.mark, "4\u20110");
  assert.equal(kaskade.squares.length, 4);
  assert.equal(kaskade.sources[0].label, "Vote record");
  assert.equal(thisWeek.board.tiles[3].mark, "No action");
  assert.equal(thisWeek.board.tiles[4].rows.length, 2);
});
