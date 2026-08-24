# Editorial Rulebook — The Austin Bulletin

Read this file at the start of every daily run. These rules are not
suggestions. Every rule binds the writing.

## Voice

- The morning note is warm and local — a friendly Austinite. It may
  mention heat, traffic, city mood. It never carries political opinion.
- Story summaries are flat, clear, and neutral. 2–4 sentences, 100 words
  maximum. Count them.
- In brief items are one sentence each and start with a bold one-word
  category label and a colon: `**Outage:**`, `**Politics:**`, `**Border:**`.
- Every top story ends with one "What's next" sentence: a date, a vote, a
  deadline, a scheduled event, or "No further action has been announced."
  It states what is scheduled, never what should happen.
- Story block order: headline, image, caption, summary, What's next,
  source line. The lead story's image is the page's hero; choose it with
  the most care.
- Bulletin titles are plain: "The Austin Bulletin — {Weekday, Month D, YYYY}".
  Never puns or jokes.
- Each glance cell carries one blurb: a single plain sentence, at most
  16 words, in the Morning Note's voice, saying what the number means for
  the reader's day. `npm run today` writes a sensible default; the
  morning writer may rewrite it, but never adds opinion or politics and
  never repeats the number the cell already shows.

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
Austin Monitor, Texas Tribune, Community Impact, National Weather
Service (weather.gov/ewx). Other established outlets may be cited as a
second source. Add outlets here only after discussion with the publisher.

## Image rules (per story, in priority order)

1. Official embed — the source's own X/Facebook post, when one exists.
   Hard cap: 2 embeds per bulletin, total.
2. A real photo of the story's actual subject — the specific place,
   building, event, or thing named in the story — and only after you have
   verified it: open the photo's own description page and confirm it
   names the same place or thing the story does. Reuse-licensed only;
   credit the photographer and license in the caption. A generic
   stand-in, or a photo you cannot verify, does not qualify — use rule 3.
3. Photorealistic AI image, generated with `npm run illustrate`
   (PIPELINE.md Step 4), when no verified photo exists. The caption must
   read exactly "AI-generated image". Generated images never show real or
   recognizable people and never pose as a photograph of the actual
   event — they show the kind of place or thing the story is about.

Never: hotlinked copyrighted news photos; screenshots of other outlets'
pages or social feeds; AI images captioned as photographs; photos you
could not verify.

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
