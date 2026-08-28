# River Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split each River beat into a few headlined leads and a run of one-sentence briefs, promote by a published impact test, restore the visual budget, and extend the CI checker so none of it can silently drift again.

**Architecture:** River analysis moves out of `scripts/check.mjs` into two focused, importable modules (`scripts/river.mjs`, `scripts/acronyms.mjs`) that are unit-tested with Node's built-in test runner. `check.mjs` becomes their caller. Presentation is CSS-only — `<h5>` is unused sitewide, so lead headlines need no new shortcode. Editorial rules move in `EDITORIAL.md` and `PIPELINE.md` in the same change.

**Tech Stack:** Node 26 ESM, `node --test` (built in, no new dependency), Eleventy 3, markdown-it + markdown-it-anchor, plain CSS.

**Spec:** `docs/superpowers/specs/2026-08-28-river-revamp-design.md`

## Global Constraints

- **Branch, then merge as one change.** Work on `river-revamp`. Task-level commits are fine on the branch; `main` must never hold the new gate without the new rules, or the rules without the gate. Do not push without Evan's approval.
- **New assertions are date-gated from `2026-08-29`.** Editions before that date keep the old rules. Published editions are never restructured after the fact (precedent: the 2026-08-24 Weather ruling left 2026-08-23 alone).
- **Lead:** `#####` headline + body targeting 50–70 words; gate fails outside **40–80** body words. Headline excluded from the count.
- **Brief:** one sentence targeting ~25 words; gate fails above **35**.
- **Tiers:** 0–2 leads per beat, ≤ **12** leads per edition, **25–40** items total (weather excluded).
- **River words:** warn above **1,800**, fail above **2,200**.
- **Visuals:** ≥ **4** voice cards (target 6–10, ≤ 2 per beat), ≥ **1** graphic, **1–3** videos. Any beat over **400** words carries at least one visual.
- **Beat order is fixed and unchanged:** Roads & transit · Public safety & courts · City Hall & county · Schools · Health · Business & tech · Around town · Texas · Sports.
- **No calculated numbers.** Scales are stated only where inherent to the index or published by a source. Never compute a comparison.
- **No AI disclosure on bulletin pages.** About carries it. Standing decision, reaffirmed 2026-08-28.
- Every new assertion is mutation-checked before it is trusted (Task 9).

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/river.mjs` *(new)* | Parse a `{% river %}` block into typed items and beats; validate tiers, lengths, and visual density. |
| `scripts/acronyms.mjs` *(new)* | Validate first-use expansion of known initialisms; warn on unknown all-caps tokens. |
| `scripts/acronyms.json` *(new)* | Dictionary: short form → required expansion. |
| `tests/river.test.mjs` *(new)* | Unit tests for parsing and River assertions. |
| `tests/acronyms.test.mjs` *(new)* | Unit tests for the language check. |
| `scripts/check.mjs` | Caller. Loses its inline River block, gains the date gate. |
| `package.json` | Adds `test` script. |
| `.github/workflows/ci.yml` | Runs `npm test`. |
| `src/css/style.css` | Lead headline, brief rhythm, beat nav, back-to-top. |
| `eleventy.config.js` | Slugify beat anchors; render beat nav + back-to-top. |
| `EDITORIAL.md` | Impact test, lead/brief contract, language rules, visual minimums, graphic-subtitle rule. |
| `PIPELINE.md` | The daily River step, rewritten to the new contract. |
| `src/about.md` | Publish the impact test; move Contact above Follow. |

**Why the extraction:** `check.mjs` is 376 lines with the River logic inline and no way to test it. The parsing is about to get materially more complex (two item kinds, per-beat visual density). Splitting it out is what makes Task 9's mutation check possible at all.

---

## Task 1: Extract River parsing into a tested module

Behaviour-preserving. `check.mjs` must produce identical output on the six published editions after this task.

**Files:**
- Create: `scripts/river.mjs`
- Create: `tests/river.test.mjs`
- Modify: `package.json` (add `test` script)
- Modify: `scripts/check.mjs` (River block → call the module)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `BEATS: string[]` — the nine beat names in fixed order.
  - `parseRiver(river: string) -> Parsed` where
    `Parsed = { beats: Beat[], items: Item[], leads: Item[], briefs: Item[], visuals: {voice:number, video:number, graphic:number} }`,
    `Beat = { name: string, items: Item[], visuals: number, voice: number, words: number }`
    (`visuals` counts every embed kind; `voice` counts voice cards alone, because
    the per-beat cap in the spec is a voice-card cap),
    `Item = { kind: "lead"|"brief", headline: string|null, body: string, words: number, beat: string }`.
  - `words(block: string) -> string` and `wordCount(block: string) -> number` (moved verbatim from `check.mjs`).

- [ ] **Step 1: Add the test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "node --test tests/*.test.mjs"
```

A bare directory argument (`node --test tests/`) does NOT work on Node 26.7.0 —
Node treats the directory as a test file and reports a failure. Verified.

- [ ] **Step 2: Write the failing test**

Create `tests/river.test.mjs`:

```js
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/river.mjs'`

- [ ] **Step 4: Write the module**

Create `scripts/river.mjs`:

```js
// Parses a {% river %} block into typed items and beats.
//
// Two kinds of item, per EDITORIAL.md "The shape of a day":
//   lead  — a ##### headline over a 50–70 word summary
//   brief — one sentence, no headline
//
// Careful: `startsWith("####")` is true for "#####" as well. Lead detection
// must be tested before beat detection, or every lead is read as a beat.

export const BEATS = [
  "Roads & transit",
  "Public safety & courts",
  "City Hall & county",
  "Schools",
  "Health",
  "Business & tech",
  "Around town",
  "Texas",
  "Sports"
];

export function words(block) {
  return block
    .replace(/!\[[\s\S]*?\]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(block) {
  const t = words(block);
  return t ? t.split(" ").length : 0;
}

function visualKind(block) {
  if (block.startsWith("{% voice")) return "voice";
  if (block.startsWith("{% video")) return "video";
  if (block.startsWith("![") || block.startsWith("<figure")) return "graphic";
  return null;
}

export function parseRiver(river) {
  const blocks = river
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const beats = [];
  const items = [];
  const visuals = { voice: 0, video: 0, graphic: 0 };
  let current = null;

  for (const block of blocks) {
    if (block.startsWith("#####")) {
      const [head, ...rest] = block.split("\n");
      const headline = head.replace(/^#####\s*/, "").trim();
      const body = rest.join("\n").trim();
      const item = { kind: "lead", headline, body, words: wordCount(body), beat: current?.name ?? null };
      items.push(item);
      current?.items.push(item);
      continue;
    }

    if (block.startsWith("####")) {
      current = { name: block.replace(/^####\s*/, "").trim(), items: [], visuals: 0, voice: 0, words: 0 };
      beats.push(current);
      continue;
    }

    const kind = visualKind(block);
    if (kind) {
      visuals[kind] += 1;
      if (current) {
        current.visuals += 1;
        if (kind === "voice") current.voice += 1;
      }
      continue;
    }

    if (block.startsWith("{%") || block.startsWith('<p class="source-line"') || block.startsWith("<figcaption")) {
      continue;
    }

    const item = { kind: "brief", headline: null, body: block, words: wordCount(block), beat: current?.name ?? null };
    items.push(item);
    current?.items.push(item);
  }

  for (const beat of beats) {
    beat.words = beat.items.reduce((n, i) => n + i.words, 0);
  }

  return {
    beats,
    items,
    leads: items.filter((i) => i.kind === "lead"),
    briefs: items.filter((i) => i.kind === "brief"),
    visuals
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 5 tests.

- [ ] **Step 6: Rewire check.mjs to the module, at parity**

In `scripts/check.mjs`:

1. Add at the top, with the other imports:

```js
import { BEATS, words, wordCount, parseRiver } from "./river.mjs";
```

2. Delete the local `const BEATS = [...]` array (lines ~26–36), and the local `words()`, `wordCount()`, and `riverItems()` function declarations (lines ~72–108). They now live in `river.mjs`.

3. In the River block, replace `const items = riverItems(river);` with:

```js
  const parsed = parseRiver(river);
  const items = parsed.items.map((i) => i.body);
```

Leave every existing assertion untouched in this task.

- [ ] **Step 7: Verify parity on all six published editions**

Run:

```bash
for d in 2026-08-23 2026-08-24 2026-08-25 2026-08-26 2026-08-27 2026-08-28; do echo "--- $d"; npm run check -- "$d" --no-links; done
```

Expected: **output identical to before the change** — not "all six pass". Two
editions already fail the existing gate for pre-existing reasons and must keep
failing in exactly the same way:

- `2026-08-23` — Big Story 278 words (wants 400–700); Weather nested inside the
  River (the known legacy case the 2026-08-24 ruling deliberately left alone);
  20 items.
- `2026-08-24` — 23 items; two items at 123 and 101 words, over the old 100-word cap.

`2026-08-25` through `2026-08-28` pass. Capture the output before and after and
diff it; do not eyeball it. If any edition's result *changes*, the extraction
changed behaviour — fix `river.mjs` before continuing.

- [ ] **Step 8: Commit**

```bash
git add package.json scripts/river.mjs scripts/check.mjs tests/river.test.mjs
git commit -m "refactor: extract River parsing into a tested module"
```

---

## Task 2: Tier and length assertions

**Files:**
- Modify: `scripts/river.mjs`
- Modify: `tests/river.test.mjs`

**Interfaces:**
- Consumes: `parseRiver` from Task 1.
- Produces: `checkRiver(parsed: Parsed) -> { problems: Finding[], warnings: Finding[] }` where `Finding = { check: string, message: string }`. Task 3 extends this same function; Task 5 calls it.

- [ ] **Step 1: Write the failing tests**

Append to `tests/river.test.mjs`:

```js
import { checkRiver, BEATS } from "../scripts/river.mjs";

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

test("fails a beat with three leads", () => {
  const river = riverOf("Schools", [lead("A", 50), lead("B", 50), lead("C", 50)]);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /Schools has 3 leads/.test(p.message)));
});

test("fails more than 12 leads in an edition", () => {
  const river = BEATS.slice(0, 7).map((b) => riverOf(b, [lead("A", 50), lead("B", 50)])).join("\n");
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /14 leads/.test(p.message)));
});

test("warns above 1800 river words and fails above 2200", () => {
  const warnOnly = checkRiver(parseRiver(riverOf("Schools", [brief(30), lead("A", 60)])));
  assert.equal(warnOnly.problems.filter((p) => /river is/.test(p.message)).length, 0);

  const huge = riverOf("Schools", Array(80).fill(brief(30)));
  const { problems } = checkRiver(parseRiver(huge));
  assert.ok(problems.some((p) => /river is \d+ words/.test(p.message)));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL — `checkRiver is not exported`.

- [ ] **Step 3: Implement checkRiver**

Append to `scripts/river.mjs`:

```js
export const LIMITS = {
  briefMax: 35,
  leadMin: 40,
  leadMax: 80,
  leadsPerBeat: 2,
  leadsPerEdition: 12,
  itemsMin: 25,
  itemsMax: 40,
  wordsWarn: 1800,
  wordsFail: 2200
};

function preview(item) {
  return words(item.body).slice(0, 60) + "…";
}

export function checkRiver(parsed) {
  const problems = [];
  const warnings = [];
  const bad = (check, message) => problems.push({ check, message });
  const warn = (check, message) => warnings.push({ check, message });

  for (const item of parsed.items) {
    if (item.kind === "brief" && item.words > LIMITS.briefMax) {
      bad("river", `brief is ${item.words} words (cap ${LIMITS.briefMax}): "${preview(item)}"`);
    }
    if (item.kind === "lead" && (item.words < LIMITS.leadMin || item.words > LIMITS.leadMax)) {
      bad("river", `lead is ${item.words} words, wants ${LIMITS.leadMin}–${LIMITS.leadMax}: "${item.headline}"`);
    }
    if (item.kind === "lead" && !item.headline) {
      bad("river", `lead has an empty headline: "${preview(item)}"`);
    }
  }

  for (const beat of parsed.beats) {
    const leads = beat.items.filter((i) => i.kind === "lead").length;
    if (leads > LIMITS.leadsPerBeat) {
      bad("river", `${beat.name} has ${leads} leads (cap ${LIMITS.leadsPerBeat})`);
    }
  }

  if (parsed.leads.length > LIMITS.leadsPerEdition) {
    bad("river", `${parsed.leads.length} leads in the edition (cap ${LIMITS.leadsPerEdition})`);
  }

  if (parsed.items.length < LIMITS.itemsMin || parsed.items.length > LIMITS.itemsMax) {
    bad("river", `${parsed.items.length} items, EDITORIAL wants ${LIMITS.itemsMin}–${LIMITS.itemsMax}`);
  }

  const total = parsed.items.reduce((n, i) => n + i.words, 0);
  if (total > LIMITS.wordsFail) {
    bad("river", `river is ${total} words (fails above ${LIMITS.wordsFail})`);
  } else if (total > LIMITS.wordsWarn) {
    warn("river", `river is ${total} words (target 1500, warns above ${LIMITS.wordsWarn})`);
  }

  return { problems, warnings };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/river.mjs tests/river.test.mjs
git commit -m "feat: assert River tier structure and item lengths"
```

---

## Task 3: Visual budget assertions

**Files:**
- Modify: `scripts/river.mjs`
- Modify: `tests/river.test.mjs`

**Interfaces:**
- Consumes: `parseRiver`, `checkRiver`, `LIMITS` from Tasks 1–2.
- Produces: `LIMITS` gains `voiceMin`, `voicePerBeat`, `videoMin`, `videoMax`, `graphicMin`, `beatWordsBeforeVisual`. `checkRiver` gains visual findings. No new exported function.

- [ ] **Step 1: Write the failing tests**

Append to `tests/river.test.mjs`:

```js
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

test("fails a beat over 400 words with no visual", () => {
  const river = riverOf("Texas", Array(14).fill(brief(30)));
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(problems.some((p) => /Texas runs \d+ words with no visual/.test(p.message)));
});

test("a beat over 400 words with a visual passes the density rule", () => {
  const river = riverOf("Texas", [...Array(14).fill(brief(30)), '![chart](/images/x.png)']);
  const { problems } = checkRiver(parseRiver(river));
  assert.ok(!problems.some((p) => /runs \d+ words with no visual/.test(p.message)));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL — no visual findings produced.

- [ ] **Step 3: Extend LIMITS and checkRiver**

In `scripts/river.mjs`, add to the `LIMITS` object:

```js
  voiceMin: 4,
  voicePerBeat: 2,
  videoMin: 1,
  videoMax: 3,
  graphicMin: 1,
  beatWordsBeforeVisual: 400
```

Then insert into `checkRiver`, immediately before the `return` statement:

```js
  if (parsed.visuals.voice < LIMITS.voiceMin) {
    bad("visuals", `${parsed.visuals.voice} voice card(s), EDITORIAL wants at least ${LIMITS.voiceMin}`);
  }
  if (parsed.visuals.graphic < LIMITS.graphicMin) {
    bad("visuals", "no graphic in the edition; EDITORIAL wants at least one");
  }
  if (parsed.visuals.video < LIMITS.videoMin || parsed.visuals.video > LIMITS.videoMax) {
    bad("visuals", `${parsed.visuals.video} video(s), EDITORIAL wants ${LIMITS.videoMin}–${LIMITS.videoMax}`);
  }

  for (const beat of parsed.beats) {
    if (beat.voice > LIMITS.voicePerBeat) {
      bad("visuals", `${beat.name} carries ${beat.voice} voice cards (cap ${LIMITS.voicePerBeat})`);
    }
    if (beat.words > LIMITS.beatWordsBeforeVisual && beat.visuals === 0) {
      bad("visuals", `${beat.name} runs ${beat.words} words with no visual (cap ${LIMITS.beatWordsBeforeVisual})`);
    }
  }
```

**Note on per-beat counting:** the cap counts voice cards only (`beat.voice`), because a beat may legitimately carry a card plus a video plus a graphic. The density rule below uses `beat.visuals`, which counts every kind — for breaking up text, any embed will do.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/river.mjs tests/river.test.mjs
git commit -m "feat: assert the daily visual budget"
```

---

## Task 4: Acronym expansion check

**Files:**
- Create: `scripts/acronyms.mjs`
- Create: `scripts/acronyms.json`
- Create: `tests/acronyms.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `checkAcronyms(text: string, dict: Record<string,string>) -> { problems: Finding[], warnings: Finding[] }`, same `Finding` shape as `checkRiver`. Task 5 calls it.

- [ ] **Step 1: Write the dictionary**

Create `scripts/acronyms.json`:

```json
{
  "ERCOT": "Electric Reliability Council of Texas",
  "ISD": "Independent School District",
  "PUA": "Public Utility Agency",
  "ESD": "Emergency Services District",
  "MUD": "municipal utility district",
  "DKR": "Darrell K Royal",
  "MoPac": "Loop 1",
  "AQI": "Air Quality Index",
  "TxDOT": "Texas Department of Transportation",
  "APD": "Austin Police Department"
}
```

- [ ] **Step 2: Write the failing test**

Create `tests/acronyms.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAcronyms } from "../scripts/acronyms.mjs";

const DICT = {
  ERCOT: "Electric Reliability Council of Texas",
  ISD: "Independent School District"
};

test("fails an initialism used with no expansion", () => {
  const { problems } = checkAcronyms("ERCOT expects enough to go around.", DICT);
  assert.ok(problems.some((p) => /ERCOT/.test(p.message)));
});

test("passes when the expansion sits beside first use", () => {
  const text = "The Electric Reliability Council of Texas (ERCOT) expects enough. ERCOT said so again.";
  const { problems } = checkAcronyms(text, DICT);
  assert.equal(problems.length, 0);
});

test("ignores initialisms that only appear as attribution", () => {
  const text = 'Council voted Thursday. <span class="src">KXAN</span>';
  const { warnings } = checkAcronyms(text, DICT);
  assert.ok(!warnings.some((w) => /KXAN/.test(w.message)));
});

test("warns on an unknown all-caps token in body text", () => {
  const { warnings } = checkAcronyms("The LCRA released water.", DICT);
  assert.ok(warnings.some((w) => /LCRA/.test(w.message)));
});

test("does not warn on allowlisted everyday abbreviations", () => {
  const { warnings } = checkAcronyms("The CEO said the AI system uses US data.", DICT);
  assert.equal(warnings.length, 0);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/acronyms.mjs'`

- [ ] **Step 4: Write the module**

Create `scripts/acronyms.mjs`:

```js
// EDITORIAL.md "Language": every initialism is expanded on its first use in
// the edition. All seven readers in the 2026-08-28 review tripped on at least
// one unexplained abbreviation; this is the guardrail for that rule.
//
// Attribution is not jargon. Outlet names inside <span class="src">, figure
// captions, and the Sources lines are credits the reader is not asked to
// decode, so they are stripped before either check runs.

// Everyday abbreviations and outlet names that never need expanding.
const IGNORE = new Set([
  "US", "USA", "TV", "AI", "CEO", "CFO", "ID", "AM", "PM", "CT", "UT", "HVAC",
  "OK", "II", "III", "IV", "SUV", "DNA", "FBI", "NASA", "HUD", "DPS", "EMS",
  "KXAN", "KUT", "KVUE", "CBS", "FOX", "NBC", "ABC", "NPR", "NWS", "PGA",
  "SXSW", "ACL", "AT", "AP", "DA", "PD", "HOA", "RSS"
]);

function stripAttribution(text) {
  return text
    .replace(/<span class="src">[\s\S]*?<\/span>/g, " ")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/g, " ")
    .replace(/<p class="source-line">[\s\S]*?<\/p>/g, " ");
}

export function checkAcronyms(text, dict) {
  const problems = [];
  const warnings = [];
  const body = stripAttribution(text);

  for (const [short, expansion] of Object.entries(dict)) {
    const at = body.indexOf(short);
    if (at === -1) continue;
    // The expansion must sit within a sentence's reach of first use, on
    // either side: "Loop 1 (MoPac)" and "MoPac (Loop 1)" are both fine.
    const window = body.slice(Math.max(0, at - 140), at + short.length + 140);
    if (!window.includes(expansion)) {
      problems.push({
        check: "language",
        message: `"${short}" is used before its expansion "${expansion}"`
      });
    }
  }

  const known = new Set(Object.keys(dict));
  const seen = new Set();
  for (const m of body.matchAll(/\b[A-Z]{2,5}\b/g)) {
    const token = m[0];
    if (known.has(token) || IGNORE.has(token) || seen.has(token)) continue;
    seen.add(token);
    warnings.push({
      check: "language",
      message: `unknown initialism "${token}" — expand it, or add it to scripts/acronyms.json`
    });
  }

  return { problems, warnings };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS, 21 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/acronyms.mjs scripts/acronyms.json tests/acronyms.test.mjs
git commit -m "feat: check that initialisms are expanded on first use"
```

---

## Task 5: Wire the new checks into check.mjs behind a date gate

**Files:**
- Modify: `scripts/check.mjs`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `checkRiver`, `LIMITS` (Tasks 2–3), `checkAcronyms` (Task 4).
- Produces: nothing new. This is the wiring task.

- [ ] **Step 1: Import the new modules**

In `scripts/check.mjs`, extend the Task 1 import and add two more:

```js
import { BEATS, words, wordCount, parseRiver, checkRiver } from "./river.mjs";
import { checkAcronyms } from "./acronyms.mjs";
import ACRONYMS from "./acronyms.json" with { type: "json" };

// The lead/brief contract starts with this edition. Earlier bulletins keep the
// old rules — published editions are not restructured after the fact
// (precedent: the 2026-08-24 Weather ruling left 2026-08-23 alone).
const NEW_SHAPE_FROM = "2026-08-29";
```

`check.mjs` imports from `node:fs/promises`; the JSON import attribute keeps the
dictionary load out of that async path entirely. Verified working on Node 26.

- [ ] **Step 2: Gate the old item-length rule and run the new checks**

In the River block, immediately after `const parsed = parseRiver(river);`, add:

```js
    const newShape = date >= NEW_SHAPE_FROM;
```

Then, inside the existing `for (const it of items)` loop, wrap the old cap so it only applies to pre-cutover editions:

```js
      if (!newShape && n > ITEM_WORD_CAP) {
        bad("river", `item is ${n} words (cap ${ITEM_WORD_CAP}): "${words(it).slice(0, 60)}…"`);
      }
```

Then, after that loop, add:

```js
    if (newShape) {
      const riverFindings = checkRiver(parsed);
      for (const p of riverFindings.problems) bad(p.check, p.message);
      for (const w of riverFindings.warnings) warn(w.check, w.message);

      const language = checkAcronyms(text, ACRONYMS);
      for (const p of language.problems) bad(p.check, p.message);
      for (const w of language.warnings) warn(w.check, w.message);
    }
```

Also gate the existing item-count assertion, which `checkRiver` now duplicates:

```js
    if (!newShape && (items.length < RIVER_MIN || items.length > RIVER_MAX)) {
      bad("river", `${items.length} items, EDITORIAL wants ${RIVER_MIN}–${RIVER_MAX}`);
    }
```

- [ ] **Step 3: Verify the six published editions still pass**

Run:

```bash
for d in 2026-08-23 2026-08-24 2026-08-25 2026-08-26 2026-08-27 2026-08-28; do printf '%s: ' "$d"; npm run check -- "$d" --no-links >/dev/null 2>&1 && echo PASS || echo FAIL; done
```

Expected: `2026-08-23` FAIL, `2026-08-24` FAIL (both pre-existing — see Task 1
Step 7), the other four PASS. All six predate the cutover, so none of the NEW
assertions apply to them. What matters is that this result is unchanged from
before Task 5.

- [ ] **Step 4: Add the unit tests to CI**

In `.github/workflows/ci.yml`, add a step immediately before the bulletin-check step:

```yaml
      - name: Unit tests
        run: npm test
```

- [ ] **Step 5: Commit**

```bash
git add scripts/check.mjs .github/workflows/ci.yml
git commit -m "feat: enforce the new River contract from 2026-08-29"
```

---

## Task 6: Render leads, briefs, beat navigation, and back-to-top

**Files:**
- Modify: `src/css/style.css`
- Modify: `eleventy.config.js`

**Interfaces:**
- Consumes: nothing from earlier tasks — presentation only.
- Produces: `.river h5`, `.beat-nav`, `.to-top` styles, and a `beatNav` filter available to templates.

- [ ] **Step 1: Style leads and briefs**

In `src/css/style.css`, immediately after the existing `.river p` rule (~line 295), add:

```css
/* A lead: the beat's headline item. Bold and dark against the briefs, at body
   size — the page has enough type sizes already; weight does the work. */
.river h5 {
  margin: 1.4rem 0 0.35rem;
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
}
.river h5 + p { margin-bottom: 1.1rem; }

/* Briefs sit tighter than leads so the two tiers read as different weights
   without a rule or a bullet between them. */
.river h5 ~ p { margin-bottom: 0.55rem; }
```

- [ ] **Step 2: Style the beat navigation and back-to-top**

Append to `src/css/style.css`:

```css
.beat-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 1rem;
  margin: 0 0 1.6rem;
  padding: 0.7rem 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.beat-nav a { color: var(--accent); text-decoration: none; }
.beat-nav a:hover { text-decoration: underline; }

.to-top {
  margin: 1.5rem 0 0;
  text-align: center;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.to-top a { color: var(--accent); text-decoration: none; }
.to-top a:hover { text-decoration: underline; }
```

- [ ] **Step 3: Slugify beat anchors**

In `eleventy.config.js`, replace the `amendLibrary` block with:

```js
  // Heading ids (e.g. <h2 id="weather">) so in-page jump links work.
  // The default slugifier percent-encodes "&", which turns "Roads & transit"
  // into "roads-%26-transit". Drop it instead so the beat nav links are clean.
  let md;
  eleventyConfig.amendLibrary("md", (lib) => {
    md = lib.use(markdownItAnchor, {
      slugify: (s) =>
        encodeURIComponent(
          String(s).trim().toLowerCase()
            .replace(/&/g, " ")
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
        )
    });
    return md;
  });
```

`"Roads & transit"` now yields `roads-transit`.

- [ ] **Step 4: Render the beat nav and back-to-top inside the River**

In `eleventy.config.js`, replace the `river` paired shortcode with:

```js
  // The River renders its own beat navigation: readers who want City Hall
  // should not have to scroll past Public safety to reach it. Beat ids come
  // from markdown-it-anchor on the #### headings.
  eleventyConfig.addPairedShortcode("river", (content) => {
    const beats = [...content.matchAll(/^####\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
    const slug = (s) =>
      s.trim().toLowerCase().replace(/&/g, " ").replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const nav = beats.length
      ? `<nav class="beat-nav" aria-label="Jump to a beat">` +
        beats.map((b) => `<a href="#${slug(b)}">${b}</a>`).join("") +
        `</nav>\n`
      : "";
    const top = `<p class="to-top"><a href="#top">Back to top</a></p>\n`;
    return `<div class="river">\n${nav}${md.render(content)}${top}</div>`;
  });
```

- [ ] **Step 5: Give the page a #top anchor**

In `src/_includes/layout.njk`, change the opening body tag:

```html
<body id="top">
```

It is currently a bare `<body>` on line 20.

- [ ] **Step 6: Build and inspect**

Run:

```bash
npm run build && grep -o 'class="beat-nav"' _site/index.html && grep -o 'href="#roads-transit"' _site/index.html && grep -o 'class="to-top"' _site/index.html
```

Expected: one match for each. If `href="#roads-%26-transit"` appears instead, the slugify override is not taking effect.

- [ ] **Step 7: Commit**

```bash
git add src/css/style.css eleventy.config.js src/_includes/layout.njk
git commit -m "feat: lead styling, beat navigation, and back-to-top"
```

---

## Task 7: Move the editorial rules

**Files:**
- Modify: `EDITORIAL.md`
- Modify: `PIPELINE.md`

**Interfaces:**
- Consumes: the limits from Tasks 2–4 — every number here must match `LIMITS` in `scripts/river.mjs` exactly.
- Produces: the authoring contract the daily run writes against.

- [ ] **Step 1: Rewrite the River rule in EDITORIAL.md**

In `EDITORIAL.md` §"The shape of a day", replace item 3 with:

```markdown
3. The River: 25–40 items grouped by beat, in this fixed order: Roads & transit ·
   Public safety & courts · City Hall & county · Schools · Health · Business & tech ·
   Around town · Texas · Sports. Missing beats are omitted, never padded.

   Each beat holds two kinds of item.

   A **lead** opens with a `#####` headline and runs 50–70 words (the gate
   fails outside 40–80). At most two per beat, at most twelve per edition. An
   item becomes a lead only if it passes the impact test below. A beat with
   nothing that passes has no lead — never promote an item to fill a slot.

   A **brief** is every other item: one sentence, about 25 words, no headline
   (the gate fails above 35). Briefs are the default; most of the River is
   briefs.

   Every item, lead or brief, ends with a source tag. The whole River targets
   about 1,500 words and fails above 2,200.

   **The impact test.** An item earns a lead if it meets any of:
   1. Someone was killed or seriously hurt.
   2. Money or a rule that binds residents changed — a vote taken, a price
      set, a contract signed, a ban enacted.
   3. Something closes, opens, or changes today or this week — a road, a
      school, a utility, a service.
   4. A decision is scheduled, with a date — a vote, a hearing, a deadline.

   This test is published on the About page. It is the site's answer to "who
   decided this mattered", so it is applied literally, not loosely.
```

- [ ] **Step 2: Add the language rules to EDITORIAL.md**

In `EDITORIAL.md` §"Voice", append:

```markdown
- Every initialism is expanded on its first use in the edition, then used
  short: "the Electric Reliability Council of Texas (ERCOT)", "Emergency
  Services District 5", "Independent School District". This covers agencies,
  districts, utilities, stadiums (DKR), road nicknames (first use as "MoPac
  (Loop 1)"), and vendor names used as bare nouns (Flock, Axon). The Big Story
  counts as first use; the River need not repeat it.
- An index number carries its scale: the air-quality cell reads "59 of 500",
  not "59". The scale is stated only where it is inherent to the index or
  published by a source — never calculated. Do not write comparisons like
  "about 85% of the record"; that is a calculation, and calculations are
  forbidden by the accuracy rules.
```

- [ ] **Step 3: Restate the visual budget as minimums in EDITORIAL.md**

In `EDITORIAL.md` §"Voice cards and video", append:

```markdown
- Daily minimums, not just caps. An edition carries at least four Voice cards
  (target six to ten, at most two in any one beat), at least one original
  graphic, and one to three videos. Any beat running more than 400 words
  carries at least one visual. The cards are what break up the River; an
  edition that ships two of them has not met the rule, and the pre-publish
  check will fail.
- A graphic's subtitle never restates its source list. `npm run graphic`
  generates the attribution caption from the spec's `source` field, so writing
  the outlets into the subtitle as well prints the same credit twice.
```

- [ ] **Step 4: Rewrite the River step in PIPELINE.md**

In `PIPELINE.md`, find the step that produces the River and replace its body with:

```markdown
Write 25–40 items grouped by beat, in the fixed order.

For each beat, apply the impact test in EDITORIAL.md and choose at most two
leads — often zero or one. A lead gets a `#####` headline and 50–70 words. A
beat with nothing that passes the test gets no lead.

Everything else in the beat is a brief: one sentence, about 25 words, source
tag, no headline.

Place the day's Voice cards as you go — at least four, no more than two in any
one beat, spread so no beat runs 400 words without one. Add at least one
graphic (`npm run graphic`) and one to three videos (`npm run video`).

Expand every initialism on first use. **This includes the recurring ritual
lines**: the Countdown names the stadium, so its first use is "Darrell K
Royal-Texas Memorial Stadium (DKR)", not a bare "DKR". A fixed template line
that ships unexpanded fails the gate every single morning, so the ritual
templates carry their expansions. Same for road nicknames in any beat: first
use is "MoPac (Loop 1)".

Run `npm run check -- <date>` before
publishing; it fails on item length, lead counts, visual minimums, and
unexpanded initialisms, and warns on unknown all-caps tokens. Warnings are
triaged, not ignored: an unknown token is either expanded in the copy or added
to `scripts/acronyms.json`.
```

- [ ] **Step 5: Verify the numbers match the code**

Run:

```bash
grep -n 'briefMax\|leadMin\|leadMax\|leadsPerBeat\|leadsPerEdition\|voiceMin\|graphicMin\|beatWordsBeforeVisual\|wordsFail' scripts/river.mjs
grep -n '35\|40–80\|50–70\|two per beat\|twelve\|four Voice\|400 words\|2,200' EDITORIAL.md
```

Expected: every threshold in prose matches a value in `LIMITS`. Fix any that disagree — a rulebook that disagrees with its gate is how this failure happened the first time.

- [ ] **Step 6: Commit**

```bash
git add EDITORIAL.md PIPELINE.md
git commit -m "docs: the lead/brief contract, impact test, and language rules"
```

---

## Task 8: Publish the impact test and reorder About

**Files:**
- Modify: `src/about.md`

**Interfaces:**
- Consumes: the impact test wording from Task 7 — must match `EDITORIAL.md` verbatim.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add the impact test to "Our rules"**

In `src/about.md`, at the end of the `## Our rules` section, add:

```markdown
### How we decide what leads

Each beat carries a few longer items with headlines, and a run of one-sentence
briefs. An item earns a headline if it meets any of these tests:

- Someone was killed or seriously hurt.
- Money or a rule that binds residents changed — a vote taken, a price set, a
  contract signed, a ban enacted.
- Something closes, opens, or changes today or this week.
- A decision is scheduled, with a date.

At most two per beat. If nothing in a beat meets the test, nothing in that beat
gets a headline. You can check any morning's bulletin against this list.
```

- [ ] **Step 2: Move Contact above Follow**

In `src/about.md`, cut the whole `## Contact` section (heading and body) and paste it immediately above `## Follow`, so the order becomes: `## Corrections`, `## Contact`, `## Follow`.

A first-time reader in the 2026-08-28 review reached "Subscribe by RSS", did not know what a feed reader was, and stopped — never reaching the email address that was one paragraph below.

- [ ] **Step 3: Build and verify the order**

Run:

```bash
npm run build && sed -e 's/<[^>]*>//g' _site/about/index.html | grep -n 'Contact\|Follow\|How we decide'
```

Expected: "How we decide what leads" appears; "Contact" appears before "Follow".

- [ ] **Step 4: Commit**

```bash
git add src/about.md
git commit -m "docs: publish the impact test; put Contact before RSS"
```

---

## Task 9: Prove the gate catches real drift

Mutation testing. A guardrail nobody has watched fail is not a guardrail. Nothing here is committed — every mutation is reverted.

**Files:**
- Temporarily modify: a scratch copy of a bulletin. No repo file is changed by this task.

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: a written record of which assertions were broken and what was observed. This goes in the task's final report, not a file.

- [ ] **Step 1: Build a passing fixture in the new shape**

Copy the Aug 28 edition to a date after the cutover and convert its River by hand into the new shape — roughly ten leads with `#####` headlines at 40–80 words, the rest cut to briefs under 35 words, four voice cards, one graphic, one video:

```bash
cp src/bulletins/2026-08-28.md src/bulletins/2026-08-29.md
```

Edit `src/bulletins/2026-08-29.md` until it passes:

```bash
npm run check -- 2026-08-29 --no-links
```

Expected: passes the mechanical gate. This fixture is the baseline for every mutation below.

- [ ] **Step 2: Mutation 1 — stretch a brief past 35 words**

Pad any brief to 40 words. Run `npm run check -- 2026-08-29 --no-links`.
Expected: FAIL, `brief is 40 words (cap 35)`. Revert the padding.

- [ ] **Step 3: Mutation 2 — strip the voice cards**

Delete all but one `{% voice %}` line. Run the check.
Expected: FAIL, `1 voice card(s), EDITORIAL wants at least 4`. Restore.

- [ ] **Step 4: Mutation 3 — remove an acronym expansion**

Change the first "Electric Reliability Council of Texas (ERCOT)" to bare "ERCOT". Run the check.
Expected: FAIL, `"ERCOT" is used before its expansion`. Restore.

- [ ] **Step 5: Mutation 4 — add a third lead to one beat**

Promote a brief in an existing two-lead beat to a `#####` lead. Run the check.
Expected: FAIL, `<beat> has 3 leads (cap 2)`. Restore.

- [ ] **Step 6: Mutation 5 — delete the graphic**

Remove the `![...]` graphic block. Run the check.
Expected: FAIL, `no graphic in the edition`. Restore.

- [ ] **Step 7: Confirm the fixture passes again, then delete it**

```bash
npm run check -- 2026-08-29 --no-links && rm src/bulletins/2026-08-29.md
```

Expected: passes, then the fixture is gone. **The fixture must not be committed** — the cloud routine writes the real 2026-08-29 edition, and a stale hand-edited file would either be overwritten or collide.

- [ ] **Step 8: Report**

State plainly which five mutations were run, which failed as expected, and any that did not. An assertion that did not fire under mutation is not working — fix it and re-run before reporting the task done.

---

## Task 10: Full verification

**Files:** none modified.

**Interfaces:**
- Consumes: Tasks 1–9.
- Produces: the evidence Evan needs to approve the merge.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: 21 tests pass.

- [ ] **Step 2: All published editions still pass**

```bash
for d in 2026-08-23 2026-08-24 2026-08-25 2026-08-26 2026-08-27 2026-08-28; do printf '%s: ' "$d"; npm run check -- "$d" --no-links >/dev/null 2>&1 && echo PASS || echo FAIL; done
```

Expected: `2026-08-23` and `2026-08-24` FAIL for the pre-existing reasons listed
in Task 1 Step 7; the other four PASS. Unchanged from the start of the branch.

- [ ] **Step 3: Site builds**

Run: `npm run build`
Expected: exit 0, no warnings about missing ids or unresolved shortcodes.

- [ ] **Step 4: Visual confirmation**

Serve the site and capture the River at desktop width:

```bash
npx eleventy --serve --port 8181
```

Confirm by eye: lead headlines are visibly heavier than briefs; the beat nav sits under the river note and its links jump correctly; back-to-top appears at the end of the River.

- [ ] **Step 5: Report to Evan and stop**

Report: tests passing, editions passing, which mutations were verified, and what the River looks like. **Do not push.** Pushing is Evan's call.

---

## Post-merge (not part of this plan)

Once the first edition ships in the new shape, re-run the seven-persona review against it using the capture pipeline from `docs/reviews/normies-2026-08-28.md`. The target reader answered "no" to whether the Bulletin earns his morning; whether he still says no is the measure of this work.
