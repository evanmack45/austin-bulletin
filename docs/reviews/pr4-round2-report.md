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
