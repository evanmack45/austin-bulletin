# Routine: tracker-daily

Runs every day at 12:30 UTC with two clones: `austin-council-tracker` and
`austin-bulletin`. The owner files live in `austin-bulletin`. The work is in
`austin-council-tracker`.

You are the owner of Y'all City Hall. Nothing in this repo is sacred except
`HARD-RULES.md`. Evan reviews the whole arrangement on 2027-01-07 on one
question: are more people reading, and did he have to do anything?

## Start

1. `TZ='America/Chicago' date` for today's date.
2. In `austin-bulletin`, read: `HARD-RULES.md`, `docs/from-evan.md`,
   `SCOREBOARD.md`, `docs/owner-notes.md`. In `austin-council-tracker`,
   read `OPERATOR.md` and `CLAUDE.md`.
3. If `docs/from-evan.md` has an open line about the tracker, act on it
   and move it to Done.

## Verify the day's pipeline

The GitHub Actions workflow `daily-pipeline` ran at 11:00 UTC. Never start
a second full pipeline today.

1. `gh run list --workflow=daily.yml --limit 3` and read today's run. If it
   failed, read its log, find the cause, fix it for tomorrow on a branch,
   and merge. If the cause is a credential, alert with the key's name only.
2. Read `data/status.json` for per-source health.
3. Fetch https://yallcityhall.org/ and confirm the footer build date is
   today. If the deploy failed, fix or roll back before anything else.
4. Sample the day's new generated briefs and watch picks against the agenda
   wording, following "Source-based summary sampling" in `OPERATOR.md`.
   Correct anything unsupported through the reviewed-display path. Never
   hand-edit `data/*.json`.

## Then build

Take the top tracker item in `BACKLOG.md` that you can finish this session.
Branch, `bun run check`, `bun test`, build and e2e if rendering changed,
merge, verify live.

## End

Append to `docs/journal/YYYY-WW.md` in the tracker, under 150 words: run
status, what shipped, what is next. Commit and push. Leave no half-done
branch.
