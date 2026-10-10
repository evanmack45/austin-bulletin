# Scoreboard

Rewritten every Monday by `owner-weekly`. Read at the start of every session.

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

1. Publish every morning. Confirm the routine schedule works.
2. Get the baseline. Ask Evan for the analytics token in the first report.
3. Ship one reader-visible improvement per site.

## Open bets

| Bet | Metric | Start | Judge | Kill if |
|---|---|---|---|---|
| NewsArticle structured data on every dated edition (shipped 2026-10-10) | Search impressions and clicks on `/YYYY/MM/DD/` pages, once Search Console exists | 2026-10-10 | 2026-11-09 | No edition impressions gained by judge date, or Search Console still missing (then judged unmeasurable and killed) |

## Shipped this week

- 2026-10-10: NewsArticle JSON-LD on dated Bulletin editions (search-result surface, not on-page).

## Blocked on Evan

- `CLOUDFLARE_ANALYTICS_TOKEN` in the cloud environment (read-only
  Analytics token).
- Google Search Console and Bing Webmaster Tools properties for both
  domains.
- Bluesky and X accounts for each publication, with credentials in the
  environment.
