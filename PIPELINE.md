# Daily Pipeline — The Austin Bulletin

Run this procedure once each morning. Also runnable any time on demand.
Before starting, read `EDITORIAL.md` in full.

## Step 1 — Gather

Web-search the last 24 hours of Austin and Texas news from the trusted
outlets listed in EDITORIAL.md. Also fetch today's forecast and any
active alerts from weather.gov/ewx. Collect candidate stories with URLs.

## Step 2 — Select

Pick 6–8 stories. Priority: impact on daily life in Austin (safety,
schools, transportation, cost of living, weather, city government), then
major Texas news. Order by importance. Check recent bulletins in
`src/bulletins/` to avoid repeating a story with no new development.

## Step 3 — Write

Create `src/bulletins/YYYY-MM-DD.md` for today, copying the exact front
matter and section structure of the newest existing bulletin file:
morning note, "## Top stories" (### headline + summary + image + source
line per story), "## Weather", optional "## In brief" (3–5 one-line
items). Set `permalink: "/YYYY/MM/DD/"`. Every rule in EDITORIAL.md
applies to every sentence.

## Step 4 — Illustrate

One image per story, chosen by the image rules in EDITORIAL.md.

## Step 5 — Build & publish

Run `npm run build`. Then run the full pre-publish quality gate from
EDITORIAL.md. When every check passes:

    git add src/bulletins/ logs/
    git commit -m "bulletin: YYYY-MM-DD"
    git push

GitHub Pages deploys automatically.

## Step 6 — Report

Write `logs/YYYY-MM-DD.md` (before the commit in Step 5) containing:
published yes/no, story count, embeds used, images by type, any facts
you were unsure about, any stories dropped and why. On Sundays, add the
weekly balance check from EDITORIAL.md.

## Failure behavior

If any step fails (no internet, build error, gate failure): do not push.
The live site keeps yesterday's bulletin. Write the failure and its
cause to `logs/YYYY-MM-DD.md` and commit only the log if possible.
