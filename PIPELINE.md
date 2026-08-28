# Daily Pipeline — The Austin Bulletin

Run this procedure once each morning. Also runnable any time on demand.
Before starting, read `EDITORIAL.md` in full.

## Step 1 — Gather

Collect candidate stories with URLs, covering the last 24 hours. Work in
this order — it front-loads the sources that carry the most and lets the
slow ones run while you read:

1. **`npm run today`** — the glance numbers. Independent of everything else,
   so start it first.
2. **KXAN and Austin Current**, both through their WordPress APIs. These two
   return full article text in one request each and between them cover most
   beats; Austin Current is the only source for City Hall & county.
3. **The four plain feeds** — FOX 7, CBS Austin, Texas Tribune, Community
   Impact. Filter by pubDate, then fetch the article text of anything usable.
4. **KUT**, from its homepage links, and the **Statesman**, checking each
   article's own publish date.
5. **City of Austin** news feed. Usually empty; authoritative when it is not.
6. **KVUE's RSS as a tip sheet** — headlines only. Anything it has that
   nobody else does, chase to a primary source before relaying it.
7. **The Daily Texan** and **Austin Chronicle** for UT and Around town.
8. **`npm run voices`** for Voice card candidates, and the outlets' YouTube
   feeds for video. Details in Step 4.

Then read the whole set before selecting. Every fact needs a source read
this morning; every source below has been verified working on 2026-08-24,
with its failure modes recorded so no run rediscovers them.

Weather comes from the NWS API with a User-Agent header: forecast
https://api.weather.gov/gridpoints/EWX/156,91/forecast and active alerts
https://api.weather.gov/alerts/active?zone=TXZ192.

Identify yourself honestly on every fetch. The standard User-Agent for all
gathering is:

    TheAustinBulletin/1.0 (+https://theaustinbulletin.com)

Never send a browser User-Agent we are not, and never present as a named
crawler. Several outlets disallow AI training crawlers (GPTBot, CCBot,
PerplexityBot, Google-Extended, Applebot-Extended, FacebookBot) in
robots.txt; we are none of those and must not imitate one. Read an outlet's
robots.txt before adding a new fetch path, and respect it.

### Source by source

Reference for the checklist above: how each source is read, and how it
fails. Every one was verified on 2026-08-24.

**The four plain feeds** read fine over plain curl, feed and article text
alike. Filter items by pubDate to the window, then fetch the text of
anything usable.

    FOX 7             https://www.fox7austin.com/rss/category/news
    CBS Austin        https://cbsaustin.com/news/local.rss
    Texas Tribune     https://feeds.texastribune.org/feeds/main/
    Community Impact  https://communityimpact.com/rss/austin/

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
Article body text sits in ordinary `<p>` tags, but taking *every* `<p>` on
the page returns KUT's navigation, podcast list and membership menu ahead of
the story. The body is inside `<div class="ArtP-articleBody">` and ends at
`ArtP-tags`; the headline is `<h1 class="ArtP-headline">`. Slice between those
markers (noted 2026-08-28). The page also carries NewsArticle structured data.

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

Primary and secondary sources (all verified 2026-08-24):

- **City of Austin** — https://www.austintexas.gov/site/news/rss.xml. Ten
  items, properly dated, and it is the original of stories outlets rewrite:
  APD releases, Austin Water spills, LCRA lake drawdowns, health department
  notices. It posts every few days rather than daily, so most mornings it
  adds nothing — check it anyway, because when it has something it beats the
  outlet write-up.
- **Austin open data** — https://data.austintexas.gov, a Socrata portal.
  Search the catalogue with `/api/catalog/v1?q=<terms>`, then query a dataset
  at `/resource/<id>.json` with `$limit` and `$where` for a date range. Many
  datasets update daily (311 requests, traffic, permits). This is where The
  Number and original graphics should come from when a story has a figure we
  can source ourselves rather than quote.
- **The Daily Texan** — https://thedailytexan.com/feed/. Fresh, usually a few
  hours old, and the only source we have on UT itself. It is a student paper
  that mixes reporting and opinion columns in one feed: take the news, never
  cite a column as fact.
- **Austin Chronicle** — https://www.austinchronicle.com/feed/. Publishes a
  few times a week on arts, music, food and Austin FC. Good for Around town;
  do not expect it to have anything most mornings. The old `/rss/` path now
  answers 301 with an empty body, so a plain curl reads it as a dead source —
  fetch with `curl -L`, or use `/feed/` directly (corrected 2026-08-28).
- **Travis County** — its RSS is dead (two items, years old). The listing at
  https://www.traviscountytx.gov/news/2026 works but carries no dates, and
  the county posts under ten items a year. Judge newness by the numeric id in
  the URL, highest first. Worth an occasional look, not a daily one.
- **r/Austin** — https://www.reddit.com/r/Austin/.rss for the subreddit, or
  `<post-url>/.rss` for one post. Reddit's `.json` endpoints return 403 and
  its rate limiting is aggressive: expect HTTP 429 and retry. `npm run card`
  handles both for you. Use it for Voice cards from Austinites and as a tip
  sheet — a Reddit post is opinion, never the source for a fact.

Checked and not worth using: Spectrum News Austin (per-section feeds work but
carry stale wire copy), CapMetro (no feed; alerts exist only as a GTFS
protobuf on data.texas.gov), Axios Austin (blocks us), Texas Standard (feed
is stale). No source was found for the This Weekend ritual — see the note in
EDITORIAL.md.

For video, the outlets' YouTube channel feeds
(`https://www.youtube.com/feeds/videos.xml?channel_id=…`) work. The channel
ids are not guessable — read one off the channel page rather than inventing
it. Confirmed 2026-08-24: FOX 7 is `UC5maSolHQX9er0BOxrzjMwA`, CBS Austin is
`UCT2FAPpgWOGGXtpheDT6jkQ`.

Voice cards come from `npm run voices` and r/Austin (Step 4). Do not hand-
roll Bluesky or Reddit fetches: Reddit's `.json` endpoints and Bluesky's
search both refuse us, and the script already handles the routes that work.

The glance numbers: `npm run today` (writes
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

Where the beats come from, now that the sources are settled. City Hall &
county is Austin Current first, then the City of Austin feed. Schools is
Austin Current and the Daily Texan. Roads & transit, Public safety and Health
are the TV stations and the city. Around town is the Chronicle and Community
Impact. Texas is the Tribune. If a beat is empty, say so by omitting it —
EDITORIAL forbids padding — but an empty City Hall & county beat now usually
means Austin Current was not checked rather than that nothing happened.

## Step 3 — Write

Create `src/bulletins/YYYY-MM-DD.md` for today, copying the exact front
matter and section order of the newest existing bulletin file: the
morning note; `## The Big Story` inside `{% bigstory %}…{% endbigstory %}`
(### headline, optional `{% video %}`, paragraphs, a What's next line,
optional `{% voice %}` cards, a Sources line); `## The River` inside
`{% river %}…{% endriver %}` (`#### Beat` labels in the fixed order,
one paragraph per item ending in `<span class="src">OUTLET</span>`,
`{% voice %}` cards where they earn it); `## Weather` **outside** the river
wrapper, carrying the NWS forecast and alerts, any weather items, the weather
graphic and its own sources line; then
`<aside class="the-number">`, a
`<p class="countdown">`, and a `<p class="good-thing">`. Set
`permalink: "/YYYY/MM/DD/"`. Every rule in EDITORIAL.md applies to every
sentence. "Today" means the date in America/Chicago
(`TZ='America/Chicago' date`), never UTC.

Write 25–40 items grouped by beat, in the fixed order.

For each beat, apply the impact test in EDITORIAL.md and choose at most two
leads — often zero or one. A lead gets a `#####` headline and 50–70 words. A
beat with nothing that passes the test gets no lead.

Everything else in the beat is a brief: one sentence, about 25 words, source
tag, no headline.

Place the day's Voice cards as you go — at least four, no more than two in any
one beat, spread so no beat runs 400 words without one. Add at least one
graphic (`npm run graphic`) and one to three videos (`npm run video`).

Expand every initialism on first use. **This includes the recurring ritual
lines**: the Countdown names the stadium, so its first use is "Darrell K
Royal-Texas Memorial Stadium (DKR)", not a bare "DKR". A fixed template line
that ships unexpanded fails the gate every single morning, so the ritual
templates carry their expansions. Same for road nicknames in any beat: first
use is "MoPac (Loop 1)".

Run `npm run check -- <date>` before
publishing; it fails on item length, lead counts, visual minimums, and
unexpanded initialisms, and warns on unknown all-caps tokens. Warnings are
triaged, not ignored: an unknown token is either expanded in the copy or added
to `scripts/acronyms.json`.

## Step 4 — Illustrate

Find the voices first:

    npm run voices                          # last 30h, all candidates
    npm run voices -- --min-likes 2         # fewer, better-read posts
    npm run voices -- --hours 48            # quiet morning, widen it
    npm run voices -- --search "cap metro"  # chase one story (needs login)

Two sources, and the script uses whichever are available. Austin's public
custom feeds always run: it finds them by name each morning (they are run by
individuals and come and go), pulls recent posts, drops reposts, replies and
hashtag spam, and prints a shortlist with each post's URL. Nothing is
written; you choose from the list.

Bluesky's post search additionally runs when `BLUESKY_HANDLE` and
`BLUESKY_APP_PASSWORD` are set in the environment — an app password from
Bluesky's settings, never the account password, and kept in the routine's
environment alongside `GEMINI_API_KEY` and `POLLEN_API_KEY`. It is free, so
it runs a spread of Austin queries every morning.

X search runs when `X_BEARER_TOKEN` is set — an app-only bearer token from
the X developer portal.

**X bills $0.005 per post returned, not per request.** Requests are free;
posts are the meter. So `X_QUERIES` holds several narrow queries each asking
for only ten posts, rather than a couple of broad ones asking for many: extra
queries cost nothing and buy coverage, while every post fetched and then
discarded is money spent on nothing. At five queries that is about $0.25 a
day, and less in practice because the geo query returns few. Every run prints
the posts billed and the estimated spend.

Two consequences worth keeping in mind before editing a query. Put filters
*inside* it — `-is:retweet`, `lang:en`, `min_likes:` are applied by X before
billing, unlike our own noise and locality filters, which run after we have
paid. And raising `--x-max` multiplies the bill directly: ten posts a query
is the API minimum and the cheapest useful unit.

Every run prints the posts billed and the estimated spend twice — in the
`Sources:` header and again as the last line — and appends a line to
`logs/x-spend.jsonl`. The footer and the ledger exist because the 2026-08-25
run read the output through `tail` and lost the header, so the day's spend
could not be reported. Quote the ledger's figure in the log.

Self-serve access caps a query at 512 characters. On a rejected token or a
rate limit the run stops rather than making more pointless calls. If X
rejects a query for using `min_likes:` or `point_radius:` — access levels
vary and this is untested against a live token — the script strips those
operators once and retries, which costs nothing because a rejected request
returns no posts.

None of these can fail the run. With no credentials the script says so and
uses what it has; with bad ones it names the rejection and still returns the
rest. Use `--search "<term>"` to chase a specific story across every source
that is configured; without it, each source runs its standing queries.

Read the flags on each candidate. One popular feed matches the *word* Austin,
so it surfaces people named Austin — those are marked and sorted to the
bottom. Another is dominated by Democratic officeholders: a card on a
contested public question runs paired with the other side or not at all, and
that rule bites hardest here. r/Austin (`https://www.reddit.com/r/Austin/.rss`)
is the other good source of ordinary Austinites.

Then build the cards: `npm run card -- <post-url>` (X, Bluesky, Reddit;
`--manual` for Facebook) writes a card and prints the `{% voice %}` tag;
`npm run video -- <youtube-url>` does the same for an outlet's clip. Then
graphics, photos, AI, per EDITORIAL.md.

Both scripts key their data file on the post or video id alone, so re-fetching
something an already-published bulletin embeds would rewrite that edition's
stored quote, image or thumbnail path — a silent change to a published page.
(This happened to the 2026-08-23 bulletin during the 2026-08-25 run.) Both now
refuse and name the edition that already uses it. Pass `--reuse` to embed the
same card or clip again deliberately: it prints the tag and touches nothing.
Prefer a different post — a repeat is rarely what the morning wants.

`npm run card` also refuses a Reddit link post that has no self-text, because
the card's "quote" would be nothing but the headline it already links to. Pass
`--title-only` when the title genuinely is the comment.

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

If `node_modules` is missing (every fresh clone), run `npm ci` first. Then:

    npm run build
    npm run check                  # today; or `npm run check -- YYYY-MM-DD`

`npm run check` (scripts/check.mjs) is the mechanical half of EDITORIAL's
quality gate: front matter and permalink, Big Story length, the 100-word item
cap, beat names and their fixed order, the River count against the river-note,
source tags, banned verbs, the Weather section and its `weather` id, the
rituals, image files that exist with real alt text, the card and video caps,
and card/video ids not already used by an earlier edition. Its link check
knows KXAN article pages 403 to every non-browser client and verifies those
through the WordPress API by slug instead of calling them broken, so a clean
run means the links are genuinely good. `--no-links` skips the network pass
while drafting.

It exists because the 2026-08-25 run shipped six over-cap items into a draft
and caught them only by hand. **It does not replace gate checks 2 and 6** —
whether each summary matches its source, and whether the page reads clean top
to bottom, still need reading. Run it, then read.

Then run the rest of the pre-publish quality gate from EDITORIAL.md. When
every check passes:

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
