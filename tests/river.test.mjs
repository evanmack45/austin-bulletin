import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRiver, checkRiver, BEATS } from "../scripts/river.mjs";

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

function riverOf(beatName, items) {
  return `#### ${beatName}\n\n` + items.join("\n\n") + "\n";
}
// Exactly n words: (n-1) filler plus the source tag's text, which words() keeps.
const brief = (n) => Array(n - 1).fill("word").join(" ") + ' <span class="src">KXAN</span>';
const lead = (title, n) => `##### ${title}\n` + brief(n);

test("fails a brief over 35 words", () => {
  const { problems } = checkRiver(parseRiver(riverOf("Schools", [brief(36)])));
  assert.ok(problems.some((p) => /brief is 36 words/.test(p.message)));
});

test("passes a brief at exactly 35 words", () => {
  const { problems } = checkRiver(parseRiver(riverOf("Schools", [brief(35)])));
  assert.ok(!problems.some((p) => /brief is/.test(p.message)));
});

test("fails a lead outside 40-80 body words", () => {
  const short = checkRiver(parseRiver(riverOf("Schools", [lead("A", 39)])));
  const long = checkRiver(parseRiver(riverOf("Schools", [lead("A", 81)])));
  assert.ok(short.problems.some((p) => /lead is 39 words/.test(p.message)));
  assert.ok(long.problems.some((p) => /lead is 81 words/.test(p.message)));
});

test("passes a lead at exactly 40 or 80 body words", () => {
  const short = checkRiver(parseRiver(riverOf("Schools", [lead("A", 40)])));
  const long = checkRiver(parseRiver(riverOf("Schools", [lead("A", 80)])));
  assert.ok(!short.problems.some((p) => /lead is/.test(p.message)));
  assert.ok(!long.problems.some((p) => /lead is/.test(p.message)));
});

test("fails a beat with three leads", () => {
  const river = riverOf("Schools", [lead("A", 50), lead("B", 50), lead("C", 50)]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /Schools has 3 leads/.test(p.message)));
});

test("passes a beat with exactly 2 leads", () => {
  const river = riverOf("Schools", [lead("A", 50), lead("B", 50)]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /Schools has \d+ leads/.test(p.message)));
});

test("fails more than 12 leads in an edition", () => {
  const river = BEATS.slice(0, 7).map((b) => riverOf(b, [lead("A", 50), lead("B", 50)])).join("\n");
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /14 leads/.test(p.message)));
});

test("passes an edition with exactly 12 leads", () => {
  const river = BEATS.slice(0, 6).map((b) => riverOf(b, [lead("A", 50), lead("B", 50)])).join("\n");
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /leads in the edition/.test(p.message)));
});

test("warns on a river strictly between 1800 and 2200 words", () => {
  const river = riverOf("Schools", Array(65).fill(brief(30)));
  const { problems, warnings } = checkRiver(parseRiver(river));
  assert.ok(warnings.some((w) => /river is \d+ words/.test(w.message)));
  assert.ok(!problems.some((p) => /river is/.test(p.message)));
});

test("fails a river above 2200 words", () => {
  const river = riverOf("Schools", Array(80).fill(brief(30)));
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /river is \d+ words/.test(p.message)));
});
