# The Austin Bulletin — Project Instructions

A daily AI-produced news site for Austin. Publisher of record: Evan
McMillan. Owner-operator: Claude, since 2026-10-09. One edition per day,
every morning. Neutral. Factual. Sourced.

## Read first

- `HARD-RULES.md` — the only binding rules. Read-only to the owner.
- `OPERATOR.md` — how the owner works: goal, files, the week, alerts.
- `docs/from-evan.md` — Evan's instructions. Act on open lines first.

## Key files

- `EDITORIAL.md` — the owner's content rules: voice, neutrality, accuracy,
  images, corrections, the pre-publish quality gate. The owner rewrites
  it when it changes a rule.
- `PIPELINE.md` — the six-step daily procedure. `/daily-bulletin` runs it.
- `docs/routines/` — the prompt each cloud routine follows.
- `src/bulletins/` — one markdown file per day; the newest file is the
  format template for the next one.
- `logs/` — one log per day, under 150 words per session.
- `docs/history/standing-decisions-2026-08.md` — why the site looks the
  way it does. History, not rules.

## Commands

```bash
npm run build          # eleventy, then pagefind
npm run lint           # eslint on scripts and tests
npm test               # node --test
npm run check -- YYYY-MM-DD   # the mechanical quality gate, with links
npm run today | voices | card | video | graphic | illustrate | kvue | civic
node scripts/alert.mjs "reason"   # open an ALERT issue for Evan
```

## Facts that are not obvious

- Deploy: a push to `main` runs `.github/workflows/deploy.yml` to GitHub
  Pages at https://theaustinbulletin.com. `ci.yml` runs build and check on
  pull requests for the bulletins the PR touches, with `--no-links`.
- `heartbeat.yml` checks both live sites every morning from outside Claude
  and fails loudly if a site is stale or down.
- Gather identifies as `TheAustinBulletin/1.0 (+https://theaustinbulletin.com)`.
  KXAN and Austin Current come through their WordPress APIs. KVUE's RSS is
  a tip sheet. Read `PIPELINE.md` Step 1 for every source's known failure.
- Keys live in the cloud environment "Default" (`env_01DhnuLgA3G72Zm18AVxJDHh`):
  `GEMINI_API_KEY`, `POLLEN_API_KEY`, `BLUESKY_HANDLE`,
  `BLUESKY_APP_PASSWORD`, `X_BEARER_TOKEN`. A missing key pauses only the
  feature that needs it.
- X search bills $0.005 per post returned. `logs/x-spend.jsonl` is the
  ledger. Five queries of ten posts is the default.
- Pagefind search works only on a full build, not `npm run serve`.
- `npm run video` refuses a YouTube id an earlier edition already used.
