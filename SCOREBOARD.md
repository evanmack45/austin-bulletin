# Scoreboard

Read at the start of every session. Any session appends to "Open bets"
and "Shipped". `owner-weekly` rewrites the rest every Monday.

Last rewrite: 2026-10-12 (owner-weekly, W42). Next: Monday 2026-10-19.

## The numbers

| Site | 28-day visits | 7-day visits | Trend | Target (28-day) |
|---|---|---|---|---|
| theaustinbulletin.com | no numbers | no numbers | — | set after baseline |
| yallcityhall.org | no numbers | no numbers | — | set after baseline |

Source: Cloudflare Web Analytics, pulled to `docs/metrics/`. On 2026-10-12
`CLOUDFLARE_ANALYTICS_TOKEN` was still missing from the environment, so
nothing was pulled (`docs/metrics/2026-10-12-analytics.md`). Every open bet
is unmeasurable until it exists and will be killed at its judge date
without it.

## This week's focus

1. Publish every morning. Editions ran October 10, 11 and 12 on time.
2. Win the October 22 Council search window: the Bulletin preview and the
   tracker's `/agenda/` are the only plain-text pages for that agenda. Keep
   both current through the meeting, and run a recap link the morning after.
3. Refresh `/aisd-state-intervention/` after the October 15 parent-petition
   deadline.
4. Get the baseline: the token request leads the weekly report.

## Last reader-facing design change

| Site | Date | What |
|---|---|---|
| theaustinbulletin.com | 2026-10-06 | Front-page cover (previous operator) |
| yallcityhall.org | 2026-10-06 | Field-guide homepage (previous operator) |

No new design change on a site within 14 days of its date here. Both
sites are clear for a design change from 2026-10-20. None is planned:
without numbers there is nothing to judge one against.

## Open bets

Judge date at most four weeks after start. Kill condition names a number.
No data at the judge date is a kill.

| Bet | Metric | Start | Judge | Kill if |
|---|---|---|---|---|
| NewsArticle structured data on every dated edition (shipped 2026-10-10) | Search impressions and clicks on `/YYYY/MM/DD/` pages, once Search Console exists | 2026-10-10 | 2026-11-07 | Fewer than 50 edition-page impressions in the 7 days before the judge date, or no Search Console data (unmeasurable, killed) |
| Tracker `/agenda/` stable next-agenda page (shipped 2026-10-10) | Visits to `/agenda/` in the 7 days before a Council meeting, from Cloudflare once the token exists | 2026-10-10 | 2026-11-07 | Fewer than 30 `/agenda/` visits in the 7 days before November 7, or no analytics data (unmeasurable, killed) |
| Bulletin October 22 Council preview, cross-linked from the tracker's `/agenda/` and meeting page (shipped 2026-10-11) | Visits to `/council/2026-10-22-preview/` October 12–22, from Cloudflare once the token exists | 2026-10-11 | 2026-11-07 | Fewer than 25 visits October 12–22, or no analytics data (unmeasurable, killed) |
| Bulletin `/aisd-state-intervention/` topic page (shipped 2026-10-12), refreshed after October 15 | Visits to the page October 12 to November 8, from Cloudflare once the token exists | 2026-10-12 | 2026-11-09 | Fewer than 40 visits October 12 to November 8, or no analytics data (unmeasurable, killed) |
| Bulletin `/vote-2026/` with every early voting site and the Austin ballot (shipped 2026-10-12) | Visits to `/vote-2026/` October 13 to November 3, from Cloudflare once the token exists | 2026-10-12 | 2026-11-09 | Fewer than 100 visits October 13 to November 3, or no analytics data (unmeasurable, killed) |
| Bulletin `/austin-bonds-2026/` topic page for Props A and B (shipped 2026-10-13) | Visits to `/austin-bonds-2026/` October 13 to November 3, from Cloudflare once the token exists | 2026-10-13 | 2026-11-09 | Fewer than 40 visits October 13 to November 3, or no analytics data (unmeasurable, killed) |

## Judged bets

| Bet | Judged | Verdict | Number |
|---|---|---|---|
| (none yet) | | | |

## Shipped

One line per reader-visible change, newest first. The daily edition does
not count. Three calendar days with no line is an alert.

- 2026-10-13 · bulletin · `/austin-bonds-2026/`: Propositions A and B on one page (what each builds, the City's $40-a-year homeowner estimate, debt and interest, the 8-3 August 4 and no-objection August 6 Council votes linked to the tracker, each side's words, dates), linked from `/vote-2026/`
- 2026-10-13 · bulletin · Visible correction on the October 13 edition: the 8-3 Council vote prepared the bond election; the election was ordered August 6 without objection
- 2026-10-12 · bulletin · `/vote-2026/`: all 45 Travis County early voting sites with hours (7 a.m.–7 p.m., seven open to 10 p.m. October 29–30), the five Council races and Propositions A–J in ballot order, and the October 23 mail-ballot deadline, from the County Clerk's lists and consolidated ballot
- 2026-10-12 · tracker · Meeting pages' search titles now read "Austin City Council meeting, Thursday, October 22, 2026" (was the date alone); the six issue pages carry titles and descriptions with their item count and years
- 2026-10-12 · bulletin · `/aisd-state-intervention/`: one page on the TEA intervention at Austin ISD (why, the commissioner's options, the October 15 parent petition, who pays, dates), sourced to Austin Current, with links to all 20 editions that covered it
- 2026-10-11 · bulletin · October 22 Council preview: airport utility contract (+$224M), Country Club Creek parkland for South Pleasant Valley Road, Parmer Lane resolution, sourced to Legistar and linked to each tracker item
- 2026-10-11 · tracker · `/agenda/` and the October 8 and 22 meeting pages link the Bulletin's preview; `/agenda/` speaker link now goes to the City's standing info page instead of the October 8 rules
- 2026-10-11 · tracker · Member scorecards: search titles and descriptions name each member's seat and own record (vote count, years, attendance, dissent rate), plus Person structured data; item descriptions no longer cut mid-word
- 2026-10-11 · bulletin · Zilker access guide: what happens to the Great Lawn after ACL (City's October 9 restoration plan, sections reopen as work allows), rechecked closure notice
- 2026-10-10 · tracker · `/agenda/`: one stable address for the next Council agenda (October 22, 51 items, three to watch), linked from Meetings
- 2026-10-10 · tracker · Event structured data on meeting pages (visible in search results, not on the page; start time and City Hall location fill in from the October 11 run)
- 2026-10-10 · bulletin · Vote 2026 guide lists the City Council candidate panels (District 1 on October 15, from the City's release)
- 2026-10-10 · bulletin · NewsArticle JSON-LD on dated editions (visible in search results, not on the page)

## Blocked on Evan

Steps are in `docs/reviews/owner-2026-42.md`.

- `CLOUDFLARE_ANALYTICS_TOKEN` in the cloud environment (read-only
  Account Analytics token). Asked 2026-10-12. Blocks every number and bet.
- The OpenRouter monthly figure, and a hard monthly credit limit on the
  OpenRouter account, so the $100 ceiling can be enforced. Asked 2026-10-12.
- Google Search Console and Bing Webmaster Tools properties for both
  domains.
- Bluesky and X accounts for each publication, with credentials in the
  environment.
- Optional: a working fine-grained GitHub token (issues and actions write
  on both repos) as `GH_TOKEN` in the cloud environment, so the alert
  scripts work there. Without it the owner uses the GitHub MCP tool.
