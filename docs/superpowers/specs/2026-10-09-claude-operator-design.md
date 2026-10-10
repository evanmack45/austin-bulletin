# Claude as owner-operator of The Austin Bulletin and Y'all City Hall

Date: 2026-10-09, revised the same evening. Status: draft for Evan's review.

Claude runs both sites the way an owner runs a small publication. Claude
decides what to publish, how the sites look, what to build, what to measure,
and where to find readers. Evan is the publisher of record and the holder of
the money and the keys. He reads a weekly report. He does not approve work.

- `austin-bulletin` at https://theaustinbulletin.com (Eleventy, GitHub Pages)
- `austin-council-tracker` at https://yallcityhall.org (Astro, Cloudflare Pages)

## 1. Decisions Evan made on 2026-10-09

1. Claude is the sole operator of both sites. Dot (the Codex agent) is
   retired. Its `OPERATOR.md` and `CHARTER.md` files are history, not rules.
2. Only the hard rules in section 3 bind Claude. The August 2026 "standing
   decisions" in the Bulletin's `CLAUDE.md` are history.
3. Spend ceiling: $100 per month across both sites, all external services.
4. Runtime: Claude Code cloud routines. The tracker's data pipeline stays on
   GitHub Actions.
5. Evan's words: "run the sites fully like a real owner." The approval tiers
   from the first draft are gone. Section 4 says what that means.

## 2. What exists today

**The Bulletin.** One edition per morning. The `/daily-bulletin` command
runs `PIPELINE.md` under the rules in `EDITORIAL.md`. `npm run check` is the
mechanical quality gate. A push to `main` deploys to GitHub Pages. Each day
writes `logs/YYYY-MM-DD.md`. The last edition is October 6. The old cloud
routine was disabled on October 4 and no routine exists now.

**Y'all City Hall.** GitHub Actions runs the data pipeline at 11:00 UTC
every day, commits new data, builds the site, and deploys to Cloudflare
Pages. That job passed on October 7, 8, and 9. Editorial and improvement
work stopped on October 6. Sessions append to `docs/journal/YYYY-WW.md`.

**Analytics.** Cloudflare Web Analytics runs on both sites. It is cookieless.
It counts visits, page views, top pages, and referrers. It cannot count
returning readers across days.

**Keys.** The cloud environment "Default" (`env_01DhnuLgA3G72Zm18AVxJDHh`)
held `GEMINI_API_KEY`, `POLLEN_API_KEY`, `BLUESKY_*`, and `X_BEARER_TOKEN`
when the old routine last ran on October 3. Claude confirms this in week 1.
GitHub secrets hold `OPENROUTER_API_KEY` and `CLOUDFLARE_API_TOKEN` for the
tracker. Claude reads only key names, never values.

## 3. Hard rules

These are the only rules. They change only on Evan's written instruction.

1. **Accuracy and neutrality.** Every civic fact has a source. No opinion,
   no endorsement, no invented number. A correction is visible, never silent.
   Evan McMillan stays named as publisher.
2. **Money.** Total external spend stays under $100 per month. Claude can
   spend inside the ceiling on its own judgment. A new service that pushes
   the projection over the ceiling needs Evan's yes.
3. **Secrets.** Claude never copies, prints, or moves a credential. Claude
   never changes a DNS record, a GitHub secret, or a Cloudflare setting.
4. **History.** No force push. No rewrite of pushed history.
5. **Never leave a site broken.** A change that fails its gates is reverted
   in the same session.
6. **Honest identity.** Claude posts and crawls as the publication, never as
   a person or another crawler. Readers can see on the About page that AI
   produces the sites.
7. **One data pipeline per day** on the tracker. The GitHub Actions job owns
   it.

## 4. What "owner" means

Claude decides and acts on everything not in section 3. That includes:

- Editorial direction, sections, beats, voice, the morning note, images,
  sports, suburbs, catch-up editions, and the content rules in
  `EDITORIAL.md` and `PIPELINE.md`. Claude rewrites those files when it
  changes its mind, in the same session.
- The look of both sites: masthead, front page, typography, navigation.
- What to build: features, guide pages, topic pages, search, feeds, tooling.
- Distribution: which channels to use, what to post, when, and how often.
- Targets: Claude sets its own readership goals and reports against them.
- Spend inside the ceiling.

Three things stay with Evan because Claude cannot do them:

- **Accounts.** Claude cannot create accounts or sign in. When Claude wants a
  channel (a Bluesky account, Google Search Console, an email list), it
  writes a one-line request with the exact steps. Evan does the sign-up once
  and puts the credential in the cloud environment. From then on Claude uses
  the channel without asking. Evan gives standing authorization to post as
  the publications in writing, once, in his reply to this plan.
- **Spend over the ceiling.**
- **Identity and legal.** The publisher's name, the domains, and anything
  that creates a legal obligation (a contract, a paid ad, a donation
  button).

Evan can override any decision at any time. He does not have to approve
one.

## 5. The owner's week

**Every morning, Bulletin (`bulletin-daily`, 11:00 UTC).** Publish the
edition. Confirm it is live. Fix what broke. Then keep working: one
improvement from the backlog (section 7), shipped and verified, before the
session ends. Log it.

**Every morning, tracker (`tracker-daily`, 12:30 UTC).** Read the GitHub
run and the live site. Sample new generated briefs against the agenda
wording. Fix breaks. Then one improvement from the backlog, shipped and
verified. Journal it.

**Every afternoon, both (`owner-afternoon`, 20:00 UTC).** The working
session. Distribution: post the morning's edition and the day's council
items on every channel Claude has (none at launch). Build: the next backlog
item, with its design written first if it changes what a reader sees.
Research: what Austin residents search for, what competing outlets do, what
readers click. Record the session in the repo's log or journal.

**Every Monday (`owner-weekly`, 15:00 UTC).** Read 7-day and 28-day numbers
for both sites. Compare to the targets Claude set. Decide the week's
priorities and rewrite the backlog. Write the weekly report
(`docs/reviews/owner-YYYY-WW.md` in the Bulletin repo, both sites in one
file, under 400 words plus a table). Record the month's spend projection.

Week 1 confirms that one routine can work in two repositories. If it
cannot, the afternoon and weekly routines run in the Bulletin repo and clone
the tracker.

## 6. Growth: how Claude finds readers

The weekly loop: read the numbers, pick hypotheses, ship, measure, keep or
revert. Claude runs as many experiments at once as it can measure apart.

Levers, in Claude's starting order. Claude reorders them as evidence comes
in.

1. **Baseline, week 1.** 28 days of Cloudflare numbers for both sites.
2. **Search.** Search Console and Bing Webmaster Tools (Evan creates the
   properties, step 4 in section 10). Sitemaps, index coverage, crawl
   errors, page titles and descriptions from each page's own content,
   structured data for editions and council meetings.
3. **Evergreen guide pages.** One question Austin residents search for,
   answered from official sources, with a last-checked date. Vote 2026 and
   Zilker are the pattern. At least one new or refreshed guide a week.
4. **Topic pages.** One page per recurring subject (the budget, Zilker, a
   named council item) that collects every item across editions. Daily
   editions expire. Topic pages earn search traffic for months.
5. **Cross-site links.** Every council item in the Bulletin links to its
   tracker page. Every tracker meeting links to the Bulletin's coverage.
6. **Feeds and follow page.** Full-content RSS and Atom on both sites, a
   visible "Follow" page, feed loads tracked as the loyalty proxy.
7. **Social channels.** Claude asks Evan for Bluesky and X accounts for each
   publication in week 1. Once they exist, every edition and every council
   decision is posted, with a link back. Reddit is a research source and a
   place to answer questions with a link when a thread asks one. Claude
   judges the subreddit's rules before it posts.
8. **Email.** A weekly digest on a free tier (Buttondown or similar, inside
   the ceiling), when the sites have enough direct traffic to make a sign-up
   box worth its space. Claude decides when.
9. **Speed and accessibility.** Largest Contentful Paint under 1.5 seconds
   on mobile, no layout shift, WCAG 2.1 AA, measured monthly.
10. **Tracker front page.** Measure the October 6 field-guide homepage
    against its predecessor and iterate.

## 7. The backlog

Claude keeps one file per repo, `BACKLOG.md`, ordered by expected value
over effort. Every item has one line: what, why, how it is measured. The
daily and afternoon sessions take the top item. The Monday session
reorders. Evan can read it any time and add or strike lines.

## 8. Spend

| Item | Site | Current rate | Notes |
|---|---|---|---|
| X post search | Bulletin | about $7.50/month | 50 posts per day at $0.005 |
| OpenRouter model calls | Tracker | unknown, read from the OpenRouter dashboard in week 1 | DeepSeek extraction, Claude summaries |
| Gemini images, Pollen, Maps | Bulletin | near zero | Free tiers so far |
| Cloudflare, GitHub Pages | Both | $0 | Free plans |

Claude keeps `docs/spend.md` in the Bulletin repo with every paid service,
its rate, and the month's projection. Claude can add a service inside the
ceiling on its own. If the projection passes $80, Claude slows the cause or
alerts Evan.

## 9. How Claude reaches Evan

- **Weekly report** (section 5), Monday. Information only. It lists what
  shipped, what the numbers did, what Claude decided for the week, and any
  request in the "Accounts" category of section 4.
- **Alert**, by push notification if routines can send one, plus a line at
  the top of the day's log. Only for: a missed 9:00 a.m. publication, a site
  down for more than one hour, a wrong live fact, an expired credential, a
  spend projection over $80, or the same failure three days in a row.
- Nothing else. A quiet week means the sites are fine.

## 10. First week

1. Create `bulletin-daily` the evening Evan approves, so its first run
   fires at 11:00 UTC the next morning. Claude reads that run's log before
   it trusts the schedule.
2. Create the other three routines and run each once by hand.
3. Rewrite `OPERATOR.md` in both repos as the owner procedure. Delete
   `CHARTER.md`. Move the Bulletin's standing decisions to
   `docs/history/standing-decisions-2026-08.md`. Create `BACKLOG.md` and
   `docs/spend.md`.
4. Evan, one time: a read-only Cloudflare analytics token in the cloud
   environment as `CLOUDFLARE_ANALYTICS_TOKEN`, Search Console and Bing
   properties for both domains with a read token, and Bluesky and X accounts
   for each publication with app passwords in the environment. Claude sends
   the exact steps for each in its first report.
5. Baseline and first targets in the first Monday report.
6. Claude decides whether to backfill October 7, 8, and 9.

## 11. Success

Claude sets numeric targets in the first Monday report, once the baseline
exists, and reports against them every week. The fixed measures:

| Measure | Target |
|---|---|
| Bulletin published by 9:00 a.m. Central | 100% of days |
| Tracker data current | Footer date within 1 day of the last meeting |
| Spend | Under $100 every month |
| Alerts to Evan | Fewer than 4 per month |

Evan judges the whole arrangement at 90 days (2027-01-07) on one question:
are more people reading, and did he have to do anything?

## 12. What Evan confirms in his reply

1. Standing authorization: Claude posts as The Austin Bulletin and Y'all
   City Hall on channels Evan creates, without asking each time.
2. He will do the one-time account steps in section 10, step 4, when Claude
   sends them.
3. Alerts by push notification in the Claude app, or email.
