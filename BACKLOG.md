# Backlog, The Austin Bulletin

Ordered by expected readers gained per hour of work. Top item is next.
One line each: what, why, how it is measured. Reordered every Monday.
Any session may add a line. Evan may add or strike lines.

1. Baseline: pull 28 days of Cloudflare numbers once the token exists, save
   to `docs/metrics/`, set targets. Nothing below is measurable without it.
2. Page metadata: titles, descriptions and `NewsArticle` data are done for
   editions (2026-10-10); guide pages still need structured data. Measured by
   search impressions once Search Console exists.
3. Follow page and feed discovery: a visible `/follow/` page, feed links in
   the head of every page, full-content Atom. Measured by `/feed.xml`
   loads.
4. Cross-links to the tracker: every City Hall item links to its
   yallcityhall.org item page. Measured by referrals on the tracker.
5. Topic pages: one page per recurring subject (city budget, Zilker, the
   November election, a named council item) collecting every item across
   editions. Measured by search impressions per topic page.
6. Evergreen guides: one new or refreshed guide a week, each answering one
   question Austin residents search for. Vote 2026 and Zilker are the
   pattern. Measured by visits per guide.
6a. Vote 2026 guide: add the city's council candidate forum dates (first, District 1, said to be October 15; read the city page before publishing). Election queries dominate this month. Measured by guide visits.
7. December plan: council recess empties the City Hall beat. Plan
   explanatory and evergreen content for December by November 20.
8. Election week: neutrality pass on every edition October 26 to
   November 6 (critic routine).
9. Social posting scripts: when Bluesky and X credentials exist, post each
   edition with a link. Measured by referrals.
10. Heartbeat fallback: consider moving the daily pipeline to GitHub Actions
    as a backup if cloud routines miss two mornings in a month.

## Known defects (fix when touched)

- `scripts/card.mjs` cuts a post body at 400 characters with no ellipsis.
- `scripts/check.mjs` reads `alt` with `[^"']*`, so a raw apostrophe in
  alt text reads as missing alt.
- The Texas Tribune feed has returned the same twenty items since
  September 20. Treat as unavailable, find the current feed URL.
- `POLLEN_API_KEY` was missing on the Mac runner. Confirm it is present in
  the cloud environment on the first run.
