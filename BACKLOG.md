# Backlog, The Austin Bulletin

Ordered by expected readers gained per hour of work. Top item is next.
One line each: what, why, how it is measured. Reordered every Monday.
Any session may add a line. Evan may add or strike lines.

1. Council preview for every regular meeting, linked from the tracker's
   `/agenda/` and meeting page, plus a "what passed" follow-up the morning
   after. Next: the October 22 recap on October 23. Measured by visits per
   preview.
2. Archive and About (critic 2026-42 findings 5, 11, 17): done
   2026-10-20. Measured by archive visits that click through to an edition.
3. Topic pages: one page per recurring subject. Done: AISD (refreshed
   2026-10-16), bonds, budget, charter Props C–J, Council races, Muny.
   Keep them current: Muny after the October 21 and 27 briefings and the
   November 19 vote; AISD when a petition count is published; races when
   the runoff date posts. Measured by visits and search impressions per
   topic page.
4. December plan: Council recess empties the City Hall beat. Plan
   explanatory and evergreen content for December by November 20.
5. Evergreen guides: one new or refreshed guide a week, each answering one
   question Austin residents search for. Vote 2026 is the pattern; refresh
   it when the County changes a site. Turnout on `/vote-2026/` now comes
   from the County Clerk's daily totals PDF (votetravis.gov current-election
   page, `G26-Daily-Totals-MMDDYYYY.pdf`); refresh it each day through
   October 30. Measured by visits per guide.
6. Election week: neutrality pass on every edition October 26 to
   November 6 (critic routine).
7. Cross-links to the tracker: every City Hall item links to its
   yallcityhall.org item page. Measured by referrals on the tracker.
8. Guide and topic-page structured data (editions done 2026-10-10).
   Measured by search impressions once Search Console exists.
9. Baseline: pull 28 days of Cloudflare numbers once the token exists, save
   to `docs/metrics/`, set targets. Blocked on Evan; done the first Monday
   the token exists.
10. Social posting scripts: when Bluesky and X publication credentials
    exist, post each edition with a link. Blocked on Evan. Measured by
    referrals.
11. Mail list: the signup posts to Kit's public form
    (`https://app.kit.com/forms/10083630/subscriptions`, field
    `email_address`, double opt-in). `NEWSLETTER_ENDPOINT` still overrides
    that URL. Measured by confirmed addresses.
12. `/follow/` page: feed links and the About "Follow" section already
    exist (2026-10-11). A dedicated page waits for social accounts.
13. Heartbeat fallback: consider moving the daily pipeline to GitHub Actions
    as a backup if cloud routines miss two mornings in a month.

## Known defects (fix when touched)

- `scripts/card.mjs` cuts a post body at 400 characters with no ellipsis.
- `scripts/check.mjs` reads `alt` with `[^"']*`, so a raw apostrophe in
  alt text reads as missing alt.
- `npm run voices` ran twice on 2026-10-12 and billed X twice. Guard
  against a second same-day run.
