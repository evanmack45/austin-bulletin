# S-10 · Homepage outcomes board (Kiln comp, 2026-11-13)

Comp: `mock.html` + `outcomes.css` (built by `build.py` from the live Nov. 12 homepage, `board.html` is the new section). Frames: `frames/`. Live baseline: `live/`. Metrics: `metrics.json`, `live/wordcount-live.json`.

## What changes
- Replace the `ul.week-outcomes` text cards with one night-stage board: `section.story-card.story-card--outcomes`. The hero block stays byte-for-byte. "This week · 3 items" moves to its own `story-card--week` card below, unchanged.
- The whole board is one graphic: night background, tiles separated by 1px `--night-rule` lines, no per-tile borders or radii, no white cards.

## Layout
- **390 / 360:** 2-col grid inside the board, `grid-template-columns: minmax(0,1.03fr) minmax(0,.97fr)` (C gets the slightly wider column so its Sources row keeps room; only row 3 uses both columns). Row 1: A full width (lead). Row 2: B full width. Row 3: C | D. Row 4: E full width. Tile padding 14px; board has no padding; kicker row 14/16px.
- **≥1024 (1280):** board `grid-column: 1 / -1; grid-row: 2` (This week → `grid-row: 3`). 12-col grid: A cols 1–8 row 1, C cols 9–12 row 1, B cols 1–8 row 2, D cols 9–12 row 2, E cols 1–12 row 3 (number, label and both briefing links on one line; Sources row under, left). Tile padding 18/20px.
- A and B always have the same width, so their bars share one scale.

## Tiles (data mapping, all from `editionCardData["2026-11-10"]`)
| Tile | Live card id | Mark | Big number | Label (one line) | Note |
|---|---|---|---|---|---|
| A lead | county-court-weighs-197-million-in-borrowing-for-2027-projects | Bar, full track = $197.1M; last 6.85% (+$13.5M) in `--data-1-night` + right-aligned callout "+$13.5M added" in same blue; sun end dot | $197.1M | 2027 borrowing approved | — |
| B | 678-million-contract-for-new-star-flight-helicopters-is-up-today | Bar at 34.38% (67,757,745.12 / 197.1M) of the same track, sun end dot; axis row "$0 … $197.1M" | $67.8M | STAR Flight contract approved | Called unanimous; vote record not posted |
| C | kaskade-origin-permit | 4 sun squares (one per "for" vote; no squares for 0 against) | 4‑0 (U+2011) | Kaskade permit | Approved for `<span class="nb">Nov.&nbsp;20&#8209;21</span>` event (`.nb{white-space:nowrap}`; the date never splits, line breaks before it on phone) |
| D | county-could-start-work-on-a-2027-bond-election-today | bank icon in tag | "No action" (word mark) | Bond committee | Closed session |
| E | cwep-barton-springs-balcones-briefing + cwep-pease-park-briefing (same meeting, same two sources) | drop / tree icons on each row link | 2 | Briefings, no votes | rows: Barton Springs aquifer · Pease Park restoration |

- Tag line on every tile: icon (Phosphor bold from `src/icons/`, 20px, `--sun`) + body: "County court" (A–D), "Council committee" (E). Icons: currency-dollar (A, B), gavel (C), bank (D). No other icon sources.
- Links: each tile's label `<a>` goes to `/2026/11/10/#<card id>` and stretches over the tile (`::after { inset: 0 }`); the Sources row sits above it (`z-index: 1`). E has two row links (44px each), one per story; its label is not a link.
- Bar math in data, not CSS by hand: `--w = amount / max(amounts)`, `--x` = start of the increase segment = (197.1 − 13.5) / 197.1.

## Sizes and type (tokens from `tokens.css`)
- Big number: Bricolage 800, wdth 80, lh .95, `--sun`, tnum. A = `--fs-bignum` (64px phone / 112px desktop). B, C, E = 44px phone / 56px desktop; C = 80px desktop. Word marks (D) = 32px / 40px.
- Label: Bricolage 700, `--on-night`. A 22px / 28px; B, E 18px; C, D 16px on phone (keeps one line at 360), 18px desktop.
- Tag and axis: 13px, 650, `--chart-label`. Note: 15px, 450, `--chart-label`.
- Bars: 12px tall phone / 14px desktop, left radius 6px, 16/18px end dot; track 2px `--chart-muted` full width.
- Tally squares: 18px phone / 26px desktop, radius 3/4px, gap 5/6px.
- Colors: `--night` stage, `--night-rule #2C4A6B` (new), `--night-hover #143557` (new, hover/focus-within), `--sun`, `--data-1-night`, `--chart-muted`, `--chart-label`, `--on-night`, `--on-night-meta`. Focus: `--focus` drawn inset on the tile.

## Sources row (every tile, exactly one)
- `p.t-src`: always "Sources:" with a colon, on every tile, even with one link (C, D), 13px phone / 14px desktop, `--on-night-meta`, links underlined.
- `display:flex; flex-wrap:nowrap; column-gap:6px`; label, mid-dot and links are each `inline-flex; align-items:center; min-height:44px` → one baseline, dot centred, 6px each side, 44px tap. Measured 6.0/6.0px on every row at 360/390/1280, fonts loaded and blocked; every row one line; tightest slack 8px (C at 360, fonts loaded; 15px with the font blocked).
- Home-only label change: "Meeting video" → "Video" (same URLs), so D fits one line at 360 without shrinking type. Use the existing `HOME_LABELS` path in `thisWeek.js`. If a future tile has more links than fit, show the first ones and a native `<details>` "+N more" (44px) on the same line; never shrink gaps or type.

## Word count (visible, `data-budget-exempt` = source rows)
- Live section (kicker + 6 cards): **99** words without sources, **123** with.
- Comp board: **57** without sources, **72** with. (Counted in `metrics.json` → `words_budget`, `words_all`.)

## Drop "CHART · NOT A PHOTOGRAPH" sitewide (both sites; image alt, caption, in-image text)
- Bulletin: `src/_includes/runoff-calendar.njk:2` ("Chart · Not a photograph" label → remove or "Chart"); `src/bulletins/2026-11-04.md:17-18` (alt starts "Chart, not a photograph.", caption ends "Not a photograph."); `src/bulletins/2026-11-05.md:18` (alt starts "CHART · NOT A PHOTOGRAPH."); in-image text `src/images/2026-11-04/election-results.svg:4` and `src/images/2026-11-05/parking-311.svg:5` (re-export the rasters); tests that assert it: `tests/edition-images.test.mjs:188`, `tests/front-cover-build.test.mjs:254`, `tests/lead-photos.test.mjs:88-105`.
- YCH: `site/src/lib/chart-first.ts:5` `CHART_NOTE` → "Chart. Agenda amounts; bars to scale." (used as MoneyChart `aria-label` and `.chart-note`).
- Keep a short Chart line with its source: alt "Chart: …", caption "Chart: <source>". The Nov. 12 home hero already reads "Source: City of Austin, …" with alt "Chart: …"; no change there. LICENSE.txt provenance notes can keep their wording (not reader-facing).

## Do not touch
Hero block, masthead, This week list, signup, footer and the AI disclosure line. No bylines, first person or "our take".

## Checks for the build
- 360/390/1280, reduced motion, DSF 1: no horizontal scroll; every label one line; every Sources row one line with 6px dot gaps and 44px links (font blocked and loaded); A and B bar tracks equal width; B fill ÷ (A fill + increase segment) = 0.344 (measured 110/320px at 390, 236/686px at 1280).
