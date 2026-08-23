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
- 2026-08-23: Visual identity (Evan's pick): "Broadsheet" — blackletter
  nameplate (UnifrakturMaguntia), Source Serif 4 text, oxblood accent
  #7a1f1f, on limestone paper #f6efe2. Centered masthead with kicker line
  and double-rule folio; the page heading is the edition date, not the
  full title. Design reference canvas:
  https://claude.ai/code/artifact/5be54bfb-313a-44d8-b139-c6ddbcc4aa2c
- 2026-08-23: The daily run is a Claude Code cloud routine,
  "austin-bulletin-daily" (cron 0 11 * * * UTC ≈ 6:07 a.m. Central,
  model claude-opus-5, environment "Default" env_01DhnuLgA3G72Zm18AVxJDHh —
  the environment with network egress; the "Default Cloud Environment"
  blocks outbound fetches). Manage or run it at
  https://claude.ai/code/routines. Manual catch-up: run /daily-bulletin in
  any session in this repo.
