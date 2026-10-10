# Claude as operator of The Austin Bulletin and Y'all City Hall

Date: 2026-10-09. Status: draft for Evan's review.

This document says how Claude will run both sites with no daily input from
Evan. It covers publication, maintenance, and readership growth. It applies
to two repositories:

- `austin-bulletin` at https://theaustinbulletin.com (Eleventy, GitHub Pages)
- `austin-council-tracker` at https://yallcityhall.org (Astro, Cloudflare Pages)

## 1. Decisions Evan made on 2026-10-09

1. Claude is the sole operator of both sites. Dot (the Codex agent) is
   retired. Its `OPERATOR.md` and `CHARTER.md` files are history, not rules.
2. Only the hard rules in section 3 carry forward. The August 2026 "standing
   decisions" in the Bulletin's `CLAUDE.md` are history. Claude can change
   layout, sections, sports coverage, email, and catch-up policy when the
   growth loop shows a reason.
3. No social posting yet. Claude does not post to X, Bluesky, Reddit, or
   Facebook for the sites. Claude proposes channels after it has a baseline.
4. Spend ceiling: $100 per month across both sites, all external services
   combined. The current run rate is below this (see section 7).
5. Runtime: Claude Code cloud routines in the environment that already holds
   the API keys. The tracker's data pipeline stays on GitHub Actions.

## 2. What exists today

**The Bulletin.** One edition per morning. The `/daily-bulletin` command
runs `PIPELINE.md` under the rules in `EDITORIAL.md`. `npm run check` is the
mechanical quality gate. A push to `main` deploys to GitHub Pages. Each day
writes `logs/YYYY-MM-DD.md`. The last edition is October 6. October 7, 8,
and 9 are missing. The old cloud routine `austin-bulletin-daily` was
disabled on October 4 and no routine exists now.

**Y'all City Hall.** GitHub Actions runs the data pipeline at 11:00 UTC
every day, commits new data, builds the site, and deploys to Cloudflare
Pages. That job ran and passed on October 7, 8, and 9. Editorial and
improvement work stopped on October 6. Sessions append to
`docs/journal/YYYY-WW.md`.

**Analytics.** Cloudflare Web Analytics runs on both sites. It is cookieless
and counts visits, page views, top pages, and referrers. It cannot count
returning readers across days. `docs/return-visit-proxies.md` in the Bulletin
repo lists the free proxies for reader loyalty.

**Keys.** The cloud environment "Default" (`env_01DhnuLgA3G72Zm18AVxJDHh`)
held `GEMINI_API_KEY`, `POLLEN_API_KEY`, `BLUESKY_*`, and `X_BEARER_TOKEN`
when the old routine last ran on October 3. Claude confirms this in week 1.
GitHub secrets hold `OPENROUTER_API_KEY` and `CLOUDFLARE_API_TOKEN` for the
tracker. Claude reads only key names, never values.

## 3. Hard rules

These rules do not change without Evan's written instruction.

1. **Accuracy and neutrality.** Every civic fact has a source. No opinion,
   no endorsement, no invented number. A correction is visible, never silent.
2. **Money gate.** Total external spend stays under $100 per month. No new
   paid service, subscription, or model upgrade without Evan's approval.
3. **Secrets.** Claude never copies, prints, or moves a credential. Claude
   never changes a DNS record, a GitHub secret, or a Cloudflare setting.
4. **History.** No force push. No rewrite of pushed history. No deletion of a
   published edition.
5. **Never leave a site broken.** If a change does not pass its gates, revert
   it. A failed deploy gets fixed or rolled back in the same session.
6. **No outreach.** No social posts, no emails to readers, no submissions to
   third-party directories, until Evan approves a channel.
7. **One pipeline per day.** The tracker's GitHub Actions job owns the daily
   data run. Claude never starts a second full pipeline on the same day.

## 4. Approval tiers

| Tier | What | Who decides |
|---|---|---|
| Ships alone | Code, tests, pipeline fixes, metadata, sitemaps, feeds, speed, accessibility, source changes, below-the-fold layout, new evergreen guide pages | Claude |
| Propose first | Front page or masthead changes, new top-level sections, cutting a section, a new recurring feature, anything a returning reader notices at once | Claude writes a one-page proposal with a mockup. Evan says yes or no. |
| Evan only | New spend, new channel (social, email), new tracker or cookie, DNS, credentials | Evan |

A "propose first" item waits in the weekly digest. Silence is not approval.

## 5. The three layers of work

Each site gets the same three layers.

### Layer 1: Publish reliably

**Bulletin.** A cloud routine named `bulletin-daily` runs every day at
11:00 UTC (6:00 a.m. Central in summer, 5:00 a.m. in winter). It runs
`/daily-bulletin`, then confirms the live homepage shows today's date and
the deploy workflow passed for the pushed commit. Target publication is
7:00 a.m. Central. Cutoff is 9:00 a.m. If the cutoff passes with no edition,
the routine alerts Evan (section 8).

**Tracker.** A cloud routine named `tracker-daily` runs at 12:30 UTC, after
the GitHub Actions job. It reads the run result and `data/status.json`,
confirms the live site deployed the new commit, samples new generated briefs
against the agenda wording (the procedure Dot wrote in its `OPERATOR.md`
section "Source-based summary sampling"), fixes any source or schema break,
and appends the journal. If the GitHub job failed, the routine diagnoses it
and fixes the cause for the next day. It does not rerun the full pipeline.

### Layer 2: Maintain

Done inside the daily routines, and in the weekly routine when larger.

- Source health: a feed that stops moving (the Texas Tribune feed froze on
  September 20) gets logged on day one and replaced or repaired within a week.
- Dependencies: update monthly. Run every gate before and after.
- Link rot: the Bulletin's check already verifies links. The tracker gets the
  same check on its external links, once a week.
- CI: every pull request runs the gates. A red gate blocks the push.
- Credentials: a missing or expired key pauses only the feature that needs
  it and alerts Evan with the key's name.

### Layer 3: Grow readership

A cloud routine named `growth-weekly` runs once a week for both sites. One
run, both repos, so cross-site work (section 6) is one job. Week 1 confirms
that one routine can work in two repositories. If it cannot, the routine
runs in the Bulletin repo and clones the tracker.

The loop:

1. **Read the numbers.** Pull the last 7 and 28 days from Cloudflare Web
   Analytics for both sites: visits, page views, top pages, referrers,
   direct share, feed loads. Compare to the baseline and to last week.
2. **Pick one hypothesis.** One per site per week. Written as "If we do X,
   metric Y moves because Z."
3. **Ship it.** Under the approval tiers. A "propose first" idea goes into
   the digest instead.
4. **Measure next week.** Keep, revert, or iterate. Record the result.
5. **Write the digest.** `docs/reviews/growth-YYYY-WW.md` in the Bulletin
   repo, one file for both sites. Under 300 words plus a table.

Evan reads the digest. He does not need to answer it unless it carries a
"propose first" item.

## 6. Growth levers, in order

This is the backlog the weekly loop draws from. It is ordered by expected
value against effort, with no outreach and no spend.

1. **Baseline.** Week 1. Pull 28 days of Cloudflare numbers for both sites
   and record them. Nothing in this plan is measurable without it.
2. **Search presence.** Confirm both sites are in Google Search Console and
   Bing Webmaster Tools. If not, this is an Evan-only step: he creates the
   properties and adds Claude's routine a read token. Then: sitemaps
   submitted, index coverage checked weekly, crawl errors fixed.
3. **Page-level metadata.** Every edition and every guide page gets a
   specific title and description from its own content. Structured data
   (`NewsArticle` for editions, `GovernmentOrganization` and `Event` for
   council meetings) so search engines show dates and sources.
4. **Evergreen guide pages.** The Bulletin's Vote 2026 and Zilker pages are
   the pattern. Each answers one question Austin residents search for, cites
   official sources, and carries a last-checked date. Candidates come from
   what readers already search for on the sites and from Search Console
   queries. Target: one new or refreshed guide per week.
5. **Cross-site links.** The Bulletin's City Desk links every council item
   to its tracker page. The tracker's meeting pages link to the Bulletin's
   coverage of that meeting. Both sites gain depth and a second entry point.
6. **Feeds.** Both sites carry a full-content RSS and Atom feed, advertised
   in the page head and on a visible "Follow" page. Feed loads are the
   loyalty proxy Claude can measure without a tracker.
7. **Speed and accessibility.** Largest Contentful Paint under 1.5 seconds on
   mobile, no layout shift, WCAG 2.1 AA. Measured monthly with Lighthouse.
8. **Archive discovery.** The Bulletin's archive has search. Add topic pages
   (one page per recurring subject, such as the city budget or Zilker) that
   collect every item on that subject across editions. These pages earn
   search traffic that daily editions cannot.
9. **Tracker homepage for first-time readers.** The field-guide front page
   Dot built on October 6 is a start. Measure its bounce rate against the
   old homepage and iterate.

Items that need Evan's approval, to be proposed when the baseline supports
them: a weekly email digest, a Bluesky and X account per site that posts
the morning edition, a Reddit presence, a Mastodon mirror of the feed.

## 7. Spend

| Item | Site | Current rate | Notes |
|---|---|---|---|
| X post search | Bulletin | about $7.50/month | 50 posts per day at $0.005 |
| OpenRouter model calls | Tracker | unknown, read from the OpenRouter dashboard in week 1 | DeepSeek extraction, Claude summaries |
| Gemini images, Pollen, Maps | Bulletin | near zero | Free tiers so far |
| Cloudflare, GitHub Pages | Both | $0 | Free plans |

The growth routine records every month's spend in the digest. If the
28-day projection passes $80, Claude alerts Evan before the end of the
month. Claude Code usage is not counted in this ceiling.

## 8. How Claude reaches Evan

- **Weekly digest file** in the Bulletin repo (section 5). Normal channel.
- **Alert** by a push notification from the routine, if routines can send
  one (section 13), plus a line at the top of the day's log. Used only for: a missed 9:00 a.m. publication, a site
  down or deploy failed for more than one hour, a wrong live fact, an
  expired credential, a spend projection over $80, or a repeated failure
  on three days in a row.
- No routine status messages. If nothing is wrong, Evan hears nothing but
  the weekly digest.

## 9. Documents each repo keeps

Replace, do not stack. One live operating document per repo.

- `OPERATOR.md` is rewritten in both repos as the Claude operating
  procedure: the routine names, the daily steps, the gates, the alert rules,
  and a link to this spec. Dot's text is removed.
- `CHARTER.md` in the tracker is deleted. Its surviving rules move into
  `OPERATOR.md`.
- The Bulletin's `CLAUDE.md` "Standing decisions" section moves to
  `docs/history/standing-decisions-2026-08.md`. `CLAUDE.md` keeps only the
  technical guide and a pointer to `OPERATOR.md`.
- `EDITORIAL.md` and `PIPELINE.md` stay as the Bulletin's content rules.
  They still encode the August rules, and the daily run obeys them until
  the growth loop changes one. Claude edits them when it changes a rule,
  in the same session. Tomorrow's paper looks like today's.
- `docs/journal/` (tracker) and `logs/` (Bulletin) stay as the daily record.

## 10. Routines to create

| Name | Schedule (UTC) | Repo | Job |
|---|---|---|---|
| `bulletin-daily` | 0 11 * * * | austin-bulletin | Publish, verify, log |
| `tracker-daily` | 30 12 * * * | austin-council-tracker | Verify the GitHub run, sample briefs, fix breaks, journal |
| `growth-weekly` | 0 15 * * 1 (Monday 10 a.m. Central) | both | Numbers, one hypothesis per site, ship, digest |

All three use environment "Default" and model Opus. Each routine's prompt
points at the repo's `OPERATOR.md` and nothing else, so a rule change lands
in one file.

## 11. First week

1. Create `bulletin-daily` the evening Evan approves, so its first run
   fires at 11:00 UTC the next morning. Claude reads that run's log before
   it trusts the schedule. October 7, 8, and 9: Claude recommends leaving
   them uncovered. Three full runs for three stale days has low reader
   value. Evan can ask for a backfill.
2. Rewrite `OPERATOR.md` in both repos. Delete `CHARTER.md`. Move the
   standing decisions to history.
3. Create the three routines. Run each once by hand and read its log.
4. Evan grants analytics read access: either an allow rule for the
   Cloudflare GraphQL read in this session, or a read-only Cloudflare token
   added to the "Default" environment as `CLOUDFLARE_ANALYTICS_TOKEN`.
5. Record the 28-day baseline for both sites in the first digest.
6. Read the OpenRouter dashboard and record the tracker's monthly model cost.
7. Evan creates Search Console properties for both domains, or tells Claude
   they exist. Claude submits sitemaps.

## 12. Success criteria

Reviewed in the digest. Judged at 90 days (2027-01-07).

| Measure | Target |
|---|---|
| Bulletin published by 9:00 a.m. Central | 100% of days |
| Tracker data current | Footer date within 1 day of the last meeting |
| Visits, 28-day, each site | Placeholder: up 50% against the week-1 baseline. The real target is set in the first digest, once the baseline exists. |
| Search impressions, each site | Up, once Search Console exists |
| Feed loads | Up, each month |
| Spend | Under $100 every month |
| Alerts to Evan | Fewer than 4 per month |

## 13. Open questions for Evan

1. Analytics access: allow rule in this session, or a token in the cloud
   environment? (Step 4 above.)
2. Search Console: do the properties exist? If not, will you create them?
3. Push notifications: is the Claude app on your phone the right alert path,
   or do you want email?
