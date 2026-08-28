# The River revamp — design

Date: 2026-08-28. Author: Claude, for Evan. Status: awaiting publisher review.
Driver: `docs/reviews/normies-2026-08-28.md` (seven-persona cold-visit review).

## 1. Problem

Five of seven first-time readers quit before the end of the Aug 28 edition. All
five quit inside The River.

The review reported this as "the River is a wall of text." Measurement shows the
cause is more specific, and more fixable, than that.

### Measured, Aug 28 edition

| Metric | Spec | Actual |
|---|---|---|
| River item length | "one or two sentences" (EDITORIAL.md) | median **70 words**, max 95 |
| River total | — | **2,749 words** (~12 min reading) |
| Voice cards/day | ~10 (alive-plan) | **1** |
| Video/day | up to 3 | 1 |
| Graphics/day | — | **0** |

Across all six published editions: 13 voice cards total (~2.2/day), 6 videos,
**zero graphics**. Four of the six editions ran zero voice cards.

### Diagnosis

The River is failing its own specification, not its design. It kept the
alive-plan's item *count* (40) and roughly tripled its item *length*, while the
visual relief budgeted to break up that volume — ~10 cards and up to 3 videos a
day — collapsed to about a tenth. The result is 40 uniform 70-word paragraphs
with two visual interruptions in 3,500 words.

Three distinct defects have been discussed as one:

1. **Length drift.** Items run ~3x the specified length. No guardrail checks it.
2. **No scannable layer.** The Big Story has a headline, beats have labels,
   items have nothing. A reader's only options are read-everything or
   skip-everything. Five chose skip.
3. **No visual relief.** The mechanism designed to solve exactly this problem
   stopped being applied.

### Findings deliberately not treated as defects

- **The blackletter masthead.** Five of seven called it costume; the two oldest
  readers liked it. Nobody quit at the masthead. It is a locked identity
  decision and costs ~2 seconds that it recovers. No change.
- **The "broken" video embed** reported by four personas. Verified false — the
  iframe is `loading="lazy"` and never fired during full-page screenshot
  capture. It renders correctly in a real viewport.
- **A truncated sentence in the power-grid tile** reported by one persona.
  Verified false; the live text is correct.
- **The Reddit Voice card's tone.** Two readers flinched at an ordinary
  citizen's post under a "Neutral · Factual" masthead. EDITORIAL.md §"Voice
  cards and video" explicitly permits "ordinary people commenting publicly on
  Austin life… the point is to let the city talk." Publisher reaffirmed the rule
  on 2026-08-28; the working theory is that the card read as random because it
  was alone, and that restoring the budget fixes the tone problem.

## 2. Decisions (publisher, 2026-08-28)

| Decision | Choice |
|---|---|
| Target reader | **Alan** — habitual local-news reader (ex-Statesman, reads Axios Austin and KUT). Optimize for a ~1 minute scan and a ~6 minute read. |
| Volume | **Keep 40 items; tier the altitude.** Breadth is the differentiator and stays. |
| Promotion rule | **Written impact test in EDITORIAL.md**, published on About. |
| Voice cards | **Restore the 6–10/day budget, keep ordinary voices.** |
| Approach | **A — lead + briefs inside each beat** (not a global top-five layer). |
| Homepage AI disclosure | **No change.** The Aug 23 standing decision stands: About carries the disclosure, bulletins do not. Reaffirmed 2026-08-28. |

Approach B (a global ranked top-five above a flat River) was rejected on
positioning: a five-item ranked digest is Axios Austin's format, and the target
reader states Axios beats the Bulletin on speed and voice.

## 3. Design

### 3.1 The River's shape

A beat contains two kinds of item.

**Lead** — a `#####` headline over a 50–70 word summary, carrying any card,
video, or graphic that beat earned:

```markdown
#### City Hall & county

##### Council moves to ban the largest data centers by December
Austin City Council voted unanimously Thursday to speed up work on rules for
data centers… <span class="src">Austin Current / KXAN</span>
```

**Brief** — one sentence, ~25 words, source tag, no headline:

```markdown
Bee Cave council rejected microtrenching for fiber Aug. 25 after AT&T and
Google Fiber said they don't repair the streets. <span class="src">Community Impact</span>
```

**Budget:** 9 beats, ~10 leads, ~30 briefs, ~1,500 River words.

Editorial targets and gate thresholds differ on purpose: the target is what the
writer aims at, the gate is where the build fails. A lead targets 50–70 words
and fails outside 40–80. A brief targets ~25 words and fails above 35. The River
targets ~1,500 words, warns above 1,800 and fails above 2,200. Writing to the
gate rather than the target is drift; the warn band exists to surface it early.

Beat order is unchanged (EDITORIAL.md §"The shape of a day"): Roads & transit ·
Public safety & courts · City Hall & county · Schools · Health · Business & tech ·
Around town · Texas · Sports. Weather remains its own `## Weather` section and
its items are excluded from the River count, per the 2026-08-24 ruling.

`<h5>` is currently unused sitewide, so the lead headline needs no new
shortcode and no template restructure. Rendering is CSS-only.

### 3.2 The impact test

Goes in EDITORIAL.md. An item becomes a lead if it meets **any** of:

1. Someone was killed or seriously hurt.
2. Money or a rule that binds residents changed — a vote taken, a price set, a
   contract signed, a ban enacted.
3. Something closes, opens, or changes today or this week — a road, a school, a
   utility, a service.
4. A decision is scheduled, with a date — a vote, a hearing, a deadline.

**Caps:** at most 2 leads per beat; at most 12 leads per edition.

**A beat with nothing that meets the test gets no lead.** Never promote to fill
a slot. This is what prevents a thin beat from promoting trivia on the merit of
being alone.

The test is published verbatim on the About page. This is the answer to the
target reader's objection that "'the AI decided' isn't good enough when it's
telling me which of 40 stories in a beat matter most" — not a fabricated byline,
but a rule he can check against any edition.

### 3.3 Language rules

The only finding that hit all seven readers.

- **Every acronym and initialism is expanded on its first use anywhere in the
  edition** — the Big Story counts as first use, so the River need not repeat it.
  "the Electric Reliability Council of Texas (ERCOT)", "Emergency Services
  District 5", "Independent School District". Short form thereafter. Covers
  agencies, districts, utilities, stadiums (DKR), road nicknames (first use as
  "MoPac (Loop 1)"), and vendor names used as bare nouns (Flock, Axon).
- **Index numbers carry their scale.** The air-quality glance tile reads "59 of
  500". Two readers independently asked "59 out of what?"

**Constraint:** EDITORIAL.md requires numbers be quoted from sources and never
calculated. Scale is therefore stated only where it is inherent to the index
(AQI is 0–500 by definition) or where a source publishes the context. Derived
comparisons such as "about 85% of the summer record" are **not** permitted by
this design.

### 3.4 Visual budget

Restated as minimums, because the existing caps were satisfied by doing nothing.

| Element | Rule |
|---|---|
| Voice cards | ≥ 4 required, 6–10 target, ≤ 2 per beat |
| Video | 1–3 |
| Graphics | ≥ 1 per edition |
| Density | Any beat exceeding 400 words carries at least one visual interruption. Beats under 400 words are exempt. |

The ≤2-per-beat cap exists so cards distribute across the scroll rather than
clumping; distribution is the function, not decoration.

### 3.5 Navigation

- A row of beat jump-links beneath the "40 items · grouped by beat" line. Beat
  headings already carry ids, so this is render-only.
- A back-to-top link at the end of the River.
- Slugify beat anchors: `roads-%26-transit` becomes `roads-transit`.

### 3.6 Repairs

- **Duplicate timeline attribution.** `scripts/graphic.mjs` renders the
  author-supplied `subtitle` into the image (line ~193) and separately
  auto-generates `<figcaption>{kind}: The Austin Bulletin · {source}</figcaption>`
  from `spec.source` (line ~333). On Aug 28 the author also wrote the source
  list into the subtitle, so the same attribution printed twice, stacked. Fix is
  an authoring rule: **a graphic's subtitle never restates the source list; the
  figcaption carries attribution.** No code change.
- **About page ordering.** Move `## Contact` above `## Follow`. One reader quit
  on the RSS paragraph's jargon without ever reaching the contact address.

## 4. Guardrail

`scripts/check.mjs` (376 lines) already runs per-edition in CI
(`.github/workflows/ci.yml`). It verifies structural presence — Big Story
headline, "What's next" line, Sources line, source tags on every River item,
Weather section, no draft markers, link liveness.

It asserts nothing about length, count, or visual density. That is why the drift
was silent. Extend it rather than build anything new.

### New assertions

| # | Assertion | Severity |
|---|---|---|
| 1 | Every brief ≤ 35 words; every lead 40–80 words | fail |
| 2 | 0–2 leads per beat; ≤ 12 leads per edition; 25–40 items total | fail |
| 3 | ≥ 4 voice cards; ≥ 1 graphic; 1–3 videos; any beat > 400 words has a visual | fail |
| 4 | Each known acronym expanded on first use (dictionary in repo) | fail |
| 5 | Unknown 2–5 letter all-caps token encountered | warn |
| 6 | River word count > 1,800 warn, > 2,200 fail | warn / fail |

Assertion 1 is the one that would have caught this failure.

Assertion 5 makes the acronym rule self-extending: new jargon surfaces itself in
the run log rather than waiting for the next reader review.

The acronym dictionary is `scripts/acronyms.json`, mapping short form to
required expansion. Seed list: ERCOT, ISD, PUA, ESD, DKR, MoPac, AQI, MUD,
TxDOT, APD.

Assertions 4 and 5 ignore text inside `<span class="src">` tags, `<figcaption>`
elements, and the Sources lines. Outlet names appearing only as attribution
(KXAN, KUT, KVUE) are credits, not jargon the reader must decode, and must not
trip the gate.

## 5. Out of scope

- **Search over the archive.** Four of seven readers wanted it and it genuinely
  does not exist (verified: no `<input>` element sitewide). It needs a
  client-side index and touches nothing else in this revamp. Its own project.
- **Weekend and events coverage.** Two readers quit for want of it. A scope
  question for the publisher, not a defect.
- **Original reporting.** The target reader's decisive objection — "a very
  polished table of contents to other people's newsrooms." Correct, and outside
  what the pipeline is built to do. Named here so it is not quietly folded into
  a design change that cannot address it.
- **The masthead.** See §1.

## 6. Sequencing

The cloud routine writes the next bulletin at ~6:07 a.m. Central. The authoring
contract and its enforcement must move together:

- Rules shipped without the pipeline prompt → the next run produces the old
  shape and fails the new gate.
- Gate shipped without the rules → the build breaks.

**This lands as one commit**, or it does not land. Files touched:

| File | Change |
|---|---|
| `EDITORIAL.md` | impact test; lead/brief definitions and lengths; language rules; visual minimums; graphic-subtitle rule |
| `PIPELINE.md` | the daily River step rewritten to the new contract |
| `eleventy.config.js` | slugify beat anchors |
| `src/css/style.css` | `.river h5` lead style; brief spacing; beat nav; back-to-top |
| `src/_includes/` (river render) | beat jump-link row; back-to-top |
| `src/about.md` | publish the impact test; Contact above Follow |
| `scripts/check.mjs` | six new assertions |
| `scripts/acronyms.json` *(new)* | seed dictionary |

## 7. Verification

**Mechanical.** Every new assertion is mutation-checked before it is trusted:
deliberately break a real edition (stretch a brief past 35 words, strip the
voice cards, remove an acronym expansion), confirm the check fails, restore.
Which assertions were broken and what was observed gets reported — an untested
assertion is not a guardrail.

**Reader-facing.** Re-run the same seven-persona review against the first
edition published in the new shape, using the capture pipeline built for the
Aug 28 review. The target reader answered "no" to whether the Bulletin earns his
morning. Whether he still says no is the measure of this revamp.

Success criteria:

- River ≤ 1,800 words; every brief ≤ 35 words.
- The River scans in ~1 minute (ten headlines, thirty one-liners) and reads in ~6.
- ≥ 4 voice cards and ≥ 1 graphic in every edition.
- No first-time reader quits inside the River for reasons of density.
