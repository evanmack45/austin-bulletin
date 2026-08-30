// Unit tests for scripts/capture.mjs's pure chunk-geometry helper. No
// browser here — that half (the actual scroll/screenshot/stitch loop) is
// exercised manually against the live site, the way the rest of this
// script's Chrome-over-CDP behavior always has been. This only pins the
// math that decides where each viewport-height screenshot comes from and
// how much of it survives into the stitched image.

import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkPlan } from "../scripts/capture.mjs";

function totalKeptHeight(plan) {
  return plan.reduce((sum, chunk) => sum + chunk.height, 0);
}

test("a page shorter than one viewport is a single, uncropped chunk", () => {
  const plan = chunkPlan(500, 1000);
  assert.deepEqual(plan, [{ scrollY: 0, cropTop: 0, height: 500 }]);
});

test("a page exactly one viewport tall is a single, uncropped chunk", () => {
  const plan = chunkPlan(1000, 1000);
  assert.deepEqual(plan, [{ scrollY: 0, cropTop: 0, height: 1000 }]);
});

test("an exact multiple of the viewport height needs no remainder chunk", () => {
  const plan = chunkPlan(2000, 1000);
  assert.deepEqual(plan, [
    { scrollY: 0, cropTop: 0, height: 1000 },
    { scrollY: 1000, cropTop: 0, height: 1000 }
  ]);
});

test("a remainder chunk scrolls to the document bottom and crops the overlap", () => {
  const plan = chunkPlan(2500, 1000);
  assert.equal(plan.length, 3);
  const last = plan.at(-1);
  // Scrolled as far as the page allows, not past its bottom.
  assert.equal(last.scrollY, 1500);
  // The frame at scrollY 1500 spans rows [1500, 2500); rows [1500, 2000)
  // were already captured by the previous full chunk, so the first 500px
  // of this frame must be discarded.
  assert.equal(last.cropTop, 500);
  assert.equal(last.height, 500);
});

test("kept height always sums to the document height", () => {
  for (const docHeight of [1, 999, 1000, 1001, 2000, 2001, 3737]) {
    const plan = chunkPlan(docHeight, 1000);
    assert.equal(totalKeptHeight(plan), docHeight, `docHeight=${docHeight}`);
  }
});

test("chunks tile the page with no gaps and no double-covered rows", () => {
  const docHeight = 3737;
  const plan = chunkPlan(docHeight, 1000);
  let expectedRowStart = 0;
  for (const chunk of plan) {
    // The document row this chunk starts keeping from (scrollY + cropTop)
    // must pick up exactly where the previous chunk's kept rows ended —
    // otherwise a row is either skipped (a gap) or captured twice.
    const rowStart = chunk.scrollY + chunk.cropTop;
    assert.equal(rowStart, expectedRowStart);
    expectedRowStart = rowStart + chunk.height;
  }
  assert.equal(expectedRowStart, docHeight);
});
