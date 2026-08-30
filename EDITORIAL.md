# Editorial Rulebook — The Austin Bulletin

Read this file at the start of every daily run. These rules are not
suggestions. Every rule binds the writing.

## Voice

- The morning note is warm and local — a friendly Austinite. It may
  mention heat, traffic, city mood. It never carries political opinion.
- Story paragraphs are flat, clear, and neutral. First Read is a short
  editor's brief, not an article. River item lengths follow the lead/brief
  contract in "The shape of a day": briefs about 25 words, leads 50–70.
- In brief items are one sentence each and start with a bold one-word
  category label and a colon: `**Outage:**`, `**Politics:**`, `**Border:**`.
- First Read ends with one "What's next" sentence: a date, a vote, a
  deadline, or a scheduled event. River items may carry one when it earns
  it. It states what is scheduled, never what should happen.
- First Read's chart is the page's hero; choose and build it with the most
  care. In the River, an image or card follows the item it belongs to.
- Bulletin titles are plain: "The Austin Bulletin — {Weekday, Month D, YYYY}".
  Never puns or jokes.
- Street-level specificity: name the block, the bar, the campus, the person.
  The Chronicle's specificity is the sensibility this paper borrows — never
  its instinct to let taste outrank consequence (rulings from the 2026-08-29
  selection jam).
- A venue, kitchen, festival or long-standing gathering place opening,
  closing, or under threat is a business story about the city's economy and
  identity — never entertainment filler. It still ranks below anyone's rent
  or safety, and a closing reported only by social posts is a tip to chase,
  not a story (accuracy rule 5).
- **Write like a person** (Evan, 2026-08-29). The copy must not read as
  AI-generated. Mechanically enforced by the gate: no AI-tell phrases
  ("stands as a", "serves as a", "a testament to", "underscores", "it's
  not just", "vibrant", "nestled", "delve", "pivotal moment", "rapidly
  evolving", "rich tapestry", and vague attributions like "experts say" —
  name the person or the outlet instead), and no trailing "-ing analysis"
  clauses (", highlighting the…", ", reflecting broader…"). Enforced by
  reading, not the gate: vary sentence length — First Read carries at
  least one sentence under six words and never three same-shaped sentences
  in a row; at most one em dash in all of First Read; one turn of phrase
  per First Read, spent early, never as a closing bow — the section ends
  on its hardest concrete fact, not a summary; no parallel-structure
  flourishes (rule of three, chiasmus, "not X but Y" as ornament).
- Each glance cell carries one blurb: a single plain sentence, at most
  16 words, in the Morning Note's voice, saying what the number means for
  the reader's day. `npm run today` writes a sensible default; the
  morning writer may rewrite it, but never adds opinion or politics and
  never repeats the number the cell already shows.
- Every initialism is expanded on its first use in the edition, then used
  short: "the Electric Reliability Council of Texas (ERCOT)", "Emergency
  Services District 5", "Independent School District". This covers agencies,
  districts, utilities, stadiums (DKR), road nicknames (first use as "MoPac
  (Loop 1)"), and vendor names used as bare nouns (Flock, Axon). First Read
  counts as first use; the River need not repeat it — and because First Read
  precedes the River, an initialism it touches must be expanded there or
  avoided there.
- A glance metric leads with its source's own status word, never a bare
  number on an unstated scale (ruling 2026-08-29, replacing the "59 of 500"
  form): the air-quality cell reads "54 · Moderate" — the EPA's category —
  and the grid cell leads with ERCOT's own condition word ("Normal"), with
  the megawatt figures told as a story in the blurb. Each cell carries a
  status mark the reader can take in without reading: a pictorial emoji for
  weather and sunrise, and a colored ink dot for the scaled metrics, colored
  by the source's published scale (EPA colors for air, pollen categories,
  ERCOT conditions). Lake Travis has no published scale; its dot thresholds
  are a documented presentation choice in eleventy.config.js. Numbers are
  still never calculated: every figure shown is the source's own. Do not
  write comparisons like "about 85% of the record"; that is a calculation,
  and calculations are forbidden by the accuracy rules.

## The shape of a day

1. The Morning Note (voice, zero politics).
2. First Read (name provisional): the old Big Story's synthesis at a
   quarter the length — the day's chart plus 150–250 words (the gate allows
   120–300) of connected prose under a ### headline stating the day's idea.
   It connects two to four of the day's items into one thought, explains,
   and never says what should happen; when a dispute exists, each side's
   own words. "The Austin point of view" means relevance — what this
   touches in a reader's bills, commute, schools — never opinion. The chart
   is the day's original graphic, built by us from the day's verified
   figures, and it is the page's hero. The section ends with a What's next
   line and a Sources line; claims trace to the Sources line rather than a
   thicket of inline links. (Two rulings, both Evan's, 2026-08-29: the
   400–700 word article died first — nobody grants 650 AI-written words the
   benefit of the doubt — and a link-heavy routing brief died the same
   evening as "spammy." Prose synthesis, short, with links kept to the
   Sources line, is the standing shape. In-page links are allowed sparingly
   and must land on real anchors; the gate validates any that appear.)
3. The River: 25–40 items grouped by beat, in this fixed order (the
   six-beat map adopted 2026-08-29 from the beat-taxonomy jam,
   docs/reviews/river-beats-jam-2026-08-29.md — the order is the Who Pays
   ladder): **Money & bills · Public safety & courts · Growth &
   infrastructure · City Hall & county · Schools · Business & street
   life**. Missing beats are omitted, never padded.

   Routing rules, which exist so every story has exactly one home:
   - **Money & bills** holds any story whose news event IS a tax, fee,
     rate, bond, or budget, no matter which body voted it.
   - **Public safety & courts** holds incidents AND the accountability
     stories around them — crashes and collisions included; a fatal wreck
     is a safety story, not a transportation story.
   - **Growth & infrastructure** routes by subject, not by which body held
     the meeting: land use, zoning, corridors, housing supply, road and
     transit projects, utilities, data centers.
   - **City Hall & county** keeps what remains of governance: elections,
     appointments, conduct, process.
   - **Business & street life** treats venues, food, festivals, arts and
     community life as first-class economic news — entertainment and
     culture live here, not in a lifestyle bucket.
   - **Texas is not a beat.** A statewide story that clears the household
     filter is sorted by its content like any other story.
   - There is no Health beat: a health story routes by its hook — cost,
     incident, or institution.
   - **Locality labels.** A brief whose story sits outside Austin city
     limits opens with a bold place label — "**Georgetown:**",
     "**Round Rock:**" — so a reader can tell forty miles from four blocks
     without reading the sentence. A lead names the place in its headline
     instead. Austin-proper items carry no label. (2026-08-29 panel: both
     local-utility readers had to read every line to place the story.)

   Each beat holds two kinds of item.

   A **lead** opens with a `#####` headline and runs 50–70 words (the gate
   fails outside 40–80). At most two per beat, at most twelve per edition. An
   item becomes a lead only if it passes the impact test below. A beat with
   nothing that passes has no lead — never promote an item to fill a slot.
   Fewer than four leads in the River warns, but does not fail the gate — the
   impact test is allowed to legitimately find nothing on a quiet day, and a
   hard fail would punish correct editorial judgment.

   A **brief** is every other item: one sentence, about 25 words, no headline
   (the gate fails above 35). Briefs are the default; most of the River is
   briefs.

   Every item, lead or brief, ends with a source tag, and the tag is the
   link: each outlet name links to the article the item came from (ruling
   2026-08-29 — the old bottom wall of source links is gone). A KVUE
   relayed item's tag stays plain. The whole River targets
   about 1,500 words, warns above 1,800 — the early signal that items are
   drifting long, the same drift that went unnoticed for six editions — and
   fails above 2,200.

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
5. Rituals: The Number (daily), Countdown (daily) — The Number's figure is
   not restated as digits elsewhere in the edition; other sections
   reference the fact, never the number itself — This Weekend in Austin
   (Thursday and Friday), Sunday Paper (Sunday), One Good Thing (daily
   closer, Morning Note voice). Countdown's first use each edition names the
   stadium in full — "Darrell K Royal-Texas Memorial Stadium (DKR)" — then
   short form ("DKR") thereafter, per the initialism rule above. Because
   tomorrow's writer copies today's file as its format template, a ritual
   line that ships with a bare "DKR" propagates that mistake forever — expand
   it in the template line itself, not just in this morning's copy.

Standings was cut 2026-08-24, and on 2026-08-29 Evan cut the Sports beat
itself, superseding the earlier "the beat stays" ruling. Pro and college
sports do not run. Community sports (a high-school football night) may run
in Business & street life when it clears the Who Pays ladder as community
life. Do not reinstate a sports beat or ritual, or propose either.

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
- Every card opens with a plain-words framing line naming what it is ("A
  reader's post on Reddit") — the template renders it; never assume a
  reader knows what r/, u/ or a handle means (2026-08-29 panel: the
  unframed card ended the least-online reader's first successful visit).
- A card never sits directly adjacent to an item reporting a death or
  serious injury. A sympathy-scroll quote beside a fatality item reads as
  tonal whiplash, however kindly meant (same panel: three readers flagged
  it; the condolence card was pulled).
- Cap: 10 cards a day, 3 videos a day, enforced across the whole edition —
  not scoped to the River the way the minimums below are. (The River also
  carries its own copy of the same cap, since a River that alone reached 10
  cards would already have tripped the edition-wide one.) Video is the
  outlet's own upload, embedded, never re-hosted.
- Cards and videos are gathered with `npm run card -- <post-url>` and
  `npm run video -- <youtube-url>` (PIPELINE.md Step 4).
- Daily minimums, not just caps. The River carries at least four Voice cards
  (target six to ten, at most two in any one beat), at least one original
  graphic, and one to three videos. Any beat running more than 400 words
  carries at least one visual. These minimums are scoped to the River, not
  the edition as a whole: the First Read chart or a chart in the
  Weather section does not count toward them, because their job is
  interrupting the River's wall of text specifically — a visual sitting
  somewhere else in the page does not do that. The cards are what break up
  the River; a River that ships two of them has not met the rule, and the
  pre-publish check will fail.
- The daily original-graphic minimum means one graphic from `npm run
  graphic` — its output is wrapped in `<figure class="graphic">`, which is
  what the pre-publish check looks for. A photo (a bare Markdown image, or
  any other `<figure>`) still counts toward a beat's density requirement —
  for breaking up a wall of text, any visual works — but it does not satisfy
  the original-graphic minimum. A wire photo is not a substitute for a chart,
  timeline, or map the Bulletin made.
- A graphic's subtitle never restates its source list. `npm run graphic`
  generates the attribution caption from the spec's `source` field, so writing
  the outlets into the subtitle as well prints the same credit twice.

### The visual_exception escape hatch

Every other rule in this gate is within the writer's control — an item can
always be cut to 35 words, a beat can always be trimmed under 400 words.
The visual minimums are different: on a genuinely quiet news day there may
not be four public posts worth carrying as cards. Publisher's ruling: publish
with a logged exception rather than silently ship no paper.

An edition's front matter may carry `visual_exception: "<reason>"`. When the
reason is substantive — a real sentence with at least 4 distinct words of
three or more letters each, and 20 non-whitespace characters — it downgrades
exactly these four rules from FAILURE to WARNING. A placeholder like "n/a",
a run of punctuation padded past the character floor (twenty dots, twenty
dashes), or a handful of short or repeated tokens padding for a word count
("a a a a ....................", "aaaa aaaa aaaa aaaa", "x y z w
...................."), is rejected as its own failure, not treated as no
exception at all: each clears the character count, or the raw token count,
without actually saying anything, and the distinct-word floor exists
specifically to catch that.

- the voice-card minimum (`voiceMin`, at least 4 cards)
- the graphic minimum (`graphicMin`, at least 1)
- the video minimum (`videoMin` — the lower bound only; the 1–3 cap's upper
  bound is never touched)
- the per-beat density rule (`beatWordsBeforeVisual`, a visual required past
  400 words in a beat)

These never bend, exception or not, because too many visuals is never a
supply shortage: the voice-cards-per-beat cap (`voicePerBeat`), the
voice-cards-per-edition cap (`voiceMax`), and the videos-per-edition cap
(`videoMax`). Nothing outside the visual minimums is ever exceptable —
item lengths, lead counts, item counts, the River word budget, and every
language rule stay hard failures under all circumstances.

Use this only for genuine scarcity, never to skip the work of finding
cards. The reason is written into the edition's own front matter, and
when the exception is invoked it is recorded in that morning's run log
(PIPELINE.md Step 6) — quoted, with the minimums it covered — so the
publisher can see how often the hatch is being used. A hatch nobody can
audit is the drift this whole change exists to prevent.

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
   pass: list the week's First Read headline subjects and note any subject
   that led more than twice. A single subject can dominate on the merits for days —
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
7. **State the load-bearing fact.** When the day's items only make sense
   against a fact — a death, a closure, an election result — that fact is
   stated plainly on the page with a source, even when the fact itself is
   out of scope (national wire, old news). One clause suffices; implying
   it is never enough. (2026-08-29 panel: the edition celebrated a Dolly
   Parton tribute weekend without ever saying she had died.)

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
- attributes in the prose, not just the tag: "KVUE reported that …" — and
  its tag reads `KVUE (relayed)`, unlinked, so the missing link registers
  as policy rather than a mistake;
- never leads First Read, and never carries an image.

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
5. The River's leads and briefs meet the lead/brief contract — lengths, and
   lead counts per beat and per edition — and the River meets its visual
   minimums and caps (Voice cards, graphic, video), unless a logged
   `visual_exception` applies (see "The visual_exception escape hatch" above).
6. Every initialism is expanded on its first use in the edition.
7. No empty sections; `npm run build` succeeds with no errors.
8. The full page reads clean top to bottom — no leftover notes, no
   sample text, no broken markdown.

A story that fails a check is fixed or dropped. A bulletin that cannot
pass the gate is not published; log why.
