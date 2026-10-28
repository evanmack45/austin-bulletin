# Owner's notes

Written by the owner, for the owner. Read at the start of every session.
What I tried, what moved the number, what did not, what I believe about
the readers. Dated entries, newest first. Keep it under 2,000 words. When
it grows past that, compress the oldest entries into beliefs.

## Beliefs (as of 2026-10-09, before any data)

- The tracker holds data that exists nowhere else: every council vote, in
  a form a resident can read. The Bulletin reads other outlets and routes
  readers to them. Search rewards the first and rarely the second. Tilt
  effort toward what only these sites have: vote records, agenda lookups
  by district, topic pages, guides.
- Search takes three to six months to reward a new page. A bot account
  with no followers reaches nobody at first. The first 90 days prove the
  loop, not the numbers.
- Readers come for a question, not for a publication. A page that answers
  one question completely beats a page that summarizes ten stories.
- Design churn costs readers. A reader-facing change needs two weeks of
  measurement before the next.
- Tooling feels like progress and is not. Readers never see a test.

## Rule change requests

(none)

## Protected files I cannot change

`HARD-RULES.md`, `heartbeat.yml`, `alert.yml`, `hard-rules-guard.yml`,
`scripts/alert.mjs`, `scripts/alert.ts`, `docs/routines/critic-weekly.md`.
A request to change one goes above, with the reason.

## Entries

### 2026-10-28 (signup form)

The publisher asked for the morning-edition form on every page. The same `signup.njk` block now posts `email_address` to `https://app.kit.com/forms/10083630/subscriptions` with a real Email label, so it works with JavaScript off. It stays under the lead, at the end of each edition, and in the footer everywhere else. The line is "Austin's news in 5 minutes, every morning". On a desktop the lead photo sits in the side column so that form is inside the first 900px; the phone keeps the photo in the story and the form within two screens. The October 24 note still stands: a direct post once hit Kit's bot wall. This request asked for that post as the form. Do not send a test address. The design-change clock stays at 2026-10-28.

### 2026-10-28

Evan asked the skyline off the masthead. It was not an accurate Austin, so the masthead is the wordmark and the date, with no replacement picture. The signup moves from the side column to directly under the lead, the stock beach photo comes out of the Kit form, and the subscribe button uses the Bulletin red (`--accent`, `#c8102e`) with white text. The line is "Early voting numbers, council votes, road closures. Free, weekday mornings." This is a publisher request, two days after the alive pass. The design-change clock restarts at 2026-10-28.

### 2026-10-26

The alive pass shipped the day after the October 25 homepage, on an approved plan. The "If you" opener is retired. The next step is a plain sentence, one caveat, headlines of 10 words or fewer, and no fact that is not already in the edition. The masthead skyline is a labeled illustration, not a stand-in photo. A story photo needs a credit in `src/_data/imageCredits.json` and a caption that names what is shown. The courthouse stands in because no free photo of a polling place turned up; the caption names the courthouse. Do not print a day count the copy does not state. Early voting opened October 19, so October 26 is not day 13. The design-change clock restarts at 2026-10-26.

### 2026-10-25

The homepage is one lead, the deadlines, and this week's item. The same story no longer appears as a cover, a rail card, and an edition link, and a story with no photograph no longer gets the skyline illustration. "If you…" lines are practical next steps already in the sourced copy, and they do not count toward the briefing or lead word caps. Guides live on the archive. No lead photo: a 1918 registration photograph and a generic "I Voted" sticker would sit next to a 2026 turnout figure and read as this election. The design-change clock restarts at 2026-10-25; the next reader-facing change waits until 2026-11-08.

### 2026-10-24

Email signup is under the homepage lead, at the end of each edition, and on a dismissible mobile bar. A direct POST to `https://app.kit.com/forms/10083630/subscriptions` was redirected to Kit's bot-protection page and created no subscriber. Each placement now loads Kit's official embed (`https://the-austin-bulletin.kit.com/e956043af1/index.js`), with a no-JavaScript link to `https://the-austin-bulletin.kit.com/e956043af1`. Double opt-in stays on at Kit. The August 23 "no email edition" note stays history; this request asked for the signup.

### 2026-10-21 (afternoon)

The County Clerk posts official daily early-voting totals as a PDF, linked from votetravis.gov's current-election page (`G26-Daily-Totals-MMDDYYYY.pdf`, per-site counts, mail ballots, % of 948,575 registered). A day after the fact, search still indexes no day-two count and KXAN's tracker had not moved, so the County file is the first answer. It settles the October 20 open question.

### 2026-10-20 (afternoon)

A search for Travis County's first-day early-voting turnout on October 20 returns only 2016–2024 stories; no outlet has a 2026 count indexed yet. Daily turnout from the County Clerk is an open question during early voting, the way the agenda and ID rules were.

### 2026-10-19

On a thin Monday the Growth beat came from the City's Roadway Work Zones dataset: query `qyfh-gwei` directly with `start_date` in the next two days (`npm run civic` sorts old long-running permits first and buries new ones). KUT embeds the District forums from The Texas Tribune's YouTube channel, which clears as an outlet upload.

### 2026-10-18 (afternoon)

The City's Bond 2026 page (speakupaustin.org/bond2026) prints Prop B's split ($20M Hampton, $15M Colony Park) and Prop A's allocation, so a City source now settles what outlets disagreed on. Check the City's own program page before writing "reports differ". FOX 7 and KUT both run early-voting site lists, so sites alone are no longer a first answer. What `/vote-2026/` has that they lack is sites, ID rules and the Austin ballot on one page.

### 2026-10-17 (afternoon)

A search for Austin early-voting ID rules two days before early voting
returns Houston outlets' guides and old SOS releases, with no Travis County or
Austin page. Practical "what to bring" answers are as open as the
agenda was. Put them on our own guide pages instead of linking out.

### 2026-10-17

Outlets disagree on Prop B's split: Community Impact's October 16 explainer
says $25M Hampton / $10M Colony Park, while KUT and CI's own October 13 piece
say $20M / $15M. The election order names no amounts. Until the City
publishes a split, print only the $35M total and say reports differ.
The City's news pages now carry a link to its bond dashboard (ArcGIS).

### 2026-10-16

Austin Current's candidate stories embed the Austin PBS forum videos from
YouTube; one cleared `npm run video` today, so election weeks have a video
source. Check the embed's channel: one embed was a staff member's personal
upload and did not run. KUT's District 1 Q&A gives Prop I answers without
clear per-candidate labels in the page text; do not attribute them by order.

### 2026-10-15 (afternoon)

The critic found that no reader reached the guides from the home page; the
best pages were sitemap-only. A page nobody links to is a page nobody
reads, search or not. Every new guide gets a home-page link the day it
ships. Four days before early voting, the City's own voter page still
lists the County's early-voting schedule as pending; `/vote-2026/` has all
45 sites.

### 2026-10-13 (afternoon)

A search for the November propositions on October 13 finds the City's
voter page and TV segments, but no plain-language page explaining charter
Propositions C–J one by one. With early voting October 19, a per-proposition
page, each with its Council vote, can be a first answer. It goes ahead of
the remaining topic pages.

### 2026-10-13

Outlets compress Council votes. Community Impact's "advanced 8-3" was the
August 4 resolution; the August 6 ordinance passed without objection. Check
the tracker's meeting record before printing any vote count.

### 2026-10-12 (afternoon)

FOX 7 and Community Impact already run "City of Austin propositions"
explainers, so a bare list of Props A–J is not a first answer. What they
lack is each prop's Council vote record (the bond package passed 8-3 on
August 6, per Community Impact): the bond topic page should lead with the
tracker's vote links.

### 2026-10-12 (weekly)

First Monday, and it brought no numbers. Every bet so far is unmeasurable,
so a missing token turns all of them into kills. Until the token arrives,
pick work for reasons that hold without data: being first to answer a dated
civic question, as with the October 22 agenda.

### 2026-10-12

X posts in the voices shortlist re-sold the March 1 Sixth Street shooting
as "last night." Treat any "breaking" voice post as a tip, and check the
outlets first. Run `npm run voices` once and save the output to a file:
each run bills X again.

### 2026-10-10 (afternoon)

Search for "Austin City Council October 22 agenda" on October 10 finds no
City page for that meeting; the City's indexed meeting pages stop at
September 10. The agenda is final in Legistar 12 days ahead. A page that
carries the agenda in plain text can be the first answer for that search.
Built `/agenda/` on the tracker for it.

### 2026-10-09

Seed. Claude becomes owner. No baseline yet. The first morning run is
2026-10-10 at 11:00 UTC. First report due Monday 2026-10-12.
