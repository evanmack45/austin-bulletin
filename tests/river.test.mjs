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

test("fails an edition with fewer than 4 voice cards", () => {
  const river = riverOf("Schools", [brief(20), '{% voice "a" %}', brief(20)]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /1 voice card/.test(p.message)));
});

test("fails a beat carrying more than 2 voice cards", () => {
  const river = riverOf("Schools", [
    brief(20), '{% voice "a" %}', '{% voice "b" %}', '{% voice "c" %}'
  ]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /Schools carries 3 voice cards/.test(p.message)));
});

test("fails an edition with no graphic", () => {
  const { problems } = checkRiver(parseRiver(riverOf("Schools", [brief(20)])));
  assert.ok(problems.some((p) => /no graphic/.test(p.message)));
});

test("passes a beat at exactly 400 words with no visual", () => {
  const river = riverOf("Texas", Array(20).fill(brief(20)));
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /runs \d+ words with no visual/.test(p.message)));
});

test("fails a beat at exactly 401 words with no visual", () => {
  const river = riverOf("Texas", [...Array(20).fill(brief(20)), brief(1)]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /Texas runs 401 words with no visual/.test(p.message)));
});

test("a beat over 400 words with a visual passes the density rule", () => {
  const river = riverOf("Texas", [...Array(14).fill(brief(30)), '![chart](/images/x.png)']);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /runs \d+ words with no visual/.test(p.message)));
});

test("fails an edition with no videos", () => {
  const { problems } = checkRiver(parseRiver(riverOf("Schools", [brief(20)])));
  assert.ok(problems.some((p) => /0 video\(s\), EDITORIAL wants/.test(p.message)));
});

test("fails an edition with more than 3 videos", () => {
  const river = riverOf("Schools", [
    brief(20), '{% video "a" %}', '{% video "b" %}', '{% video "c" %}', '{% video "d" %}'
  ]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /4 video\(s\), EDITORIAL wants/.test(p.message)));
});

test("passes an edition with exactly 1 video", () => {
  const river = riverOf("Schools", [brief(20), '{% video "a" %}']);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /video\(s\), EDITORIAL wants/.test(p.message)));
});

test("passes an edition with exactly 3 videos", () => {
  const river = riverOf("Schools", [
    brief(20), '{% video "a" %}', '{% video "b" %}', '{% video "c" %}'
  ]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /video\(s\), EDITORIAL wants/.test(p.message)));
});

test("passes an edition with exactly 4 voice cards", () => {
  const river =
    riverOf("Schools", [brief(20), '{% voice "a" %}', '{% voice "b" %}']) +
    riverOf("Texas", [brief(20), '{% voice "c" %}', '{% voice "d" %}']);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /voice card\(s\), EDITORIAL wants/.test(p.message)));
});

test("passes a beat with exactly 2 voice cards", () => {
  const river = riverOf("Schools", [brief(20), '{% voice "a" %}', '{% voice "b" %}']);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /carries \d+ voice cards/.test(p.message)));
});

test("passes an edition with exactly 1 graphic", () => {
  const river = riverOf("Schools", [
    brief(20),
    '<figure class="graphic">\n![chart](/images/x.png)\n<figcaption>Chart: The Austin Bulletin · Source</figcaption>\n</figure>'
  ]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /no graphic/.test(p.message)));
});

// --- FIX 4: a news photo (a bare Markdown image, or any <figure> that is
// not marked class="graphic") must not satisfy the original-graphic
// requirement — only scripts/graphic.mjs's own <figure class="graphic">
// output counts as a "graphic". A bare photo still counts as a visual for
// the beat density rule (covered separately above).
test("a bare photo does not satisfy the graphic minimum", () => {
  const river = riverOf("Schools", [brief(20), '![a wire photo](/images/x.png)']);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /no graphic/.test(p.message)));
});

test("a plain <figure> without class=\"graphic\" does not satisfy the graphic minimum", () => {
  const river = riverOf("Schools", [brief(20), '<figure>\n![a wire photo](/images/x.png)\n</figure>']);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /no graphic/.test(p.message)));
});

test("fails an edition with 24 items", () => {
  const river = riverOf("Schools", Array(24).fill(brief(20)));
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /24 items, EDITORIAL wants/.test(p.message)));
});

test("passes an edition with exactly 25 items", () => {
  const river = riverOf("Schools", Array(25).fill(brief(20)));
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /items, EDITORIAL wants/.test(p.message)));
});

test("passes an edition with exactly 40 items", () => {
  const river = riverOf("Schools", Array(40).fill(brief(20)));
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /items, EDITORIAL wants/.test(p.message)));
});

test("fails an edition with 41 items", () => {
  const river = riverOf("Schools", Array(41).fill(brief(20)));
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /41 items, EDITORIAL wants/.test(p.message)));
});

test("passes an edition with exactly 10 voice cards", () => {
  const river = BEATS.slice(0, 5)
    .map((b) => riverOf(b, [brief(20), '{% voice "a" %}', '{% voice "b" %}']))
    .join("\n");
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /voice cards \(cap 10\)/.test(p.message)));
});

// --- Additional coverage (final review, I2): the scannable layer had a
// ceiling (leadsPerEdition) but no floor, so a brief-only edition passed
// clean — the same shape as the original bug (a cap with no floor silently
// collapsing). Below-floor is a WARN, not a fail: the impact test is allowed
// to legitimately find nothing on a quiet day, so blocking publish on it
// would punish correct editorial judgment.
function riverWithLeads(n) {
  // Spread leads two per beat (the leadsPerBeat cap) across distinct beats
  // so this helper never trips an unrelated per-beat-cap failure.
  const chunks = [];
  let remaining = n;
  let beatIndex = 0;
  while (remaining > 0) {
    const take = Math.min(2, remaining);
    const beatLeads = Array.from({ length: take }, (_, i) => lead(`Lead ${beatIndex}-${i}`, 50));
    chunks.push(riverOf(BEATS[beatIndex], [...beatLeads, brief(20)]));
    remaining -= take;
    beatIndex += 1;
  }
  return chunks.join("\n");
}

test("warns on an edition with 3 leads", () => {
  const { warnings } = checkRiver(parseRiver(riverWithLeads(3)));
  assert.ok(warnings.some((w) => /3 lead\(s\) in the River/.test(w.message)));
});

test("does not warn on an edition with exactly 4 leads", () => {
  const { warnings } = checkRiver(parseRiver(riverWithLeads(4)));
  assert.ok(!warnings.some((w) => /lead\(s\) in the River/.test(w.message)));
});

test("fails an edition with 11 voice cards", () => {
  const river = BEATS.slice(0, 6)
    .map((b, i) => riverOf(
      b,
      i < 5
        ? [brief(20), '{% voice "a" %}', '{% voice "b" %}']
        : [brief(20), '{% voice "a" %}']
    ))
    .join("\n");
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /11 voice cards \(cap 10\)/.test(p.message)));
});

// --- visual_exception (publisher's decision: publish with a logged
// exception when the visual minimums are genuinely unsatisfiable, e.g. a
// quiet news day with no public posts worth carrying). Only the four
// supply-shortage rules (voiceMin, graphicMin, videoMin's lower bound,
// beatWordsBeforeVisual) downgrade to a warning; caps and every other rule
// stay hard failures no matter what.
const SUBSTANTIVE_EXCEPTION = "Quiet news day; no public posts worth carrying as cards.";

test("no exception + 0 voice cards fails the voice minimum", () => {
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems, warnings } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /0 voice card\(s\) in the River/.test(p.message)));
  assert.ok(!warnings.some((w) => /0 voice card\(s\) in the River/.test(w.message)));
});

test("a substantive exception downgrades 0 voice cards to a warning, not a problem", () => {
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems, warnings } = checkRiver(parseRiver(river), { visualException: SUBSTANTIVE_EXCEPTION });
  assert.ok(!problems.some((p) => /voice card\(s\) in the River/.test(p.message)));
  assert.ok(warnings.some((w) => /0 voice card\(s\) in the River/.test(w.message)));
  assert.ok(warnings.some((w) => w.message.includes(SUBSTANTIVE_EXCEPTION)));
});

test("a substantive exception does not save too many voice cards in one beat", () => {
  const river = riverOf("Schools", [
    brief(20), '{% voice "a" %}', '{% voice "b" %}', '{% voice "c" %}',
    '![chart](/images/x.png)', '{% video "a" %}'
  ]);
  const { problems } = checkRiver(parseRiver(river), { visualException: SUBSTANTIVE_EXCEPTION });
  assert.ok(problems.some((p) => /Schools carries 3 voice cards/.test(p.message)));
});

test("a substantive exception does not save an over-length brief", () => {
  const river = riverOf("Schools", [
    brief(36), '{% voice "a" %}', '{% voice "b" %}', '{% voice "c" %}', '{% voice "d" %}',
    '![chart](/images/x.png)', '{% video "a" %}'
  ]);
  const { problems } = checkRiver(parseRiver(river), { visualException: SUBSTANTIVE_EXCEPTION });
  assert.ok(problems.some((p) => /brief is 36 words/.test(p.message)));
});

test("a too-short exception is itself a problem, not a silent no-op", () => {
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems, warnings } = checkRiver(parseRiver(river), { visualException: "quiet day" });
  assert.ok(problems.some((p) => /visual_exception is too short/.test(p.message)));
  // The minimums still fail normally — a bad exception must not act as a
  // valid one.
  assert.ok(problems.some((p) => /0 voice card\(s\) in the River/.test(p.message)));
  assert.ok(!warnings.some((w) => /voice card\(s\) in the River/.test(w.message)));
});

test("a sparse reason padded to 20 characters with whitespace is rejected", () => {
  // "x" + 18 spaces + "y" is 20 characters by .trim().length, but only 2
  // characters of actual reason — padding must not pass as substantive.
  const padded = "x" + " ".repeat(18) + "y";
  assert.strictEqual(padded.trim().length, 20);
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems, warnings } = checkRiver(parseRiver(river), { visualException: padded });
  assert.ok(problems.some((p) => /visual_exception is too short/.test(p.message)));
  assert.ok(problems.some((p) => /0 voice card\(s\) in the River/.test(p.message)));
  assert.ok(!warnings.some((w) => /voice card\(s\) in the River/.test(w.message)));
});

test("a genuine 20+ character sentence is accepted", () => {
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems, warnings } = checkRiver(parseRiver(river), { visualException: SUBSTANTIVE_EXCEPTION });
  assert.ok(!problems.some((p) => /visual_exception is too short/.test(p.message)));
  assert.ok(warnings.some((w) => /0 voice card\(s\) in the River/.test(w.message)));
});

// --- FIX 3: punctuation-only (or single-repeated-token) reasons must not
// clear the character floor alone — a real sentence needs actual words.
test("a real sentence like the EDITORIAL example is accepted", () => {
  const reason = "No public posts about Austin were worth carrying as cards today";
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems } = checkRiver(parseRiver(river), { visualException: reason });
  assert.ok(!problems.some((p) => /visual_exception is too short/.test(p.message)));
});

test("20 dots is rejected even though it clears the character floor", () => {
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems } = checkRiver(parseRiver(river), { visualException: ".".repeat(20) });
  assert.ok(problems.some((p) => /visual_exception is too short/.test(p.message)));
});

test("20 dashes is rejected even though it clears the character floor", () => {
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems } = checkRiver(parseRiver(river), { visualException: "-".repeat(20) });
  assert.ok(problems.some((p) => /visual_exception is too short/.test(p.message)));
});

test("a single 20-character repeated token is rejected as not a sentence", () => {
  const river = riverOf("Schools", [brief(20), '![chart](/images/x.png)', '{% video "a" %}']);
  const { problems } = checkRiver(parseRiver(river), { visualException: "a".repeat(20) });
  assert.ok(problems.some((p) => /visual_exception is too short/.test(p.message)));
});

// --- FIX 2: a River with no recognised beat heading must fail — previously
// checkRiver only validated beat structure when beats existed, so 25
// ungrouped items plus the required visuals produced zero problems.
test("an ungrouped River (no beat headings at all) fails", () => {
  const items = Array.from({ length: 25 }, (_, i) => brief(20));
  const river =
    items.join("\n\n") +
    '\n\n<figure class="graphic">\n![chart](/images/x.png)\n<figcaption>Chart: The Austin Bulletin · Source</figcaption>\n</figure>\n\n' +
    '{% voice "a" %}\n\n{% voice "b" %}\n\n{% voice "c" %}\n\n{% voice "d" %}\n\n{% video "a" %}\n';
  const parsed = parseRiver(river);
  assert.equal(parsed.beats.length, 0);
  assert.ok(parsed.items.every((i) => i.beat === null));
  const { problems } = checkRiver(parsed);
  assert.ok(problems.some((p) => /no beat headings in the River/.test(p.message)));
});

test("a River with one valid beat and all items inside it passes the beat-structure checks", () => {
  const river = riverOf("Schools", [brief(20), '{% voice "a" %}']);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /no beat headings/.test(p.message)));
  assert.ok(!problems.some((p) => /outside every beat heading/.test(p.message)));
});

test("an item appearing before the first #### heading fails", () => {
  const river = `${brief(20)}\n\n#### Schools\n\n${brief(20)}\n`;
  const parsed = parseRiver(river);
  assert.equal(parsed.items[0].beat, null);
  assert.equal(parsed.items[1].beat, "Schools");
  const { problems } = checkRiver(parsed);
  assert.ok(problems.some((p) => /item is outside every beat heading/.test(p.message)));
});
