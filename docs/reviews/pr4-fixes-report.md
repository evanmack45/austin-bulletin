# PR #4 (`river-revamp`) — six code-review findings, fixed

Branch: `river-revamp`. All six findings applied and verified. No push performed
(local commits only, per instructions).

## FIX 1 — case-sensitive acronym expansion match

`scripts/acronyms.mjs`: the containment check now compares `window` and
`expansion` lowercased, so the dictionary's lowercase expansion matches the
correct title-case journalistic form. The dictionary (`scripts/acronyms.json`)
was not touched. New tests in `tests/acronyms.test.mjs` cover title-case,
lowercase, and all-caps forms of `Municipal Utility District (MUD)`, plus a
bare `MUD` with no expansion (still fails).

## FIX 2 — River with no beat headings

`scripts/river.mjs`: `checkStructure` now requires at least one beat
(`parsed.beats.length === 0` fails) and rejects any item whose parsed `beat`
is `null`, naming the offending item's preview text. Added a type comment
documenting `Item.beat: string | null` and the fact that checkRiver enforces
non-null before an edition can pass. New tests: an ungrouped 25-item River
(with all required visuals present) now fails; a River with one valid beat
passes; an item before the first `####` heading fails.

## FIX 3 — punctuation-only visual_exception reasons

`scripts/river.mjs`: `isSubstantiveException` now requires both the existing
20-non-whitespace-character floor AND at least 4 whitespace-separated tokens
that contain a letter or digit (`substantiveWords`). Twenty dots, twenty
dashes, and a single 20-character repeated token all fail the word floor even
though they clear the character floor; a real sentence like the EDITORIAL
example passes both. The failure message states both the char and word
requirements (kept the phrase "too short" so it still matches the pre-existing
test regex). `EDITORIAL.md` and `PIPELINE.md` prose updated to describe the
word-plus-character rule instead of character-count-only.

## FIX 4 — original graphic vs. news photo

`scripts/graphic.mjs` now wraps its markdown+figcaption output in
`<figure class="graphic">…</figure>`. `scripts/river.mjs`'s `visualKind`
classifies `<figure class="graphic"` as kind `graphic`; a bare Markdown image
or any other `<figure>` is now kind `image`. Both still count toward a beat's
`visuals` total (density rule); only `graphic` satisfies `graphicMin`.
`EDITORIAL.md` documents the distinction next to the visual minimums. New
tests: a `<figure class="graphic">` satisfies `graphicMin`; a bare photo and a
plain `<figure>` do not; a photo still satisfies the beat density rule
(pre-existing test, unaffected).

## FIX 5 — gate.test.mjs no longer touches src/bulletins/

`scripts/check.mjs` gained a `--dir <path>` flag (documented in its usage
comment) that overrides the bulletin directory; default behavior (no `--dir`)
is unchanged, and the one duplicate `bulletinDir` declaration further down the
file was removed in favor of the single top-level one. `tests/gate.test.mjs`
now builds every fixture in a per-test `mkdtemp(os.tmpdir())` directory and
passes it via `--dir`; it never reads or writes anything under
`src/bulletins/` by path construction — the one read of a real edition
(`2026-08-28.md`, `2026-08-24.md`) is copied into the temp dir before the
checker ever runs against it. Verified the checker does not crash when the
temp dir holds only the fixture (no siblings to scan for reused card/video
ids), and that a build running concurrently with the test suite completes
cleanly (see Verification 5/6 below).

## FIX 6 — checkRiver complexity/length split

`scripts/river.mjs`'s `checkRiver` (was 115 lines / complexity 32 measured by
ESLint on the original) is now a thin composer. Split into: `checkStructure`
(beats, items, leads, item count — itself composed of `checkBeatHeadings`,
`checkItemBeats`, `checkItemLengths` → `checkBriefLength`/`checkLeadShape`,
`checkLeadsPerBeat`, `checkLeadsPerEdition`, `checkItemCount`),
`checkWordBudget`, and `checkVisualBudget` (composed of `checkVoiceBudget`,
`checkGraphicBudget`, `checkVideoBudget`, `checkPerBeatVisuals`), plus
`resolveVisualException` for the exception-reason gate. Exported signature
`checkRiver(parsed, { visualException })` and the returned
`{ problems, warnings, exceptionApplied, visualException }` shape are
unchanged — no message text, threshold, or behavior changed. All 65
pre-existing tests plus the FIX 2–4 additions pass unmodified against the
refactored implementation. See the complexity table below.

---

## Verification

### 1. `npm test`

```
ℹ tests 78
ℹ suites 0
ℹ pass 78
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

65 pre-existing tests + 13 new (4 acronym MUD-case tests, 3 River beat-
structure tests, 4 visual_exception word-floor tests, 2 graphic-vs-photo
tests) = 78, all passing.

### 2. Mutation check (every new assertion's underlying fix broken, confirmed
failing, then restored via the exact inverse edit)

| Fix | Mutation | Tests that failed | Restored & re-passing |
|---|---|---|---|
| FIX 1 | Reverted `.toLowerCase()` comparison to case-sensitive `window.includes(expansion)` | `passes the title-case journalistic form 'Municipal Utility District (MUD)'`, `passes the all-caps form 'MUNICIPAL UTILITY DISTRICT (MUD)'` (2 failed) | Yes — full suite 78/78 |
| FIX 2 | Removed `checkBeatHeadings`/`checkItemBeats` calls from `checkStructure` | `an ungrouped River (no beat headings at all) fails`, `an item appearing before the first #### heading fails` (2 failed) | Yes — full suite 78/78 |
| FIX 3 | `isSubstantiveException` reduced to char-count-only (dropped the word check) | `20 dots is rejected...`, `20 dashes is rejected...`, `a single 20-character repeated token is rejected...` (3 failed) | Yes — full suite 78/78 |
| FIX 4 | `visualKind` reverted to classify any bare image/figure as `graphic` | `a bare photo does not satisfy the graphic minimum`, `a plain <figure> without class="graphic" does not satisfy the graphic minimum` (2 failed) | Yes — full suite 78/78 |

FIX 5 and FIX 6 added no new assertions (FIX 5 relocated existing fixtures
without changing what they assert; FIX 6 is a behavior-preserving refactor
verified by the full pre-existing suite), so no separate mutation check was
owed for them per the task's instructions.

### 3. FIX 6 complexity/line measurements (ESLint `complexity` + `max-lines-per-function`, threshold set to 1 to force every function's actual value to print)

| Function | Lines | Complexity |
|---|---|---|
| `resolveVisualException` | 16 | 4 |
| `checkBeatHeadings` | 5 | 2 |
| `checkItemBeats` | 7 | 3 |
| `checkBriefLength` | 5 | 3 |
| `checkLeadShape` | 9 | 5 |
| `checkItemLengths` | 6 | 2 |
| `checkLeadsPerBeat` | 8 | 3 |
| `checkLeadsPerEdition` | 10 | 3 |
| `checkItemCount` | 5 | 3 |
| `checkStructure` | 8 | 1 |
| `checkWordBudget` | 8 | 3 |
| `checkVoiceBudget` | 13 | 3 |
| `checkGraphicBudget` | 5 | 2 |
| `checkVideoBudget` | 17 | 3 |
| `checkPerBeatVisuals` | 14 | 5 |
| `checkVisualBudget` | 6 | 1 |
| `checkRiver` | 22 | 4 |

Every function is well inside both hard limits (≤100 lines, complexity ≤8).
Confirmed with ESLint run at the real thresholds (`complexity: 8`,
`max-lines-per-function: 100`) against `scripts/river.mjs`: zero errors for
any of the functions above.

**Pre-existing, out-of-scope note:** the same ESLint pass flags `parseRiver`
(unchanged by this branch, complexity 17) as already over the limit. It was
not one of the six findings and its control flow was not touched by any of
these fixes (only its `visuals` object literal gained an `image: 0` key), so
it was left alone — flagged here rather than silently fixed or silently
ignored.

### 4. Six-edition parity (unchanged)

```
2026-08-23 -> exit 1   (FAIL, pre-existing)
2026-08-24 -> exit 1   (FAIL, pre-existing)
2026-08-25 -> exit 0   (PASS)
2026-08-26 -> exit 0   (PASS)
2026-08-27 -> exit 0   (PASS)
2026-08-28 -> exit 0   (PASS)
```

Matches the required baseline exactly. (These six dates all predate
`NEW_SHAPE_FROM = "2026-08-29"`, so `checkRiver` — where every fix in this
branch lives — does not run against them at all; the FIX 2/FIX 4 changes to
`checkRiver`/`parseRiver`'s visual classification are structurally unable to
move these six results.)

### 5. `npm run build`

Exit 0. Wrote 12 files (6 bulletin pages + feed/manifest/archive/index/404/
about), from the 6 real files in `src/bulletins/` — no fixture leakage.

### 6. `git status --short` / src/bulletins/ untouched

Clean before, during (checked mid-run with a concurrent `npm run build` +
`npm test`), and after every verification step. `src/bulletins/` was never
written to: confirmed by directory listing (only the 6 real editions present)
after both the full test suite and the FIX-1–4 mutation-check runs, and by
`git status --short` showing no changes under `src/bulletins/` at any point.
Files actually changed by this work: `EDITORIAL.md`, `PIPELINE.md`,
`scripts/acronyms.mjs`, `scripts/check.mjs`, `scripts/graphic.mjs`,
`scripts/river.mjs`, `tests/acronyms.test.mjs`, `tests/gate.test.mjs`,
`tests/river.test.mjs`.

### 7. Four verified defects re-confirmed fixed (direct calls, outside the test suite)

```
title-case MUD problems: 0
ungrouped River beats: 0 -> no-beat-headings problem present: true
20 dots exception problems: true            (i.e. still rejected)
bare photo satisfies graphicMin (should be false): false
```

All four match the required outcome.

---

## FIX 7 — parseRiver complexity/length split

The pre-existing, out-of-scope note above flagged `parseRiver` (complexity
17, limit 8) as the one remaining violation from this branch. Fixed now:
split the per-block classification into named helpers — `isLeadBlock` /
`parseLeadBlock`, `isBeatHeading` / `parseBeatHeading`, `applyVisual`,
`isSkippableBlock`, `parseBriefBlock`, `addItem`, `finalizeBeats`,
`buildParseResult` — leaving `parseRiver` itself as the block-walking loop
that calls them. Lead detection (`#####`) is still tested before beat
detection (`####`) inside `parseRiver`'s own loop, preserving the
`startsWith` gate. Exported signature `parseRiver(river)` and the returned
`{ beats, items, leads, briefs, visuals }` shape (with `graphic`/`image`
both incrementing `visuals` but only `graphic` counting toward
`graphicMin`) are unchanged. No test file changes were needed — no internal
name was renamed or referenced by `tests/river.test.mjs`. Commit `927744f`.

### 1. ESLint (`complexity: 8`, `max-lines-per-function: 100`) on `scripts/river.mjs`

```
$ npx eslint --no-config-lookup -c /tmp/eslint-cx.mjs scripts/river.mjs
(no output, exit 0)
```

Clean — zero errors, including for `parseRiver`.

### 2. Per-function complexity (threshold temporarily set to 0 to force every value to print; confirms every function, not just parseRiver, stays inside the limit)

| Function | Complexity |
|---|---|
| `words` | 1 |
| `wordCount` | 2 |
| `visualKind` | 6 |
| `isLeadBlock` | 1 |
| `parseLeadBlock` | 3 |
| `isBeatHeading` | 1 |
| `parseBeatHeading` | 1 |
| `applyVisual` | 3 |
| `isSkippableBlock` | 3 |
| `parseBriefBlock` | 3 |
| `addItem` | 2 |
| `finalizeBeats` | 2 |
| `buildParseResult` | 1 |
| **`parseRiver`** | **6** |
| `preview` | 1 |
| `substantiveChars` | 1 |
| `substantiveWords` | 1 |
| `isSubstantiveException` | 2 |
| `resolveVisualException` | 4 |
| `checkBeatHeadings` | 2 |
| `checkItemBeats` | 3 |
| `checkBriefLength` | 3 |
| `checkLeadShape` | 5 |
| `checkItemLengths` | 2 |
| `checkLeadsPerBeat` | 3 |
| `checkLeadsPerEdition` | 3 |
| `checkItemCount` | 3 |
| `checkStructure` | 1 |
| `checkWordBudget` | 3 |
| `checkVoiceBudget` | 3 |
| `checkGraphicBudget` | 2 |
| `checkVideoBudget` | 3 |
| `checkPerBeatVisuals` | 5 |
| `checkVisualBudget` | 1 |
| `checkRiver` | 4 |

`parseRiver` dropped from 17 to 6. Every function in the file is ≤8
(well inside the limit), matching the real-threshold ESLint run's zero
errors above.

### 3. `npm test`

```
ℹ tests 78
ℹ suites 0
ℹ pass 78
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Unchanged from the FIX 1–6 baseline: still 78/78.

### 4. Parse-equivalence proof

Captured `JSON.stringify(parseRiver(river))` (river block extracted the
same way `scripts/check.mjs`'s `section()` does, via `{% river %}` /
`{% endriver %}`) for all six published editions in `src/bulletins/`,
before and after the refactor:

```
$ diff before.json after.json
(no output)
$ echo "diff exit=$?"
diff exit=0
```

Both captures are 4661 lines. Byte-identical — the refactor changed no
output for any of the six real editions.

### 5. Six-edition parity (unchanged)

```
2026-08-23 exit=1   (FAIL, pre-existing)
2026-08-24 exit=1   (FAIL, pre-existing)
2026-08-25 exit=0   (PASS)
2026-08-26 exit=0   (PASS)
2026-08-27 exit=0   (PASS)
2026-08-28 exit=0   (PASS)
```

Matches the required baseline exactly.

### 6. `npm run build` / `git status --short`

Build: exit 0, wrote 12 files (6 bulletin pages + feed/manifest/archive/
index/404/about) from the 6 real files in `src/bulletins/`.

`git status --short`: clean after commit `927744f`. Only
`scripts/river.mjs` was touched; nothing under `src/bulletins/` was
modified.
