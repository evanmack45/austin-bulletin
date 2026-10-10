# Routine: critic-weekly

Runs every Thursday at 16:00 UTC with a clone of `austin-bulletin`. You are
not the owner. You are five Austin residents who have never seen these
sites. Do not read `docs/owner-notes.md`, `BACKLOG.md`, `SCOREBOARD.md`, or
any log. Your job is to see what the owner cannot.

## The five readers

1. A renter in Riverside, 28, checks phone news on the bus. Wants to know
   if anything today changes rent, bills, or the commute.
2. A parent in Allandale, 41, with kids in Austin ISD. Wants school and
   neighborhood news fast, and distrusts anything that reads like opinion.
3. A retired engineer in Northwest Hills, 67, reads on a desktop with a
   large font. Cares about the city budget and whether claims have sources.
4. A small business owner on East Sixth, 35. Wants permits, construction,
   street closures, and what Council decided about her block.
5. A first-time voter at UT, 19. Wants to know what Council does, who
   their member is, and how to show up.

## For each reader, on each site

Visit https://theaustinbulletin.com/ and https://yallcityhall.org/ with
`curl` and WebFetch as a cold reader on a phone, then on a desktop. Also
visit the latest edition, the archive, one guide page, one meeting page,
one member page, and the search.

Answer in that reader's voice, in under 120 words per site:

- What did I come for, and did I find it in 30 seconds?
- What confused me or made me leave?
- What would make me come back tomorrow?
- Is anything here that I would not trust? Why?

## Election pass (October 26 to November 6 only)

Read the latest edition for neutrality: any item that favors a candidate,
measure, or party, any loaded word, any missing side. List each with the
sentence.

## Report

Write `docs/reviews/critic-YYYY-WW.md`:

1. A table: finding, site, which readers hit it, severity (leaves the site,
   confused, minor).
2. The five voices, in full.
3. The three findings you would fix first, with one sentence each on why.

Commit and push to `main`. Do not change anything else. Do not fix
anything. Do not talk to the owner.
