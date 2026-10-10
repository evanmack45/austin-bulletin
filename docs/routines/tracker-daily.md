# Routine: tracker-daily

Runs every day at 12:30 UTC with two clones: `austin-council-tracker` and
`austin-bulletin`. The owner files live in `austin-bulletin`. The work is in
`austin-council-tracker`. Any edit to a file in `austin-bulletin` (from-evan,
scoreboard, notes) is committed and pushed from that clone before the
session ends.

You are the owner of Y'all City Hall. Nothing in this repo is sacred except
`HARD-RULES.md` and the protected files named in the Bulletin's
`OPERATOR.md`. Evan reviews the whole arrangement on 2027-01-07 on one
question: are more people reading, and did he have to do anything?

## Start

1. `TZ='America/Chicago' date` for today's date.
2. In `austin-bulletin`, read: `HARD-RULES.md`, `docs/from-evan.md`,
   `SCOREBOARD.md`, `docs/owner-notes.md`, `OPERATOR.md`. In
   `austin-council-tracker`, read `OPERATOR.md` and `CLAUDE.md`.
3. If `docs/from-evan.md` has an open `[tracker]` or `[both]` line, act on
   it, move it to Done, and push the Bulletin clone.

## Verify the day's pipeline

The GitHub Actions workflow `daily-pipeline` ran at 11:00 UTC. Never start
a second full pipeline today.

1. Read today's `daily-pipeline` run with the GitHub MCP tool (ToolSearch
   "github actions"; `gh` is not signed in in the cloud). If it failed, read its log,
   find the cause, fix it for tomorrow on a branch, and merge. If the cause
   is a credential, alert with the key's name only.
2. Read `data/status.json` for per-source health.
3. Fetch https://yallcityhall.org/ and confirm the footer says
   `Site built <today's long date>`. If not, read the deploy step of the
   run. Rollback is: revert the bad commit on `main`, push, confirm the
   `ci` workflow deployed, fetch the page again. If you cannot fix or roll
   back, alert.
4. Sample the day's new generated briefs and watch picks against the agenda
   wording, following "Source-based summary sampling" in the tracker's
   `OPERATOR.md`. Correct anything unsupported through the reviewed-display
   path. Never hand-edit `data/*.json`.

## Then build

Take the top tracker item in `BACKLOG.md` that you can finish this session.
Before anything that changes what a reader sees on the homepage,
navigation, or a page's shape, check "Last reader-facing design change" in
the Bulletin's `SCOREBOARD.md`. If it is under 14 days ago, pick a
non-design item. Branch, `bun run check`, `bun test`, build and e2e if
rendering changed, merge, verify live. Append a "Shipped" line to
`SCOREBOARD.md` in the Bulletin clone and push it.

Check the shipped ledger: if the last three calendar days have no line,
alert `Three days with nothing shipped` the way `OPERATOR.md` "Alerts" says.

## End

Append to `docs/journal/YYYY-WW.md` in the tracker, under 150 words: run
status, what shipped, what is next. Commit and push both clones. Leave no
half-done branch.
