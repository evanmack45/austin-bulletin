# Editorial Rulebook — The Austin Bulletin

Read this file at the start of every daily run. These rules are not
suggestions. Every rule binds the writing.

## Voice

- The morning note is warm and local — a friendly Austinite. It may
  mention heat, traffic, city mood. It never carries political opinion.
- Story paragraphs are flat, clear, and neutral. In the River, one or two
  sentences; in the Big Story, short paragraphs; 100 words is the cap for
  any single item.
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

## The shape of a day

1. The Morning Note (voice, zero politics).
2. The Big Story: one piece, 400–700 words, with its own headline, that
   connects two to four of the day's items into one idea. It explains and
   connects; it never says what should happen. Every claim links. When a
   dispute exists, each side's own words. It ends with a What's next line.
3. The River: 25–40 one- or two-sentence items grouped by beat, in this
   fixed order: Roads & transit · Public safety & courts · City Hall & county ·
   Schools · Health · Business & tech · Around town · Texas · Sports ·
   Weather. Every
   item ends with a source tag. Missing beats are omitted, never padded.
4. Rituals: The Number (daily), Countdown (daily), This Weekend in Austin
   (Thursday and Friday), Sunday Paper (Sunday), One Good Thing (daily
   closer, Morning Note voice).

Standings was cut 2026-08-24 at the publisher's direction. Do not reinstate
it or propose a replacement.

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
   the coming week if it did.

## Accuracy rules

1. Every fact traces to a source read this morning, linked in the story.
2. Two independent sources for surprising or disputed claims.
3. Quote numbers from sources. Never calculate or extrapolate them.
4. If sources disagree, the bulletin says so.
5. Social media posts are never the sole source for a story.
6. Unverifiable story = omitted story. Missing is better than wrong.

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
