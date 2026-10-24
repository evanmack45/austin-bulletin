---
layout: layout.njk
title: "About"
permalink: "/about/"
---

# About The Austin Bulletin

The Austin Bulletin publishes one news bulletin each morning, seven days
a week. It covers Austin and Texas. It reports facts, not opinions. When a
morning's edition does not run, as on October 7–9, 2026, the
[archive](/archive/) marks the missing days.

<h2 id="trust">Trust & how we work</h2>

- <strong>What the model does</strong>: An AI system reads that morning’s news from
  established local outlets and primary sources, selects items that matter to daily
  life in Austin, and writes short, neutral summaries with links back to the
  reporting. It never calculates new figures or invents quotes; numbers are quoted
  from sources, and every fact traces to something we read that morning.
- <strong>Who is responsible</strong>: The publisher, Evan McMillan, is responsible for the site
  and oversees the system. He does not review each edition before it publishes. The
  pre‑publish gate checks links,
  sourcing, item lengths and counts, initialisms, visuals, and that the page reads
  clean top to bottom. If a check fails, we fix it or cut the item; an edition that
  cannot pass is not published.
- <strong>How we gather</strong>: We identify ourselves honestly on fetches
  (<code class="crawler-user-agent">TheAustinBulletin/1.0 (+https://theaustinbulletin.com)</code>), read an outlet’s
  <code>robots.txt</code> before adding a path, and don’t engineer around a site’s stated policy.
  KVUE stories are read through their official MSN syndication when available; otherwise
  we cite another readable source or, as a last resort, run a clearly labeled one‑sentence
  relay that says only what the teaser says.
- <strong>Neutrality & accuracy</strong>: We report what happened and who said what. Political
  stories present each side’s own words with links. If sources disagree, we say so.
  Surprising claims need two sources; a trusted outlet’s single‑sourced report may run
  only when the sourcing is stated in the item’s prose.
- <strong>Corrections</strong>: When we get something wrong, we fix it with a visible note in the
  bulletin (see “Corrections” below). We never silently erase an error.
- <strong>Full policy</strong>: The complete rules are public:
  <br>• <a href="https://github.com/evanmack45/austin-bulletin/blob/main/EDITORIAL.md">Editorial Rulebook</a>: voice, neutrality, accuracy, images and corrections
  <br>• <a href="https://github.com/evanmack45/austin-bulletin/blob/main/PIPELINE.md">Daily procedure</a>: how each morning's edition is gathered, written, checked and published

## How this site is made

An AI system produces this site. It reads the day's news from established
local outlets, selects the stories that matter most to daily life in
Austin, and writes short, neutral summaries with links to the original
reporting. Evan McMillan, the publisher, supervises the system, reviews its output,
and is responsible for the site.

## Our rules

- We report what happened and who said what. We do not say whether a
  policy is good or bad.
- Political stories present each side's own words, with links.
- Every fact comes from a source we read that morning, linked in the story.
- Numbers are quoted from sources, never calculated by us.
- If sources disagree, we say so.
- If we cannot verify a story, we leave it out.

### How we decide what leads

Each beat carries a few longer items with headlines, and a run of one-sentence
briefs. An item earns a headline if it meets any of these tests:

- Someone was killed or seriously hurt.
- Money or a rule that binds residents changed — a vote taken, a price set, a
  contract signed, a ban enacted.
- Something closes, opens, or changes today or this week.
- A decision is scheduled, with a date.

At most two per beat. If nothing in a beat meets the test, nothing in that beat
gets a headline. You can check any morning's bulletin against this list.

## Corrections

When we get something wrong, we fix it with a visible note in the
bulletin: "Correction: an earlier version said X. The correct fact is Y."
We never silently erase errors.

## Contact

Feedback and corrections are welcome. Email Evan McMillan, the publisher, at
<contact@theaustinbulletin.com>.

## Council records

For Austin City Council agendas, votes and source records, visit
[Y’all, City Hall](https://yallcityhall.org/).

## Follow

Subscribe by RSS: add <https://theaustinbulletin.com/feed.xml> to any feed
reader and each morning's bulletin will arrive on its own.

{% if newsletter.configured %}
The front page and the end of each edition also take an email address for
that same morning edition.
{% else %}
The front page and the end of each edition also show an email form.
Mail delivery is not connected yet, so an address entered there is not
saved. RSS is the follow path that works today.
{% endif %}
