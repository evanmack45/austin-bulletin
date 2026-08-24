# Making The Austin Bulletin feel alive — content plan

Date: 2026-08-23, late. Author: Claude, for Evan. Status: DRAFT for Evan.
Reference: https://jouster.blog/ (The ATX Aggregator), studied edition
"Friday, August 21, 2026 – Pavement or Rail?".

## 1. Diagnosis

Our site is clean and dead because it has structure and no life. Five
paraphrased summaries and five one-liners cannot feel like a city. Jouster
is messy and alive because it has:

| Jouster has | We have | Gap |
|---|---|---|
| ~40 items a day across a dozen beats | 10 items | Volume. A city produces 40 things a day worth a line. |
| Other voices: TxDOT's post, KXAN's clip, a judge's quote, CNBC's explainer | One flat neutral voice | Nobody else ever speaks on our page. |
| A lead essay with a title and an angle ("Pavement or Rail?") tying 3 stories together | 5 unrelated summaries | No idea of the day. |
| Rituals: This Weekend, standings, countdowns, "Oh, poop." | Morning Note only | No person, no habit hooks. |
| Real artifacts: agency maps, county graphics, a PDF, an APD photo | Charts we draw, AI images | We invent visuals instead of showing the real ones. |
| Video (KXAN/CNBC YouTube) | None | The most alive medium is absent. |

Neutrality is not the problem. Jouster's lead is not partisan; it has a point
of view about *what matters today*. We can do that inside our rules.

## 2. What to borrow, and the clean version of each

### A. The Big Story (lead)
One 500–700-word piece each day that connects 2–4 related items into one
idea, with its own title. Explains and connects; never endorses. Rule:
"It explains why these belong together and what happens next. It does not
say what should happen." Carries the day's best real artifact (agency map,
official graphic, video) as its hero.

### B. The River
25–40 short items grouped by beat, in a fixed order: Roads & transit ·
Police & courts · City Hall & county · Schools · Health · Business & tech ·
Texas · Sports · Weather. Each item: 1–2 sentences, a source tag, and where
it earns it, a Voice card or video. Dense typography, beat labels in small
caps oxblood, hairline rules. This is where volume lives.

### C. Voice cards (the "embedded social" look, done cleanly)
A house-styled card, not the platform's widget: platform glyph, account
name and handle, timestamp, the post text, its photo or graphic, and a
"View on X / Facebook / Bluesky" link. Same typography and rules as the
page, so twenty of them still read as one publication. Built from the
platform's oEmbed/JSON data at pipeline time; screenshot fallback when a
platform blocks. Sources allowed: official accounts (agencies, outlets,
elected officials, teams, universities) and public figures acting
publicly; never private individuals without consent; cap ~10 per day.
This is how the TxDOT drone photo, the Travis County "PROPOSED MAP"
graphic, and the APD suspect photo get onto our page legally: they are
the agencies' own posts.

### D. Video
Outlets' YouTube clips (KXAN, KVUE, CBS Austin, FOX 7, Texas Tribune,
CNBC) via the standard YouTube embed, lazy-loaded, in a ruled 16:9 frame
with a one-line caption. Cap 3 per day; the lead gets first pick. YouTube
channel RSS feeds make discovery free and reliable.

### E. Rituals (the character)
- **The Number** — one striking figure with a sentence (daily).
- **This Weekend in Austin** — Thursday/Friday: 8–12 things to do, with the
  organizers' own posts as cards.
- **Countdown** — one line: days until Texas football / ACL / first freeze
  / SXSW (whichever is next).
- **Standings** — in season: Longhorns, Austin FC, Rangers/Astros — a
  five-line table.
- **One Good Thing** — the closer, two sentences, Morning Note voice.
- **Sunday Paper** — Sunday: the week's five best long reads from
  outlets we trust, with a line on each.

### F. The Morning Note stays as the human opener; it now previews the Big
Story and the day's ritual ("There's a countdown at the bottom.").

## 3. Rules to add (EDITORIAL.md)
- The Big Story explains and connects; it does not advocate. Every claim
  links. Both sides' own words when a dispute exists.
- Voice cards: official accounts and public figures acting publicly only;
  never a private person without consent; the card is verbatim; no
  screenshots of private feeds.
- Video: embed only the outlet's own upload; never re-upload.
- Volume target: 25–40 river items. Missing is better than wrong still
  holds; but "we could not find 25" is a gather failure, logged.

## 4. Pipeline changes (PIPELINE.md)
- Gather widens: outlet RSS (have), YouTube channel RSS for the five
  outlets, agency newsrooms (City of Austin, Travis County, TxDOT Austin,
  APD, CapMetro, Austin Energy, LCRA, AISD, NWS Austin), Bluesky public
  API for accounts that post there, X/Facebook oEmbed for post URLs found
  via search, Reddit r/Austin top posts (as leads, not as cards).
- Select: the day's idea first (Big Story), then fill beats.
- Write: Big Story → River → rituals. Word caps per item.
- Illustrate: real artifacts first (agency post cards, video), then our
  graphics, then verified photos, AI last.
- Build: `scripts/card.mjs <post-url>` renders a Voice card (data + PNG
  of the post's image); `scripts/video.mjs` resolves a YouTube URL to the
  embed snippet.
- Gate adds: every card links to a live post; every video is the outlet's
  own; counts within caps.

## 5. Build order (each behind a screenshot round)
1. **Mockup** of one day in the new shape (tonight) — decide the look.
2. **Voice card + video components** in the templates and CSS; `card.mjs`
   with X, Facebook, Bluesky, YouTube support; screenshot fallback.
3. **River + beats** in the template; PIPELINE gather widened (YouTube RSS,
   agency newsrooms, Bluesky); volume target.
4. **Big Story** rule and format; Morning Note previews it.
5. **Rituals**: The Number, Countdown, One Good Thing (daily); This
   Weekend (Fri); Standings (in season); Sunday Paper.
6. Re-cut today's edition in the new shape as the first real example.

## 6. What stays
Broadsheet identity, the date plate, the glance strip with blurbs,
"What's next", neutral verbs, the corrections rule, five top stories
(they become the River's top of each beat, or fold into the Big Story).
