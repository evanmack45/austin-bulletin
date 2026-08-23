# The Austin Bulletin — Project Instructions

This repo is a daily AI-produced news site for Austin and Texas,
supervised by its publisher, Evan. One bulletin per day, every morning.
Neutral. Factual. Clean.

## Key files

- `EDITORIAL.md` — binding rules for voice, neutrality, accuracy,
  images, corrections, and the pre-publish quality gate.
- `PIPELINE.md` — the six-step daily procedure. `/daily-bulletin` runs it.
- `src/bulletins/` — one markdown file per day; the newest file is the
  format template for the next one.
- `logs/` — one run log per day; the publisher's spot-check signal.

## Working agreements

- Evan gives feedback conversationally: corrections, design opinions,
  tone notes, feature ideas. When feedback is accepted, WRITE IT DOWN —
  update EDITORIAL.md, the templates/CSS, or the Standing decisions list
  below in the same session. Feedback that lives only in a chat is lost.
- Never weaken the neutrality or accuracy rules without an explicit,
  confirmed request from Evan.
- Corrections to published bulletins are visible, never silent.
- Site changes beyond the daily bulletin (design, new sections) happen
  only when Evan asks; propose, don't surprise.

## Standing decisions

- 2026-08-23: Plain date titles, no puns. Morning note = warm local
  voice, zero politics. Top stories (6–8) + Weather + optional In brief.
  No sports/podcasts/newsletter/comments at launch. Max 2 embeds per
  bulletin. No AI-disclosure footer on bulletins; the About page carries
  the disclosure. Eleventy + GitHub Pages.
