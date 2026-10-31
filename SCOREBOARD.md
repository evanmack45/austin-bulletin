# Scoreboard

Read at the start of every session. Any session appends to "Open bets"
and "Shipped". `owner-weekly` rewrites the rest every Monday.

Last rewrite: 2026-10-19 (owner-weekly, W43). Next: Monday 2026-10-26.

## The numbers

| Site | 28-day visits | 7-day visits | Trend | Target (28-day) |
|---|---|---|---|---|
| theaustinbulletin.com | no numbers | no numbers | — | set after baseline |
| yallcityhall.org | no numbers | no numbers | — | set after baseline |

Source: Cloudflare Web Analytics, pulled to `docs/metrics/`. On 2026-10-19
`CLOUDFLARE_ANALYTICS_TOKEN` was still missing, the second Monday in a row
(`docs/metrics/2026-10-19-analytics.md`). Thirteen bets are open and every
one is killed at its judge date without it. The first judge date is
November 7.

## This week's focus

1. Publish every morning through early voting (October 19 to 30). Editions
   ran every day October 13 to 19.
2. The October 22 Council meeting: keep the preview and `/agenda/` current
   to the final agenda, run the "what passed" recap the morning of
   October 23 on both sites, linked both ways.
3. Critic picks. Bulletin: archive note on the October 7–9 gap with an
   honest About schedule line (5, 17); Briefing headlines in the archive
   (11). Tracker: neutral labels in place of "Swam upstream", "Who's tight
   with who?" and the starburst (7); dissent-rate note, whole-word notable
   votes and a City contact link on scorecards (6).
4. Muny after the October 21 and 27 briefings; AISD when the district
   publishes a petition count.

## Last reader-facing design change

| Site | Date | What |
|---|---|---|
| theaustinbulletin.com | 2026-10-29 | One header nav on every page: Today, Vote 2026, City Hall, Topics, Archive, About. Topics opens Bonds, Charter, Budget, Muny, and Zilker. Menu button below 640px. |
| yallcityhall.org | 2026-10-06 | Field-guide homepage (previous operator) |

The Bulletin's next design change waits until 2026-11-12. The tracker is
clear for one from 2026-10-20. None is planned there: without numbers there
is nothing to judge one against. The critic picks above are wording and
content fixes, not design changes.

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
| Bulletin `/austin-city-budget-2027/` topic page (shipped 2026-10-13) | Visits to `/austin-city-budget-2027/` October 13 to November 8, from Cloudflare once the token exists | 2026-10-13 | 2026-11-09 | Fewer than 30 visits October 13 to November 8, or no analytics data (unmeasurable, killed) |
| Bulletin `/austin-charter-2026/` page explaining charter Propositions C–J one by one (shipped 2026-10-14) | Visits to `/austin-charter-2026/` October 14 to November 3, from Cloudflare once the token exists | 2026-10-14 | 2026-11-09 | Fewer than 40 visits October 14 to November 3, or no analytics data (unmeasurable, killed) |
| Bulletin `/austin-council-races-2026/` with every candidate and the incumbents' 2026 votes, linked from five tracker scorecards (shipped 2026-10-14) | Visits to `/austin-council-races-2026/` October 14 to November 3, from Cloudflare once the token exists | 2026-10-14 | 2026-11-09 | Fewer than 60 visits October 14 to November 3, or no analytics data (unmeasurable, killed) |
| Bulletin `/muny-2026/` explaining the proposed City–UT deal for Lions Municipal Golf Course, with the October 21, October 27 and November 19 meetings (shipped 2026-10-15) | Visits to `/muny-2026/` October 15 to November 12, from Cloudflare once the token exists | 2026-10-15 | 2026-11-12 | Fewer than 40 visits October 15 to November 12, or no analytics data (unmeasurable, killed) |
| Home page links to the seven guides and the October 22 preview (shipped 2026-10-15) | Share of visits to the seven guide pages that arrive from `/`, from Cloudflare once the token exists | 2026-10-15 | 2026-11-12 | Under 10% of guide-page visits October 15 to November 12 come from the home page, or no analytics data (unmeasurable, killed) |
| Bulletin `/vote-2026/` "What to bring" voter ID section, two days before early voting (shipped 2026-10-17) | Visits to `/vote-2026/` arriving from search October 17 to November 3, from Cloudflare once the token exists | 2026-10-17 | 2026-11-14 | Fewer than 50 search-referred visits to `/vote-2026/` October 17 to November 3, or no analytics data (unmeasurable, killed) |
| Bulletin `/austin-bonds-2026/` cost and Prop B split settled from the City's Bond 2026 page, early voting eve (shipped 2026-10-18) | Search-referred visits to `/austin-bonds-2026/` October 19 to November 3, from Cloudflare once the token exists | 2026-10-18 | 2026-11-14 | Fewer than 25 search-referred visits October 19 to November 3, or no analytics data (unmeasurable, killed) |
| Tracker neutral labels and scorecard contact links (critic 6, 7; shipped 2026-10-19) | Visits to `/scorecards/` pages October 19 to November 16, from Cloudflare once the token exists | 2026-10-19 | 2026-11-16 | Fewer than 150 scorecard visits October 19 to November 16, or no analytics data (unmeasurable, killed) |
| Tracker `/topics/parks/` and `/topics/police/` (shipped 2026-10-20) | Visits to the two pages October 20 to November 16, from Cloudflare once the token exists | 2026-10-20 | 2026-11-16 | Fewer than 40 combined visits October 20 to November 16, or no analytics data (unmeasurable, killed) |
| Bulletin `/vote-2026/` turnout from the County Clerk's daily totals, with busiest and quietest sites (shipped 2026-10-21) | Search-referred visits to `/vote-2026/` October 21 to November 3, from Cloudflare once the token exists | 2026-10-21 | 2026-11-18 | Fewer than 40 search-referred visits October 21 to November 3, or no analytics data (unmeasurable, killed) |
| Tracker `/issues/budget/` narrowed to budget, tax, fee and bond actions (critic 8; shipped 2026-10-21) | Visits to `/issues/budget/` October 21 to November 18, from Cloudflare once the token exists | 2026-10-21 | 2026-11-18 | Fewer than 20 visits October 21 to November 18, or no analytics data (unmeasurable, killed) |
| Morning-edition email signup under the lead, at the end of each edition, and a dismissible mobile bar (Kit form, double opt-in, shipped 2026-10-24) | Confirmed Kit subscribers in the 28 days before the judge date | 2026-10-24 | 2026-11-21 | Fewer than 25 confirmed addresses, or no Kit count (unmeasurable, killed) |

## Judged bets

| Bet | Judged | Verdict | Number |
|---|---|---|---|
| (none yet) | | | |

## Shipped

One line per reader-visible change, newest first. The daily edition does
not count. Three calendar days with no line is an alert.

- 2026-10-31 · bulletin · The Oct. 30 edition adds that the county later counted 37,932 voters Thursday, 398,291 through Oct. 29, and 1,681 limited ballots Monday through Thursday. The printed 37,831, 398,190, and 1,580 stay. No new correction.
- 2026-10-30 · bulletin · The Oct. 26, Oct. 27, and Oct. 29 editions, and the Oct. 26 clarification on /corrections, now link the county's Oct. 29 daily totals PDF. The Oct. 28 file 404s. The Vote Travis election page sits beside each daily-totals link. The Oct. 29 edition adds that the county later counted 35,355 voters Wednesday and 360,359 through Oct. 28. The printed 35,298 and 360,302 stay. No new correction.
- 2026-10-29 · bulletin · Every page uses one header nav: Today, Vote 2026, City Hall, Topics, Archive, About. Topics opens the Bonds, Charter, Budget, Muny, and Zilker hubs. City Hall goes to yallcityhall.org. Below 640px the links sit behind a Menu button that works without JavaScript.
- 2026-10-29 · bulletin · The Oct. 26 and Oct. 27 editions, and the Oct. 26 clarification on /corrections, now link the county's Oct. 28 daily totals PDF. The Oct. 26 file 404s. The Oct. 28 file still has those days' columns. No new correction: the figures were already right.
- 2026-10-28 · bulletin · A labelled email field and red Subscribe button sit under the lead, at the end of every edition, and in the footer of every other page. The form posts to Kit without JavaScript. The line is "Austin's news in 5 minutes, every morning".
- 2026-10-28 · bulletin · Masthead is the wordmark and the date. The skyline illustration is gone. Email signup sits under the lead, without the beach photo, with a Bulletin-red subscribe button and the line "Early voting numbers, council votes, road closures. Free, weekday mornings."
- 2026-10-27 · bulletin · Oct. 26 turnout line now includes 733 limited ballots, on the edition and /corrections, and the dead daily-totals PDF points at the Oct. 26 file. The Oct. 12 drug take-back line cites the Statesman after the county page came down
- 2026-10-26 · bulletin · Homepage alive pass: a labeled skyline illustration on the masthead, the Travis County Courthouse (Larry D. Moore, CC BY 4.0) on the election lead, spot art beside Before it closes, and plain sentences in place of the "If you" lines. Headlines are 10 words or fewer. The check fails an item that starts with "If you" or an image with no credit or illustration label
- 2026-10-25 · bulletin · Homepage is one lead, a "Before it closes" list, and a "This week" item. Headlines say why it matters, each with an "If you…" line drawn from the sourced copy. Disclaimers and "Keep these close" moved to About and the archive. Nav is Today, Election, Archive, Subscribe. Warm paper, bold headlines, one red. No lead photo: no credited Commons file shows this year's early voting. Signup line is "Austin in 5 minutes, every morning. Free."
- 2026-10-24 · bulletin · Email signup under the homepage lead, a compact signup at the end of every edition, and a dismissible mobile bar. "What matters in Austin, in your inbox each morning. Free." Each placement is Kit's official embed, with a no-JavaScript link to the hosted form. RSS still works
- 2026-10-22 · tracker · Two more topic pages `/topics/sidewalks-bikeways/` and `/topics/animal-services/`: every official Council vote since 2023 naming sidewalks, bikeways, bicycle lanes or plans, urban trails or shared-use paths (61 items) and every one naming animals, Austin Animal Services, Austin Pets Alive or veterinary services (31), in the City's wording with outcome, tally and roll-call link; linked from Issues
- 2026-10-22 · bulletin · `/vote-2026/` turnout through day three from the County Clerk's daily totals: 131,689 Travis County ballots through Wednesday, October 21 (120,626 in person, 10,816 mail, 247 limited), 13.88% of 948,575 registered; in person 40,777, 40,359 and 39,490 by day; the five busiest and three quietest sites over three days
- 2026-10-21 · tracker · `/issues/budget/` lists only items whose own action is a budget, tax rate, fee, appropriation or bond (51 items, was 217 and about 24,000 words of mostly contracts and lawsuit settlements); the page says what it leaves out, and the Issues count matches (critic finding 8)
- 2026-10-21 · bulletin · `/vote-2026/` turnout from the County Clerk's own daily totals: 90,955 Travis County ballots through Tuesday, October 20 (81,136 in person, 9,680 mail, 139 limited), 9.59% of 948,575 registered; in person 40,777 Monday and 40,359 Tuesday; the five busiest and three quietest early-voting sites; a link to the County's live turnout tracker
- 2026-10-21 · tracker · Two more topic pages `/topics/libraries/` and `/topics/traffic-safety/`: every official Council vote since 2023 naming a library or the Austin Public Library (33 items) and every one on speed limits, Vision Zero, Safe Streets and Roads for All, Safe Routes to School, pedestrian or intersection safety and high-crash locations (37), in the City's wording with outcome, tally and roll-call link; linked from Issues
- 2026-10-21 · bulletin · `/vote-2026/` "Turnout so far": nearly 41,000 Travis County votes on the first day of early voting, about 4.3% of 952,713 registered voters, above every midterm first day this century (4.14% in 2018, 2.8% in 2022), and statewide turnout of about 3.7% by Tuesday evening (KUT from Secretary of State data, KXAN tracker)
- 2026-10-20 · tracker · Two more topic pages `/topics/parks/` and `/topics/police/`: every official Council vote since 2023 naming parkland or the Parks and Recreation Department (160 items) and every one naming the police (172: APD budgets, contracts, grants, the Police Oversight Act and Office of Police Oversight, the Community Police Review Commission), in the City's wording with outcome, tally and roll-call link; linked from Issues
- 2026-10-20 · tracker · Two more topic pages `/topics/…/`: every official Council vote since 2023 carrying a City zoning or neighborhood plan case number (C14, C14H, C814, NPA; 1,322 items) and every one naming affordable or income-restricted housing, housing tax credits or bonds, S.M.A.R.T. Housing or the City's housing finance corporations (438), in the City's wording with outcome, tally and roll-call link; linked from Issues
- 2026-10-20 · bulletin · Archive: each edition shows its Briefing headline under the date, and missing days are marked ("No edition October 7–9."); the note now reads "One edition each morning since…" instead of "every morning". About: the schedule line says the archive marks missed days, the publisher line says he does not review each edition before it publishes, and the rules link by name (Editorial Rulebook, Daily procedure) instead of file names (critic findings 5, 11, 17; not a design change)
- 2026-10-19 · tracker · Neutral labels: a plain "Unofficial result · pending approved minutes" label replaces the starburst, the ribbon drops "keep council weird", "Who's tight with who?" becomes "How often members vote together", "swam upstream" becomes "in the minority". Scorecards: notable votes cut at a word, a dissent rate under 0.5% reads "<1%" with a note on how it is computed, and each current member links the City's page for their seat (critic findings 6, 7)
- 2026-10-19 · tracker · Four more topic pages `/topics/…/`: every official Council vote since 2023 naming Austin Energy (212 items), Austin Water (284), Austin-Bergstrom International Airport (144) and density bonus programs (288), in the City's wording with outcome, tally and roll-call link; linked from Issues
- 2026-10-19 · bulletin · `/austin-council-races-2026/` District 9: what Heyman, Kam, Qadri and Huang told KUT on affordability, Project Connect and homelessness, side by side; Huang's Prop I and bond positions fill the stance table (Thadani did not respond); a link to the Texas Tribune's District 9 forum video (KUT, October 19)
- 2026-10-18 · bulletin · `/austin-bonds-2026/` settles the homeowner cost: a projected $41.60 a year by 2033, built up as about $49M of debt is issued yearly (Community Impact, August 6), with KUT's $40 shown as the City's same estimate for a $495,000 home. Prop B's split is now the City's own ($20M Hampton, $15M Colony Park, Bond 2026 page), and Prop A's allocation cites the City instead of a report
- 2026-10-18 · tracker · Topic pages `/topics/…/`: every official Council vote since 2023 on Project Connect (26 items), I-35 Capital Express and cap and stitch (35), homelessness (139), the property tax rate (21) and bond elections (10), in the City's wording with outcome, tally and a link to the roll call; linked from Issues
- 2026-10-18 · bulletin · October 22 Council preview rechecked against the City's final agenda: now 53 numbered items, item 2 removed, and the added items 52 (Gallup contract extension, +$1,257,000) and 53 (Texas Municipal League Region 10 vote) listed (Legistar)
- 2026-10-17 · bulletin · `/vote-2026/` "What to bring": the seven accepted photo IDs and expiry rules, the no-ID route (supporting documents and the Reasonable Impediment Declaration), forgotten-ID options, phone and campaign-clothing rules at the polls, curbside voting (VoteTexas, Travis County Clerk); links the County's October 15 corrected ballot (Austin contests unchanged); candidate panels now past tense
- 2026-10-17 · tracker · `/agenda/feed.xml`: RSS feed of the next Council agenda (October 22, 52 items), one entry per item in the City's wording, linked to the item on its meeting page; linked from `/agenda/` and How to read
- 2026-10-17 · bulletin · `/austin-bonds-2026/`: "Where earlier bond money stands" from the City's new bond dashboard ($1.72B of $2.45B spent, per-program figures for 2016–2022, KXAN); Prop A's five-way split; Prop B now quotes the ballot language and shows that reports of the Hampton/Colony Park split differ ($20M/$15M vs $25M/$10M) instead of stating one
- 2026-10-16 · bulletin · `/aisd-state-intervention/` refreshed after the October 15 deadline: the Burnet and Webb petitions were filed and received, ACPTA's stated goals (299 and 174), no official count yet, the October 30 enrollment match, the December 1 report to TEA, the January 30, 2027 closure-plan date, and parents' concerns about pressure, pre-filled forms and withdrawing a signature (KUT)
- 2026-10-16 · tracker · The October 22 meeting page, `/agenda/` and the home page say how and when to sign up to speak: online registration opens Monday, October 19 at 10 a.m. and closes Wednesday, October 21 at noon; City Hall kiosks close Thursday at 9:15 a.m., linked to the City's rules (critic finding 4)
- 2026-10-16 · bulletin · `/austin-council-races-2026/`: "Where candidates stand on the bonds and Prop I" table for Districts 5, 8 and 9 (each candidate's stated position on Props A–B and Prop I, sourced to Austin Current), a link to KUT's District 1 Q&A, and the October 15 panel moved to past tense
- 2026-10-15 · tracker · Agenda search matches word starts and whole numbers: "rent" no longer returns "currently", "East 6th" no longer returns East 15th or Southeast (critic finding 3)
- 2026-10-15 · bulletin · Home page: the empty "Around Austin" rail now carries the edition's four City Desk leads, each with its source and a link into the edition, whenever no curated front-page packet exists (none since October 6); "Keep these close" now links the October 22 preview, the Council races, Props A–B, Props C–J, the budget, AISD and Muny guides (critic findings 1 and 2; a fix, not a design change)
- 2026-10-15 · tracker · `/scorecards/` search title and description name the 11 current and 3 former members and the 76,087 official vote records (2023–2026), plus GovernmentOrganization data listing each current member's seat and scorecard (visible in search results)
- 2026-10-15 · bulletin · `/muny-2026/`: the proposed City–UT deal for Lions Municipal Golf Course on one page (what changes for Muny, WAYA and the Brackenridge land, the numbers, each party's words, history since 1924, the October 21, October 27 and November 19 meetings)
- 2026-10-14 · tracker · Scorecards of the five members whose seats are on the 2026 ballot (Harper-Madison, Velásquez, Alter, Ellis, Qadri) link the Bulletin's `/austin-council-races-2026/`
- 2026-10-14 · bulletin · `/austin-council-races-2026/`: the five Council races in ballot order, why Districts 1 and 8 are open (Ellis's petition 62 signatures short), each incumbent's attendance and 2026 bond and budget votes linked to the tracker, the October 15 District 1 panel; linked from `/vote-2026/`
- 2026-10-14 · tracker · The August 6 charter election order (item 4), on the meeting page and its item page, links the Bulletin's `/austin-charter-2026/` guide to Propositions C–J
- 2026-10-14 · bulletin · `/austin-charter-2026/`: charter Propositions C–J one at a time (official ballot question, plain-words meaning, the August 6 Council order linked to the tracker, each side's words on the Prop I audit, dates), linked from `/vote-2026/` and `/austin-bonds-2026/`
- 2026-10-13 · tracker · The August 12 budget (9-2), tax rate (8-2) and 911 office (6-2) votes, on the meeting page and item pages, link the Bulletin's `/austin-city-budget-2027/` guide
- 2026-10-13 · bulletin · `/austin-city-budget-2027/`: the $6.6B 2026-27 City budget on one page (new tax rate, $285.84 typical household cost, what was added and cut, the August 12 votes linked to the tracker, each side's words, the 911 office and consultant report, dates), linked from `/austin-bonds-2026/`
- 2026-10-13 · tracker · The August 4 and August 6 bond votes (meeting entries and item pages) link the Bulletin's `/austin-bonds-2026/` guide to Propositions A and B
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

Steps are in `docs/reviews/owner-2026-43.md`.

- `CLOUDFLARE_ANALYTICS_TOKEN` in the cloud environment (read-only
  Account Analytics token). Asked 2026-10-12 and 2026-10-19. Blocks every
  number and bet.
- The OpenRouter monthly figure, and a hard monthly credit limit on the
  OpenRouter account, so the $100 ceiling can be enforced. Asked 2026-10-12
  and 2026-10-19.
- Google Search Console and Bing Webmaster Tools properties for both
  domains.
- Bluesky and X accounts for each publication, with credentials in the
  environment.
- Optional: a working fine-grained GitHub token (issues and actions write
  on both repos) as `GH_TOKEN` in the cloud environment, so the alert
  scripts work there. Without it the owner uses the GitHub MCP tool.
