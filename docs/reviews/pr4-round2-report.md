# PR #4 round-2 review fixes

Branch: `river-revamp`. Commit: `2655c39` ("fix: address five PR #4
round-2 review findings"). Not pushed; not merged.

## Summary

All five findings from the second review round were fixed on top of the
existing 78 tests, which still pass unmodified. 10 new tests were added
(88 total). `npm run lint` is new and clean. The six-edition parity check
is unchanged from before this round.

## FIX 1 — graphic.mjs render regression (P1)

`scripts/graphic.mjs` now prints a real `<img src="..." alt="...">` tag
inside `<figure class="graphic">` instead of Markdown image syntax, so
markdown-it's raw-HTML-block handling (which was silently skipping the
`![alt](path)` line) no longer swallows the image. `alt`, `src`, and the
caption's `source` field are all HTML-escaped via the existing `esc()`
helper already in graphic.mjs (same escaping rules as eleventy.config.js's
`escapeHtml`, just `&apos;` instead of `&#39;`).

New test: `tests/graphic-render.test.mjs`. It runs the real
`node scripts/graphic.mjs` in a temp dir to get graphic.mjs's actual
current output (not a hand-typed stand-in), embeds it in a fixture
bulletin, runs the real Eleventy build via `node_modules/.bin/eleventy
--config=<repo>/eleventy.config.js`, and asserts the built HTML has a real
`<img src="/images/2099-01-03/test-chart.png" ...>` and no literal `![`.
Fixture lives entirely in `os.tmpdir()` (copy of `src/` minus
`bulletins/`, plus one synthetic-dated file) — `src/bulletins/` itself is
never touched.

`river.mjs`'s `visualKind()` still keys off `<figure class="graphic"`, so
it still classifies the new output as `graphic`, and a bare `![...]` is
still `image` — unchanged, confirmed by existing + new tests.

## FIX 2 — malformed headings (P1)

`river.mjs` now uses exact regexes — `BEAT_HEADING_RE = /^####\s+(.+)$/`
and `LEAD_HEADING_RE = /^#####\s+(.+)$/` — tested against a block's first
line, exported so `scripts/check.mjs`'s own beat-heading scan builds its
global/multiline regex from the same `.source` rather than a second
hand-typed pattern. `####Schools` (no space) is no longer read as a beat;
its content (and everything after it, since no beat context is
established) is now rejected by `checkItemBeats` as ungrouped.

## FIX 3 — empty declared beats (P2)

New `checkEmptyBeats()` in `river.mjs` fails any beat whose `items` array
is empty, naming the beat, e.g. `"Roads & transit is a declared beat with
zero items; EDITORIAL says missing beats are omitted, never padded."`

## FIX 4 — visual_exception bypass (P2)

`substantiveWords()` now counts **distinct** word-like tokens (3+ letters,
case-insensitive dedup) instead of any token merely containing a letter or
digit. `isSubstantiveException` requires 4+ of these alongside the
existing 20-char floor. `"a a a a ...................."` no longer
qualifies (all tokens are single letters). EDITORIAL.md and PIPELINE.md
prose updated to match exactly.

## FIX 5 — line length / lint (P2)

Wrapped all lines over 100 chars in `scripts/river.mjs` (9),
`eleventy.config.js` (11), `tests/river.test.mjs`, `tests/acronyms.test.mjs`,
and `tests/gate.test.mjs`. Added `eslint.config.mjs` (flat config,
`complexity: 8`, `max-lines-per-function: 100`, `max-len: 100`) covering
`scripts/river.mjs scripts/acronyms.mjs tests/`, a `lint` script in
`package.json`, and a `Lint` step in `.github/workflows/ci.yml` before
`Unit tests`. `scripts/check.mjs` is deliberately excluded, with an
inline comment stating it's a known deferral (201 lines/complexity 79,
inherited at 181/67 before this branch) — not an inline ignore claiming
it's unfixable.

## Verification

**`npm test`**: 88/88 pass (was 78; +10 new).

**`npm run lint`**: clean, no output, exit 0.

**FIX 1 render proof** (from the new test, built HTML):
```html
<img src="/images/2099-01-03/test-chart.png" alt="Storms, outages: 7,000 customers; officials said &quot;restored&quot; &amp; &lt;safe&gt; now">
```
No literal `![` anywhere in the built page. Reverting graphic.mjs's img
line back to `![alt](path)` reproduces the original bug exactly: zero
`<img>` tags, literal `![Test chart alt]...` in the built HTML (confirmed
manually before writing the permanent test).

**Four re-confirmations** (direct `parseRiver`/`checkRiver` calls, not
just the test suite):
- `####Schools` (no space): 0 beats parsed; `checkItemBeats` fails all 3
  items as "outside every beat heading".
- Empty declared beat: fails with `"Roads & transit is a declared beat
  with zero items; EDITORIAL says missing beats are omitted, never
  padded."`
- `"a a a a ...................."`: rejected (`too short`); the real
  sentence `"No public posts about Austin were worth carrying as cards
  today"` is accepted.
- Zero lines over 100 chars across `scripts/river.mjs`, `scripts/acronyms.mjs`,
  and all `tests/*.mjs` files (verified with Node's own `.length`, matching
  ESLint's counting — a byte-counting `awk` check falsely flagged one line
  containing "↗", a single UTF-16 code unit that ESLint counts as 1 char).

**Mutation-check table** (break → confirm test/lint fails → restore, all
verified in this session):

| Fix | Mutation | Result while mutated | Restored |
|---|---|---|---|
| FIX 1 | Reverted `<img>` line back to `` `![${spec.alt}](${publicPath})` `` | Render test fails: no `<img>` found in built HTML, literal `![...]` present | Pass |
| FIX 1 | Removed `esc()` around `spec.alt` | Render test fails: `<img>` regex doesn't match (broken attribute quoting) | Pass |
| FIX 2 | Reverted `isBeatHeading` to `block.startsWith("####")` | Both malformed-heading tests fail (`TypeError` — heading is mis-parsed as valid) | Pass |
| FIX 3 | Removed `checkEmptyBeats(parsed, bad)` call from `checkStructure` | "a declared beat with zero items fails" test fails | Pass |
| FIX 4 | Reverted `substantiveWords` to old any-alnum-token counting | "'a a a a ....' rejected" and "'x y z w ....' rejected" tests fail | Pass |
| FIX 5 | Injected a 113-char comment line into `river.mjs` | `npm run lint` reports `max-len` error | Clean |

Note: the "'aaaa aaaa aaaa aaaa' is rejected" test does not discriminate
against removing just the distinctness dedup — that string is already
blocked by the pre-existing 20-non-whitespace-char floor regardless
(16 chars). It still correctly asserts the required behavior (the task's
literal example must reject), just isn't a mutation-sensitive test for
the distinctness feature specifically; the "a a a a ...." test (the
actual reported reproduction) is the one that discriminates.

**Six-edition parity — unchanged**: 2026-08-23 FAIL, 2026-08-24 FAIL
(both pre-existing, pre-cutover), 2026-08-25/26/27/28 PASS.

**`npm run build`**: exits 0. `git status --short`: clean after commit.
No file under `src/bulletins/` was touched at any point (confirmed via
`git diff --stat` before committing).

## FIX 6 — `--dir` accepts no value or a flag as its value (follow-up)

Branch: `river-revamp`. Commit: `1300352` ("fix: reject --dir with no
value or a flag as its value"). Not pushed; not merged.

A further Copilot review comment on PR #4 pointed at `scripts/check.mjs`'s
`--dir` flag parsing (`else if (a === "--dir") args.dir = argv[++i];`),
claiming it crashes with a `path.resolve` stack trace when `--dir` has no
value. Reproducing it showed the claimed mechanism was wrong — line ~154
already guards with `args.dir ? path.resolve(args.dir) : <default>` — but
the actual behavior was worse in one case and confusing in the other:

- `--dir` last (no value): `args.dir` is `undefined`, the ternary silently
  falls back to the default `src/bulletins`, and the check runs against
  live content and **exits 0** — a caller who believes they pointed the
  checker at a fixture directory gets a green result from production
  content.
- `--dir --no-links` (flag consumes the next flag as its value): produces
  `check: no bulletin at --no-links/2026-08-28.md` and exits 1, silently
  discarding the `--no-links` the caller asked for.

**Fix**: `parseArgs` now validates `--dir`'s value — it must exist and
must not start with `-`. If invalid, it prints `check: --dir requires a
path argument` and exits 1 immediately, matching the style of the
existing malformed-date error (`check: date must be YYYY-MM-DD`). The
usage comment at the top of `scripts/check.mjs` documents the
requirement.

**Tests added** to `tests/gate.test.mjs` (90 total, up from 88): `--dir`
as the final argument, and `--dir --no-links`, both asserted non-zero
exit with an error mentioning `--dir`; the first also asserts the output
does not contain the success message (`passes the mechanical gate`) or a
problem-count line for the default directory, ruling out the silent
fallback. The existing `--dir <real temp path>` gate tests were run
unchanged and still pass.

**Mutation-check**: reverted `parseArgs` to the unvalidated one-liner,
ran the two new tests — both failed (as expected, reproducing the
original silent-fallback and flag-swallowing behavior) — then restored
the fix and reran; all 90 tests pass again.

**Verification** (all run in this session):
- `npm test`: 90/90 pass.
- `npm run lint`: clean.
- `node scripts/check.mjs 2026-08-28 --no-links --dir` → exit 1,
  `check: --dir requires a path argument`.
- `node scripts/check.mjs 2026-08-28 --dir --no-links` → exit 1, same
  message.
- `node scripts/check.mjs 2026-08-28 --no-links --dir <temp dir>` → exit
  0, `check: 2026-08-28 passes the mechanical gate` (unchanged from
  before this fix).
- Six-edition parity unchanged: 2026-08-23 FAIL, 2026-08-24 FAIL (both
  pre-existing), 2026-08-25/26/27/28 PASS.
- `npm run build`: exits 0. `git status --short`: clean after commit. No
  file under `src/bulletins/` was touched.

Only `scripts/check.mjs` and `tests/gate.test.mjs` were touched; no
threshold or rule changed.

## FIX 7 — an ungrouped visual satisfied the visual minimums (follow-up)

Branch: `river-revamp`. Commit: `4d78828` ("fix: fail a visual before the
first beat heading as ungrouped"). Not pushed; not merged.

A further Copilot review comment on PR #4 pointed at `applyVisual()` in
`scripts/river.mjs`: it incremented the River-wide visual totals
(`visuals.voice`/`video`/`graphic`/`image`) even when `current` (the
active beat) was `null` — i.e. a visual sitting before the River's
first `####` heading. Reproducing it showed this is worse than a
counting quirk: stacking all six visuals (4 voice cards + 1 video + 1
graphic) before the first beat heading, with three beats each under
400 words (so the per-beat density rule can't catch it either), passed
`checkRiver` with **zero problems**. Every visual minimum exists solely
to break up the River's wall of text — the finding that made five of
seven readers quit the live site — so an interruption-free visual
defeated their entire purpose.

Copilot's own suggestion (stop counting an ungrouped visual toward the
totals) was rejected: it would turn four voice cards in the source
into a confusing `"0 voice card(s) in the River"` failure, with no clue
what to fix. Instead, `river.mjs` now treats an ungrouped visual
exactly like an ungrouped item already is:

- `parseRiver` records every visual in a new `visualList` array —
  `{ kind, beat, id }`, with `beat: current?.name ?? null` — alongside
  the existing `visuals` count totals (unchanged: a visual still counts
  toward the aggregate totals whether grouped or not, matching how
  ungrouped items still count toward `items.length`).
- A new `visualId()` helper pulls the quoted id out of a
  `{% voice %}`/`{% video %}` shortcode, or the `src`/path out of an
  `<img>`/Markdown image, for the failure message.
- A new `checkVisualBeats()` (called from `checkStructure`, right after
  `checkItemBeats`) fails every visual with `beat === null`, e.g.
  `"voice card is outside every beat heading (reddit-abc123)"` or
  `"graphic is outside every beat heading (/images/2026-08-28/x.png)"`.
- `applyVisual` was renamed `recordVisual` (not exported, so no
  signature to preserve) and now takes the raw `block` and `visualList`
  in addition to its previous parameters.

No threshold changed, and `checkRiver`'s `{ problems, warnings,
exceptionApplied, visualException }` return shape is unchanged.
`parseRiver`'s returned object gained one field (`visualList`); no
existing field's meaning changed.

**Tests added** to `tests/river.test.mjs` (93 total, up from 90):
- The exact reported reproduction (six visuals before the first beat
  heading, three sub-400-word beats) now fails with six named
  problems, one per ungrouped visual — confirmed `parsed.visualList`
  really does carry `beat: null` for all six before asserting on
  `checkRiver`'s output, so the test exercises the real shape rather
  than a stand-in.
- The same visuals placed correctly inside beats still satisfy every
  minimum (voice, graphic, video) with no ungrouped failure.
- A visual inside a beat still counts toward that beat's `visuals`
  total and (for voice) its `voice` count, and the pre-existing
  per-beat cap (`voicePerBeat`) and density rule (`beatWordsBeforeVisual`)
  both still fire exactly as before.

**Mutation-check**: reverted `scripts/river.mjs` only (`git stash push
-- scripts/river.mjs`) with the new tests left in place. The
reproduction test failed immediately — not a soft assertion failure
but a `TypeError: Cannot read properties of undefined (reading
'filter')`, since `parsed.visualList` doesn't exist without the fix —
confirming the test genuinely depends on the change. The other two new
tests (visuals correctly grouped; per-beat counts) passed even
unmutated, as expected, since they assert behavior that was already
correct. Restored (`git stash pop`); all 93 tests pass again.

**Verification** (all run in this session):
- `npm test`: 93/93 pass.
- `npm run lint`: clean, no output.
- Direct reproduction script (`parseRiver`/`checkRiver`, not just the
  test suite) — **before** the fix: `checkRiver problems: 0`. **After**
  the fix: `checkRiver problems: 6`:
  ```
  voice card is outside every beat heading (a)
  voice card is outside every beat heading (b)
  voice card is outside every beat heading (c)
  voice card is outside every beat heading (d)
  video is outside every beat heading (a)
  graphic is outside every beat heading (/images/x.png)
  ```
- Six-edition parity unchanged: 2026-08-23 FAIL, 2026-08-24 FAIL (both
  pre-existing), 2026-08-25/26/27/28 PASS (`--no-links`, to avoid an
  unrelated live-link timeout on 2026-08-28 unrelated to this fix).
  Confirmed none of the six editions' check output contains "outside
  every beat heading" for a visual — the fix does not false-positive on
  real content.
- `npm run build`: exits 0. `git status --short`: clean after commit.
  No file under `src/bulletins/` was touched at any point.

Only `scripts/river.mjs` and `tests/river.test.mjs` were touched; no
threshold or rule changed.
