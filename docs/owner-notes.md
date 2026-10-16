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
