# Daily Pipeline — The Austin Bulletin

Run this procedure once each morning. Also runnable any time on demand.
Before starting, read `EDITORIAL.md` in full.

## Step 1 — Gather

Web-search the last 24 hours of Austin and Texas news from the trusted
outlets listed in EDITORIAL.md. Also fetch today's forecast and any
active alerts from weather.gov/ewx. Collect candidate stories with URLs.

Gather mechanics (verified 2026-08-23): check the outlets' RSS feeds first,
filter items by pubDate to the last 24 hours, then fetch the article text of
anything you might use. Known-good feeds: KXAN https://www.kxan.com/feed/,
FOX 7 https://www.fox7austin.com/rss/category/news, KVUE
https://www.kvue.com/feeds/syndication/rss/news/local, CBS Austin
https://cbsaustin.com/news/local.rss, Texas Tribune
https://feeds.texastribune.org/feeds/main/. KXAN and KVUE article pages
return HTTP 403 to curl and most fetchers (bot filter) — try WebFetch, then
a reader proxy; if an article's text still cannot be read, the story is
unverifiable: drop it and record the drop in the log. Weather comes from the
NWS API with a User-Agent header: forecast
https://api.weather.gov/gridpoints/EWX/156,91/forecast and active alerts
https://api.weather.gov/alerts/active?zone=TXZ192.

## Step 2 — Select

Pick exactly 5 stories. Priority: impact on daily life in Austin (safety,
schools, transportation, cost of living, weather, city government), then
major Texas news. Order by importance. Check recent bulletins in
`src/bulletins/` to avoid repeating a story with no new development.

## Step 3 — Write

Create `src/bulletins/YYYY-MM-DD.md` for today, copying the exact front
matter and section structure of the newest existing bulletin file:
morning note, "## Top stories" (### headline + summary + image + source
line per story), "## Weather", optional "## In brief" (3–5 one-line items,
each opening with a bold one-word category label). Set
`permalink: "/YYYY/MM/DD/"`. Every rule in EDITORIAL.md applies to every
sentence. "Today" means the date in America/Chicago (`TZ='America/Chicago' date`),
never UTC.

## Step 4 — Illustrate

One image per story, chosen by the image rules in EDITORIAL.md. When a
story falls to rule 3, generate its illustration:

    npm run illustrate -- YYYY-MM-DD <slug> "<one-sentence subject>"

The subject is a plain description of what to draw (for example "a
high-voltage transmission tower crossing dry Texas hill country"), never
a real person. The script needs `GEMINI_API_KEY` in the environment; it
writes `src/images/YYYY-MM-DD/<slug>.jpg` and prints the exact markdown
to paste under the story. The image is committed with the bulletin. If
generation fails (no key, network error, or a refusal), run the story
without an image and say so in the log.

## Step 5 — Build & publish

If `node_modules` is missing (every fresh clone), run `npm ci` first. Then
run `npm run build`. Then run the full pre-publish quality gate from
EDITORIAL.md. When every check passes:

Write today's log (Step 6) first — the commit below stages `logs/`.

    git add src/bulletins/ src/images/ logs/
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
The live site keeps yesterday's bulletin. Write the failure and its cause
to `logs/YYYY-MM-DD.md`, then commit and push the log only — never the
bulletin file. (An unpushed commit in a cloud workspace is lost when the
run ends; a log-only push is safe because the site rebuilds unchanged.)
