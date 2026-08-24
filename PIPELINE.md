# Daily Pipeline — The Austin Bulletin

Run this procedure once each morning. Also runnable any time on demand.
Before starting, read `EDITORIAL.md` in full.

## Step 1 — Gather

Web-search the last 24 hours of Austin and Texas news from the trusted
outlets listed in EDITORIAL.md. Also fetch today's forecast and any
active alerts from weather.gov/ewx. Collect candidate stories with URLs.

Identify yourself honestly on every fetch. The standard User-Agent for all
gathering is:

    TheAustinBulletin/1.0 (+https://theaustinbulletin.com)

Never send a browser User-Agent we are not, and never present as a named
crawler. Several outlets disallow AI training crawlers (GPTBot, CCBot,
PerplexityBot, Google-Extended, Applebot-Extended, FacebookBot) in
robots.txt; we are none of those and must not imitate one. Read an outlet's
robots.txt before adding a new fetch path, and respect it.

Gather mechanics (verified 2026-08-23, revised 2026-08-24): check the
outlets' RSS feeds first, filter items by pubDate to the last 24 hours, then
fetch the article text of anything you might use. Known-good feeds:
FOX 7 https://www.fox7austin.com/rss/category/news, CBS Austin
https://cbsaustin.com/news/local.rss, Texas Tribune
https://feeds.texastribune.org/feeds/main/, Community Impact
https://communityimpact.com/rss/austin/. Those four read fine over plain
curl, feed and article text alike.

**KXAN — use the WordPress REST API, not RSS.** It is open to an honest
User-Agent, returns the full article body, filters to the window in one
request, and is more complete than the RSS feeds (20 posts against 16 across
three feeds on 2026-08-24):

    https://www.kxan.com/wp-json/wp/v2/posts?per_page=100&orderby=date
      &after=YYYY-MM-DDTHH:MM:SS
      &_fields=date_gmt,link,title,content,excerpt

`content.rendered` is the full body — strip tags and decode entities. The
`X-WP-Total` and `X-WP-TotalPages` response headers confirm you have the
whole window; page through if `TotalPages` is above 1. Times in `after` are
site-local; `date_gmt` on each post is UTC. To pull one known article, use
`?slug=<the-url-slug>`. KXAN's robots.txt permits `/wp-json/`, `/amp/` and
article paths; it disallows `/wp-admin/`, site search, `/tag/` and `/page/`,
which we do not need. If the API is ever closed off, fall back to a reader
proxy (`https://r.jina.ai/<url>`) — that works but truncates long articles,
so prefer the API. Plain curl and WebFetch both get 403 on KXAN article
pages; do not waste a run retrying them.

**Austin Current — same WordPress API pattern**, and check it every morning:
it is the successor to the Austin Monitor and our best source for City Hall &
county and Schools.

    https://austincurrent.org/wp-json/wp/v2/posts?per_page=100&orderby=date
      &after=YYYY-MM-DDTHH:MM:SS
      &_fields=date_gmt,link,title,content,excerpt

Its robots.txt allows everything and `content.rendered` carries the full
article. It publishes about one story a weekday, so a 24-hour window will
usually hold one or two — but they are often the day's most substantial local
stories, and one item from here can outweigh five from anywhere else. If the
window is empty, widen it to 48 hours and use anything not already covered.

**KUT — discover from the homepage, not a feed.** KUT's article pages are
fully readable, but it has no usable RSS: `https://www.kut.org/index.rss`
returns an empty stub and the other common feed paths 404. Do not waste time
on them. Instead fetch `https://www.kut.org/` and extract links matching

    /<section>/YYYY-MM-DD/<slug>

The publish date is in the URL, so filtering to the window needs no extra
request. `https://www.kut.org/news-sitemap-content.xml` and
`https://www.kut.org/sitemap-latest.xml` list the newest one or two stories
with timestamps and are worth a look, but they are too thin to rely on alone.
Article body text sits in ordinary `<p>` tags and the page also carries
NewsArticle structured data.

**KVUE is discovery-only** (settled 2026-08-24; see EDITORIAL.md). Its
`/article/…` pages 403 to every route — curl, WebFetch, a reader proxy, the
`/amp/` and `/mobile/` variants. Its section pages return 200 but are
client-side shells with no article text, and no syndication feed carries
more than a ~120-character teaser. The one route that would work is its
content API under `/ajax/content/…`, which its own robots.txt disallows:
**do not use it.** Read
https://www.kvue.com/feeds/syndication/rss/news/local as a tip sheet, then
report anything worth having from a source we can read. Where no readable
source exists, a one-sentence relayed item is allowed — see "relayed item"
in EDITORIAL.md for what it may and may not say. Do not retry the article
pages.

When the only outlet on a story is one we cannot read, go to the primary
source before dropping it: the agency, department, district or court the
story is about. A fire, a road closure, a boil-water notice, a budget or an
indictment almost always has a public original — a PIO release, a council or
commissioners' agenda, a TCEQ notice, a court docket. Try that first; drop
the story only when the primary source is missing too, and log which of the
two failed.

**Austin American-Statesman** has no working RSS feed (all
`/arc/outboundfeeds/` paths 404). Article pages read fine; section pages
read through a reader proxy but are cached and mix in week-old stories, so
check each article's `datePublished` in the page JSON before using it.

If an article's text cannot be read by any permitted path, the story is
unverifiable: drop it and record the drop in the log. Weather comes from the
NWS API with a User-Agent header: forecast
https://api.weather.gov/gridpoints/EWX/156,91/forecast and active alerts
https://api.weather.gov/alerts/active?zone=TXZ192.

Widen the gather beyond outlet RSS: the outlets' YouTube channels
(`https://www.youtube.com/feeds/videos.xml?channel_id=…`), agency newsrooms
(City of Austin, Travis County, TxDOT Austin, APD, CapMetro, Austin Energy,
LCRA, Austin ISD, NWS Austin), Bluesky accounts, and r/Austin's top posts
(`https://www.reddit.com/r/Austin/top.json?t=day`, with a User-Agent).
Collect post URLs worth a Voice card.

Then fetch the day's glance numbers: `npm run today` (writes
`src/_data/glance/YYYY-MM-DD.json` from NWS, Open-Meteo, Water Data for
Texas, Google's Pollen API, and ERCOT; the pollen module needs
`POLLEN_API_KEY` in the environment). A module that fails is left out of
the strip and noted in the log; the run continues.

Then open the glance file and read each `blurb`. Rewrite any that reads
flat or misses the day's point, in the Morning Note's voice (EDITORIAL.md).

## Step 2 — Select

Find the day's idea first: two to four items that belong together become
the Big Story. Then fill the River: aim for 25–40 items across the beats
in EDITORIAL.md's fixed order; 5 is a failure, log it. Priority: impact on
daily life in Austin (safety, schools, transportation, cost of living,
weather, city government), then major Texas news. Order by importance.
Check recent bulletins in `src/bulletins/` to avoid repeating a story with
no new development.

## Step 3 — Write

Create `src/bulletins/YYYY-MM-DD.md` for today, copying the exact front
matter and section order of the newest existing bulletin file: the
morning note; `## The Big Story` inside `{% bigstory %}…{% endbigstory %}`
(### headline, optional `{% video %}`, paragraphs, a What's next line,
optional `{% voice %}` cards, a Sources line); `## The River` inside
`{% river %}…{% endriver %}` (`#### Beat` labels in the fixed order,
one paragraph per item ending in `<span class="src">OUTLET</span>`,
`{% voice %}` cards and a `<div class="standings">` table where they
earn it); `## Weather`; then `<aside class="the-number">`, a
`<p class="countdown">`, and a `<p class="good-thing">`. Set
`permalink: "/YYYY/MM/DD/"`. Every rule in EDITORIAL.md applies to every
sentence. "Today" means the date in America/Chicago
(`TZ='America/Chicago' date`), never UTC.

## Step 4 — Illustrate

Real voices first: `npm run card -- <post-url>` (X, Bluesky, Reddit;
`--manual` for Facebook) writes a card and prints the `{% voice %}` tag;
`npm run video -- <youtube-url>` does the same for an outlet's clip. Then
graphics, photos, AI, per EDITORIAL.md.

One image per story, chosen by the image rules in EDITORIAL.md. Reach for
an original graphic first:

    npm run graphic -- <spec.json>

Write the spec to `src/_data/graphics/YYYY-MM-DD-<slug>.json` (types:
`bars` for a short series of numbers, `timeline` for a sequence of dated
events, `map` for a place — see `scripts/graphic.mjs` for the fields).
Every number and date in a spec must come from a linked source. The
script writes `src/images/YYYY-MM-DD/<slug>.png` and prints the markdown
to paste. Maps need `GOOGLE_MAPS_API_KEY` (or the same key as
`POLLEN_API_KEY`).

When no graphic fits, fall to rules 2–4. For rule 4:

    npm run illustrate -- YYYY-MM-DD <slug> "<one-sentence subject>"

The subject is a plain description of what to draw, never a real person.
Needs `GEMINI_API_KEY`. Commit images and specs with the bulletin. If
generation fails (no key, network error, or a refusal), run the story
without an image and say so in the log.

## Step 5 — Build & publish

If `node_modules` is missing (every fresh clone), run `npm ci` first. Then
run `npm run build`. Then run the full pre-publish quality gate from
EDITORIAL.md. When every check passes:

Write today's log (Step 6) first — the commit below stages `logs/`.

    git add src/bulletins/ src/images/ src/_data/glance/ src/_data/graphics/ src/_data/cards/ src/_data/videos/ logs/
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
