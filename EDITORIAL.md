# Editorial Rulebook — The Austin Bulletin

Read this file at the start of every daily run. These rules are not
suggestions. Every rule binds the writing.

## Voice

- The morning note is warm and local — a friendly Austinite. It may
  mention heat, traffic, city mood. It never carries political opinion.
- Story paragraphs are flat, clear, and neutral. In the Big Story, short
  paragraphs. River item lengths follow the lead/brief contract in "The
  shape of a day": briefs about 25 words, leads 50–70.
- In brief items are one sentence each and start with a bold one-word
  category label and a colon: `**Outage:**`, `**Politics:**`, `**Border:**`.
- The Big Story ends with one "What's next" sentence: a date, a vote, a
  deadline, or a scheduled event. River items may carry one when it earns
  it. It states what is scheduled, never what should happen.
- The Big Story's image is the page's hero; choose it with the most care.
  In the River, an image or card follows the item it belongs to.
- Bulletin titles are plain: "The Austin Bulletin — {Weekday, Month D, YYYY}".
  Never puns or jokes.
- Each glance cell carries one blurb: a single plain sentence, at most
  16 words, in the Morning Note's voice, saying what the number means for
  the reader's day. `npm run today` writes a sensible default; the
  morning writer may rewrite it, but never adds opinion or politics and
  never repeats the number the cell already shows.
- Every initialism is expanded on its first use in the edition, then used
  short: "the Electric Reliability Council of Texas (ERCOT)", "Emergency
  Services District 5", "Independent School District". This covers agencies,
  districts, utilities, stadiums (DKR), road nicknames (first use as "MoPac
  (Loop 1)"), and vendor names used as bare nouns (Flock, Axon). The Big Story
  counts as first use; the River need not repeat it.
- An index number carries its scale: the air-quality cell reads "59 of 500",
  not "59". The scale is stated only where it is inherent to the index or
  published by a source — never calculated. Do not write comparisons like
  "about 85% of the record"; that is a calculation, and calculations are
  forbidden by the accuracy rules.

## The shape of a day

1. The Morning Note (voice, zero politics).
2. The Big Story: one piece, 400–700 words, with its own headline, that
   connects two to four of the day's items into one idea. It explains and
   connects; it never says what should happen. Every claim links. When a
   dispute exists, each side's own words. It ends with a What's next line.
3. The River: 25–40 items grouped by beat, in this fixed order: Roads & transit ·
   Public safety & courts · City Hall & county · Schools · Health · Business & tech ·
   Around town · Texas · Sports. Missing beats are omitted, never padded.

   Each beat holds two kinds of item.

   A **lead** opens with a `#####` headline and runs 50–70 words (the gate
   fails outside 40–80). At most two per beat, at most twelve per edition. An
   item becomes a lead only if it passes the impact test below. A beat with
   nothing that passes has no lead — never promote an item to fill a slot.

   A **brief** is every other item: one sentence, about 25 words, no headline
   (the gate fails above 35). Briefs are the default; most of the River is
   briefs.

   Every item, lead or brief, ends with a source tag. The whole River targets
   about 1,500 words and fails above 2,200.

   **The impact test.** An item earns a lead if it meets any of:
   1. Someone was killed or seriously hurt.
   2. Money or a rule that binds residents changed — a vote taken, a price
      set, a contract signed, a ban enacted.
   3. Something closes, opens, or changes today or this week — a road, a
      school, a utility, a service.
   4. A decision is scheduled, with a date — a vote, a hearing, a deadline.

   This test is published on the About page. It is the site's answer to "who
   decided this mattered", so it is applied literally, not loosely.
4. Weather: its own `## Weather` section after the River, not a River beat.
   It opens with the day's NWS forecast and active alerts, then any weather
   items worth having (records, streaks, what the week does), then the
   weather graphic if there is one, then its own sources line. The masthead's
   "Skip to weather" link points at this heading, so the section must exist
   every day and keep the id `weather`.
5. Rituals: The Number (daily), Countdown (daily), This Weekend in Austin
   (Thursday and Friday), Sunday Paper (Sunday), One Good Thing (daily
   closer, Morning Note voice).

Standings was cut 2026-08-24 at the publisher's direction. Do not reinstate
it or propose a replacement. Only the ritual was cut: the Sports beat in the
River stays exactly as it is.

Weather became its own section 2026-08-24 at the publisher's direction,
resolving a long-standing disagreement between this file and PIPELINE.md: the
first two bulletins ran Weather as the last River beat while PIPELINE Step 3
described a `## Weather` section. The section wins. The River's item count
excludes weather items, so a 25–40 River is 25–40 non-weather items. The
2026-08-23 bulletin still has Weather inside its River and is left alone —
published editions are not restructured after the fact.

**This Weekend has no source behind it** (checked 2026-08-24). Every events
listing tried — the Chronicle's calendar, Do512 — blocks us or has no feed,
and r/Austin's weekly thread is a tip sheet only: a commenter saying a show
is free at 7 is not a source for that. Until a readable source is in place,
skip the slot and say in the log that it was skipped and why. An event whose
time or price we cannot verify is worse than an absent ritual.

## Voice cards and video

- A Voice card shows a public post verbatim, attributed and linked:
  agencies, outlets, officials, teams, businesses, and ordinary people
  commenting publicly on Austin life. Community commentary is welcome:
  the point is to let the city talk.
- Never: minors; private facts about anyone; posts that target or mock a
  private person; posts about a private individual's crime or misfortune
  unless it is already public record in a linked story; anything that
  would need a correction if false — cards carry opinion, not new facts.
- On contested public questions, cards run in pairs: one voice from each
  side, or none.
- Cap: 10 cards a day, 3 videos a day. Video is the outlet's own upload,
  embedded, never re-hosted.
- Cards and videos are gathered with `npm run card -- <post-url>` and
  `npm run video -- <youtube-url>` (PIPELINE.md Step 4).
- Daily minimums, not just caps. An edition carries at least four Voice cards
  (target six to ten, at most two in any one beat), at least one original
  graphic, and one to three videos. Any beat running more than 400 words
  carries at least one visual. The cards are what break up the River; an
  edition that ships two of them has not met the rule, and the pre-publish
  check will fail.
- A graphic's subtitle never restates its source list. `npm run graphic`
  generates the attribution caption from the spec's `source` field, so writing
  the outlets into the subtitle as well prints the same credit twice.

## Neutrality rules

1. Report what happened and who said what. Never state whether a policy
   is good or bad.
2. Political stories present each side's own words, each with a link.
   One trusted article that itself carries each side's own words satisfies
   this rule: "each with a link" means each side's words trace to a linked
   source, not that each side needs a separate URL. (Ruling approved by the
   publisher, 2026-08-23.)
3. Use neutral verbs: "said" — never "claimed", "admitted", "slammed".
4. No loaded labels for people or groups.
5. The morning note may have personality, never political opinion.
6. Weekly balance check: every Sunday, re-read the past 7 bulletins and
   note in the log whether story selection leaned toward any side. Adjust
   the coming week if it did. Check **topic concentration** in the same
   pass: list the week's Big Story subjects and note any subject that led
   more than twice. A single subject can dominate on the merits for days —
   data centers nearly took two mornings running on 2026-08-24 and
   2026-08-25 — and the result reads as a paper about one thing. Where a
   subject is genuinely the biggest news again, it stays; the check exists
   so that is a decision, not a default.

## Accuracy rules

1. Every fact traces to a source read this morning, linked in the story.
2. Two independent sources for surprising or disputed claims.
3. Quote numbers from sources. Never calculate or extrapolate them.
4. If sources disagree, the bulletin says so.
5. Social media posts are never the sole source for a story.
6. Unverifiable story = omitted story. Missing is better than wrong.

**Single-sourced reports from unnamed sources may run** (publisher's ruling,
2026-08-25). When a trusted outlet reports something on its own, attributed to
sources it does not name, and no second outlet has it, the story is not dropped
under rule 2. It runs on one condition: the item states that sourcing in its own
prose, so the reader weighs it as we do — "the Austin Business Journal reported,
citing several sources", "no agreement has been finalized" — never as a flat
assertion of the fact. This is a narrow carve-out from rule 2 for one shape of
story: a named, trusted outlet standing behind its own reporting. It does not
license anything else rule 2 covers. A surprising claim we cannot trace to an
outlet willing to put its name on it still needs two sources.

## Trusted outlets

KXAN, KVUE, CBS Austin, FOX 7 Austin, Austin American-Statesman,
Austin Current, KUT, Texas Tribune, Community Impact, National Weather
Service (weather.gov/ewx). Other established outlets may be cited as a
second source. Add outlets here only after discussion with the publisher.

**KUT** (kut.org) joined the list 2026-08-24. Austin's NPR station, a staffed
newsroom covering transportation, health, criminal justice, city government
and the arts; it partners with Austin Current on a local news show. It had
been cited in bulletins without being listed, which this corrects.

**Austin Current** (austincurrent.org) replaced the Austin Monitor on this
list 2026-08-24. It is a 501(c)(3) nonprofit newsroom in The Texas Tribune's
network of editorially independent local newsrooms, publishing roughly one
story a weekday on City Council, Travis County, Austin ISD, the city budget
and bonds. It is the strongest source we have for the City Hall & county and
Schools beats — check it every morning. Summarise and link as with any
outlet; never reproduce its articles at length.

**The Austin Monitor** stopped publishing in October 2025 and its staff left
to found Austin Current. austinmonitor.com remains as a searchable archive:
fine to link for background, never a source for today's news.

**KVUE is discovery-only** (2026-08-24, publisher's decision). Its article
pages are unreachable from the routine and the one route that would work is
disallowed by its robots.txt, which we honour. Read its RSS to learn what
happened in town, then report the story from a source we can actually read —
another outlet, or the agency, department or court the story came from. A
readable source exists, a **relayed item** is allowed, so the bulletin still
shows what KVUE is covering (publisher's call, 2026-08-24). A relayed item:

- is one sentence, and says nothing its source sentence does not say — no
  added context, no figure that was not in the teaser, no What's next;
- attributes in the prose, not just the tag: "KVUE reported that …";
- is never the Big Story, and never carries an image.

Do not relay a teaser about a person's death or injury, a crime accusation
against a named person, a disputed political claim, or any figure that has to
be right. A teaser drops qualifiers, and we will not see a correction to it.
Those stories need a readable source or they are dropped and logged, as with
any unverifiable story. Relaying is the last resort, after the primary source
has been tried.

Never reach an outlet's content through a path its robots.txt disallows, and
never send a User-Agent we are not, however much a story is worth. Access is
a question for the publisher, not something a run engineers around.

## Image rules (per story, in priority order)

1. An original graphic built from the story's own verified facts —
   a chart, a map, or a timeline — made with `npm run graphic` (see
   PIPELINE.md Step 4). Use it whenever the story has a number that
   changes, a place, or a sequence of dates. Every figure in it must
   trace to a linked source; the caption names the source.
2. Official embed — the source's own X/Facebook post, when one exists.
   Hard cap: 2 embeds per bulletin, total. This is the only way to show
   another outlet's photograph.
3. A real photo of the story's actual subject, verified: open the
   photo's own description page and confirm it names the same place or
   thing the story does. Allowed sources: free-licensed archives
   (Wikimedia Commons, Flickr CC), and photos that government agencies
   release with their statements (city, county, state, federal),
   credited to the agency. A generic stand-in, or a photo you cannot
   verify, does not qualify.
4. Photorealistic AI image, generated with `npm run illustrate`, when
   none of the above exists. Caption exactly "AI-generated image". Never
   real or recognizable people; never posed as a photo of the event.

Never: photos copied out of another outlet's article (copyright);
screenshots of other outlets' pages or feeds; AI images captioned as
photographs; photos you could not verify.

## Corrections

Fix errors with a visible note inside the bulletin, wrapped in
`<p class="correction">`: "Correction: an earlier version said X. The
correct fact is Y." Never silently erase an error.

## Pre-publish quality gate

Do not push unless every check passes:

1. Every story has a working source link.
2. Every summary matches what its source actually says.
3. Date, title, and permalink are correct and consistent.
4. Every image loads (HTTP 200) and follows the image rules; embed cap
   respected.
5. No empty sections; `npm run build` succeeds with no errors.
6. The full page reads clean top to bottom — no leftover notes, no
   sample text, no broken markdown.

A story that fails a check is fixed or dropped. A bulletin that cannot
pass the gate is not published; log why.
