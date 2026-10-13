# Backlog, The Austin Bulletin

Ordered by expected readers gained per hour of work. Top item is next.
One line each: what, why, how it is measured. Reordered every Monday.
Any session may add a line. Evan may add or strike lines.

1. Council preview for every regular meeting, linked from the tracker's
   `/agenda/` and meeting page, plus a "what passed" follow-up the morning
   after. The City's own meeting pages reach search late; ours can be the
   first answer. Measured by visits per preview.
2. Topic pages: one page per recurring subject collecting every item across
   editions. AISD is done (2026-10-12; refresh after October 15). The November
   bonds are done (2026-10-13, `/austin-bonds-2026/`). The city budget is done
   (2026-10-13, `/austin-city-budget-2027/`). Next: charter Propositions C–J. Measured by visits and
   search impressions per topic page.
3. Evergreen guides: one new or refreshed guide a week, each answering one
   question Austin residents search for. Vote 2026 and Zilker are the
   pattern; Vote 2026 got sites, hours and the ballot 2026-10-12; refresh
   it when the County changes a site. Measured by visits per guide.
4. Cross-links to the tracker: every City Hall item links to its
   yallcityhall.org item page. Measured by referrals on the tracker.
5. Guide and topic-page structured data (editions done 2026-10-10).
   Measured by search impressions once Search Console exists.
6. December plan: council recess empties the City Hall beat. Plan
   explanatory and evergreen content for December by November 20.
7. Election week: neutrality pass on every edition October 26 to
   November 6 (critic routine).
8. Baseline: pull 28 days of Cloudflare numbers once the token exists, save
   to `docs/metrics/`, set targets. Blocked on Evan; done the first Monday
   the token exists.
9. Social posting scripts: when Bluesky and X publication credentials
   exist, post each edition with a link. Blocked on Evan. Measured by
   referrals.
10. `/follow/` page: feed links and the About "Follow" section already
    exist (2026-10-11). A dedicated page waits for social accounts.
11. Heartbeat fallback: consider moving the daily pipeline to GitHub Actions
    as a backup if cloud routines miss two mornings in a month.

## Known defects (fix when touched)

- `scripts/card.mjs` cuts a post body at 400 characters with no ellipsis.
- `scripts/check.mjs` reads `alt` with `[^"']*`, so a raw apostrophe in
  alt text reads as missing alt.
- `npm run voices` ran twice on 2026-10-12 and billed X twice. Guard
  against a second same-day run.
- YouTube oEmbed answered 200 on 2026-10-10; PIPELINE.md's 2026-09-23
  outage note may be stale. Confirm on the next `npm run video` and update it.
