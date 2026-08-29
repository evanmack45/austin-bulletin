# PR #4 cutover move — 2026-08-29 to 2026-09-01

Date: 2026-08-29. Author: Claude, for Evan.

## Problem

`scripts/check.mjs` set `NEW_SHAPE_FROM = "2026-08-29"` on 2026-08-28,
assuming `river-revamp` would merge before that day's edition was written.
It did not merge. The daily cloud routine published the 2026-08-29 edition
under the OLD rules, and it is already live on `main`. GitHub tests this PR
by merging it with current `main`, so CI was judging that already-published
edition against the NEW rules and reporting 41 failures — a direct
violation of the branch's own "published editions are never restructured
after the fact" principle.

## Publisher's decision

Evan, 2026-08-29: move the cutover to **2026-09-01**. This grandfathers
2026-08-29, 2026-08-30, and 2026-08-31, and leaves buffer so a merge in the
next couple of days cannot make the date retroactive again.

## Change made

**`scripts/check.mjs`** (only file changed):

- `NEW_SHAPE_FROM` moved from `"2026-08-29"` to `"2026-09-01"`.
- Comment above it now explains the rules take effect with the first
  edition of September, and that 2026-08-29 through 2026-08-31 are
  grandfathered because they were written and published before this
  contract existed (keeping the existing 2026-08-24 Weather-ruling
  precedent citation).
- Added an explicit warning at the constant: if this branch has not merged
  before the cutover date, the constant must be moved forward again — a
  cutover date that has slipped into the past retroactively condemns
  editions written under the OLD rules. This is the exact trap that
  produced the 41 CI failures, spelled out so the next person who touches
  this constant doesn't repeat it.

## Other locations searched for the 2026-08-29 cutover

Searched the whole repo (`grep -rn "2026-08-29"`, plus targeted checks of
`EDITORIAL.md`, `PIPELINE.md`, and
`docs/superpowers/specs/2026-08-28-river-revamp-design.md`):

- `EDITORIAL.md`, `PIPELINE.md` — neither names a cutover date at all (they
  reference "the lead/brief contract" generically). No change needed.
- `docs/superpowers/specs/2026-08-28-river-revamp-design.md` — no cutover
  date stated. No change needed.
- `tests/gate.test.mjs:12` — explains why the test fixture must NOT use
  2026-08-29 (collision with the real file the cloud routine writes). This
  is a statement about file-collision safety, not the cutover value itself,
  and stays correct regardless of what `NEW_SHAPE_FROM` is set to. Left
  unchanged, per the task's own instruction that these far-future (2099-…)
  fixtures need no change.
- `docs/superpowers/plans/2026-08-28-river-revamp.md` (lines 16, 741, 811,
  1165, 1172, 1201) — the original implementation plan for this branch,
  dated 2026-08-28, with the old cutover baked into its own worked example
  and verification-step commands. Treated as a historical planning
  artifact describing what was originally planned/executed, not a live
  statement of current behavior — left unchanged, consistent with the
  instruction not to alter historical records.
- `docs/reviews/pr4-fixes-report.md:161` — a report of a specific past
  verification run, quoting the `NEW_SHAPE_FROM` value in effect at that
  time. A historical report describing what was true then — left
  unchanged.

No file other than `scripts/check.mjs` was modified.

## Verification

### 1. `npm test`

88/88 pass (unchanged test count, all green).

### 2. `npm run lint`

Exit 0, no output (clean).

### 3. 2026-08-29 now passes under the new cutover

Fetched the real published edition and its supporting data files from
`origin/main` (the bulletin markdown, two Reddit voice-card JSON files, one
video JSON file, one graphic JSON file, and the AISD deficit chart PNG —
all needed for the check to evaluate the edition as actually published),
placed them temporarily, ran the check, then deleted every temporary file.

```
$ npm run check -- 2026-08-29 --no-links
check: 2026-08-29 passes the mechanical gate
check: this does not replace gate checks 2 and 6 — read the page.
EXIT=0
```

`git status --short` after cleanup: only `scripts/check.mjs` modified.
Nothing was committed for the bulletin or its data files (they belong to
`main`).

### 4. Gate still engages past the new cutover (2099-06-01 fixture)

Copied the same published edition to `src/bulletins/2099-06-01.md`,
rewriting front matter `date:` to `2099-06-01` and `permalink:` to
`/2099/06/01/` (title left as-is, which produces one expected, unrelated
front-matter-title FAIL — not a River-shape rule), restored the same
temporary supporting data files, and ran the check:

```
$ npm run check -- 2099-06-01 --no-links
...
FAIL  [river] brief is 65 words (cap 35): ...
  (29 more brief-length FAILs)
FAIL  [river] river is 2215 words (fails above 2200)
FAIL  [visuals] 1 voice card(s) in the River, EDITORIAL wants at least 4
FAIL  [visuals] no graphic in the River; EDITORIAL wants at least one
FAIL  [visuals] Public safety & courts runs 495 words with no visual (cap 400)
FAIL  [visuals] Texas runs 644 words with no visual (cap 400)
...
check: 42 problems in 2099-06-01. Do not publish.
EXIT=1
```

These are exactly the new-shape rules (35-word brief cap, 2200-word River
cap, 4-voice-card minimum, 400-word beat-without-visual cap) firing against
an edition that was written under the OLD rules and only fails because its
date is now past the (moved) cutover — proving the gate is still live.
Deleted the fixture and all temporary data files afterward;
`git status --short` returned to only `scripts/check.mjs` modified.

### 5. Six-edition parity (unchanged)

```
2026-08-23 -> exit 1   (FAIL, pre-existing)
2026-08-24 -> exit 1   (FAIL, pre-existing)
2026-08-25 -> exit 0   (PASS)
2026-08-26 -> exit 0   (PASS)
2026-08-27 -> exit 0   (PASS)
2026-08-28 -> exit 0   (PASS)
```

Matches the required baseline exactly — moving the cutover past all six of
these dates does not change any of their results, as expected (they were
already pre-cutover under the old date too).

### 6. `npm run build`

Exit 0. Wrote 12 files from the 6 real files in `src/bulletins/`.
`git status --short` clean except `scripts/check.mjs`; no bulletin file
committed.

## Concerns

- None outstanding. The fix is a single-constant date move plus comments;
  no other threshold or rule was touched, per the constraint.
- Flagging for awareness, not action: the same trap can recur on
  2026-09-01 if this branch still hasn't merged by then. The new warning
  comment exists specifically so whoever is here for that sees it before
  CI does.
