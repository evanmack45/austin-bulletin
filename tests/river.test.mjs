import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRiver } from "../scripts/river.mjs";

const SAMPLE = `
#### Roads & transit

##### Council moves to ban the largest data centers
Austin City Council voted unanimously Thursday to speed up work on rules for data centers, directing staff to return by December. <span class="src">KXAN</span>

Bee Cave council rejected microtrenching for fiber Aug. 25. <span class="src">Community Impact</span>

{% voice "reddit-abc123" %}

#### Schools

McCallum High School asked families to donate fans after air conditioning failed. <span class="src">CBS Austin</span>
`;

test("separates leads from briefs", () => {
  const p = parseRiver(SAMPLE);
  assert.equal(p.items.length, 3);
  assert.equal(p.leads.length, 1);
  assert.equal(p.briefs.length, 2);
});

test("a lead keeps its headline out of the body word count", () => {
  const p = parseRiver(SAMPLE);
  const lead = p.leads[0];
  assert.equal(lead.headline, "Council moves to ban the largest data centers");
  assert.ok(!lead.body.includes("#####"));
  assert.equal(lead.words, 22); // the source tag's text counts, as it does today
});

test("assigns every item to its beat", () => {
  const p = parseRiver(SAMPLE);
  assert.deepEqual(p.items.map((i) => i.beat), [
    "Roads & transit",
    "Roads & transit",
    "Schools"
  ]);
});

test("counts visuals globally and per beat", () => {
  const p = parseRiver(SAMPLE);
  assert.equal(p.visuals.voice, 1);
  assert.equal(p.beats.find((b) => b.name === "Roads & transit").visuals, 1);
  assert.equal(p.beats.find((b) => b.name === "Roads & transit").voice, 1);
  assert.equal(p.beats.find((b) => b.name === "Schools").visuals, 0);
});

test("excludes the trailing sources line from items", () => {
  const p = parseRiver(SAMPLE + '\n<p class="source-line">KXAN · CBS Austin</p>\n');
  assert.equal(p.items.length, 3);
});
