# KVUE access research — 2026-08-30, after midnight

Evan asked for alternatives to the unlinked one-sentence KVUE relay.
Every probe below used the Bulletin's honest UA
(`TheAustinBulletin/1.0 (+https://theaustinbulletin.com)`) and stayed
off the `/ajax/` API that KVUE's robots.txt disallows.

## What the probes established

1. **KVUE's robots.txt permits article pages.** For `user-agent: *` it
   disallows only `/ajax/`, `/search/` and monitor paths. The article
   403s are an Akamai/HUMAN bot-wall, not stated policy — so the
   2026-08-24 ethical line (don't engineer around stated policy)
   applies only to `/ajax/`, which stays off-limits.
2. **Readers are not blocked.** Evan's real Chrome loaded the East
   Riverside article completely — a "Powered and protected by"
   challenge auto-passed in ~4 seconds, then full text, byline (Adam
   Bennett), timestamps. The in-app automation browser was denied at
   the edge; our curl gets 403 on article and AMP routes. The wall
   stops machines, not people.
3. **The RSS feed is KVUE's own attestation.** Each item carries the
   exact article URL plus a two-sentence teaser. A URL's presence in
   KVUE's feed proves the article exists at that address.
4. **KVUE runs an official MSN channel** ("KVUE-TV Austin"), licensed
   syndication. MSN's content API
   (`assets.msn.com/content/view/v2/Detail/en-us/<id>`) returns full
   article JSON — title, body, sourceHref back to the station — with a
   plain 200 to our honest UA (verified end to end with a FOX 7 Austin
   example; the same TEGNA-market mechanism). msn.com's robots.txt does
   not disallow article paths; assets.msn.com serves no robots.txt at
   all. Remaining build step: enumerating the KVUE channel's story IDs
   (the channel page is shadow-DOM/JS; MSN's channel-feed endpoint
   needs pinning down). Not every KVUE story will syndicate, and there
   may be lag.
5. **KVUE's YouTube channel** answers 200 and is embeddable — video
   versions of some stories, usable with the existing `npm run video`
   machinery.
6. **Dead ends.** Sister TEGNA sites (wfaa.com) 403 identically — same
   wall. archive.today rate-limited on first contact (429) and ignores
   robots — not a foundation. AMP routes 403 like the articles.

## Options, ranked

1. **Re-link the relays (recommended now).** The no-link rationale is
   half-dissolved: readers get the page fine, robots permits it, and
   the feed proves the URL. Keep the relay THIN (we still can't read
   the body, so it still says nothing the teaser doesn't and keeps all
   the relay guardrails) but make the tag a normal linked `KVUE`.
   Gate: verify KVUE links by their presence in KVUE's own feed at
   check time (mirroring the existing KXAN-by-WordPress-API carve-out).
2. **MSN syndication for full stories (build when wanted).** Where a
   KVUE story appears on the MSN channel, read the licensed full text
   through the open content API, report it as a REAL item with
   quotes/facts verified, and link kvue.com for readers. Kills the
   relay's thinness for syndicated stories. One engineering step
   (channel-feed enumeration) plus a fallback to relay when a story
   isn't syndicated.
3. **YouTube embeds** as a supplement where the story is a video.
4. **Email KVUE for access** — declined 2026-08-24; unchanged, still
   the cleanest fix if ever reconsidered.

Decision: pending Evan's pick.
