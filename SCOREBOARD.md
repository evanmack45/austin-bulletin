# Scoreboard

Read at the start of every session. Any session appends to "Open bets"
and "Shipped". `owner-weekly` rewrites the rest every Monday.

Last rewrite: 2026-10-09 (seed). Next: Monday 2026-10-12.

## The numbers

| Site | 28-day visits | 7-day visits | Trend | Target (28-day) |
|---|---|---|---|---|
| theaustinbulletin.com | no baseline yet | no baseline yet | — | set after baseline |
| yallcityhall.org | no baseline yet | no baseline yet | — | set after baseline |

Source: Cloudflare Web Analytics, pulled to `docs/metrics/`. Until
`CLOUDFLARE_ANALYTICS_TOKEN` exists in the environment, the owner has no
numbers and says so here.

## This week's focus

1. Publish every morning. The Bulletin has no edition for October 7, 8,
   or 9. The first owner morning run is 2026-10-10 at 11:00 UTC.
2. Get the baseline. Ask Evan for the analytics token in the first report.
3. Ship one reader-visible improvement per site.

## Last reader-facing design change

| Site | Date | What |
|---|---|---|
| theaustinbulletin.com | 2026-10-06 | Front-page cover (previous operator) |
| yallcityhall.org | 2026-10-06 | Field-guide homepage (previous operator) |

No new design change on a site within 14 days of its date here.

## Open bets

Judge date at most four weeks after start. Kill condition names a number.
No data at the judge date is a kill.

| Bet | Metric | Start | Judge | Kill if |
|---|---|---|---|---|
| NewsArticle structured data on every dated edition (shipped 2026-10-10) | Search impressions and clicks on `/YYYY/MM/DD/` pages, once Search Console exists | 2026-10-10 | 2026-11-07 | Fewer than 50 edition-page impressions in the 7 days before the judge date, or no Search Console data (unmeasurable, killed) |

## Judged bets

| Bet | Judged | Verdict | Number |
|---|---|---|---|
| (none yet) | | | |

## Shipped

One line per reader-visible change, newest first. The daily edition does
not count. Three calendar days with no line is an alert.

- 2026-10-10 · bulletin · NewsArticle JSON-LD on dated editions (visible in search results, not on the page)

## Blocked on Evan

- `CLOUDFLARE_ANALYTICS_TOKEN` in the cloud environment (read-only
  Analytics token).
- The OpenRouter monthly figure, and a hard monthly credit limit on the
  OpenRouter account, so the $100 ceiling can be enforced.
- Google Search Console and Bing Webmaster Tools properties for both
  domains.
- Bluesky and X accounts for each publication, with credentials in the
  environment.
