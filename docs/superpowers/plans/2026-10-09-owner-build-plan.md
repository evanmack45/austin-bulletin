# Build plan: Claude as owner-operator

Spec: `docs/superpowers/specs/2026-10-09-claude-operator-design.md`.
Date: 2026-10-09. Evan approved full autonomy for this build.

Done means: every task below is complete, each check passed, and an
adversarial review found no blocking defect.

## Task 1. Owner documents in the Bulletin repo

Create or rewrite these files on `main`:

- `HARD-RULES.md`: the eight hard rules. Read-only to the owner.
- `OPERATOR.md`: the owner procedure. Replaces Dot's text in full.
- `BACKLOG.md`: ordered bets, one line each: what, why, metric.
- `SCOREBOARD.md`: numbers, trend, target, open bets. Seeded with
  "no baseline yet".
- `docs/owner-notes.md`: the owner's own memory, seeded with the starting
  thesis from the spec.
- `docs/spend.md`: every paid service, rate, projection.
- `docs/from-evan.md`: Evan's channel back. Seeded empty with instructions.
- `docs/routines/*.md`: one file per routine, the full prompt body. The
  cloud routine's prompt says "read this file and follow it."
- `docs/history/standing-decisions-2026-08.md`: the standing decisions moved
  out of `CLAUDE.md`.
- `CLAUDE.md`: technical guide only, plus pointers to `OPERATOR.md` and
  `HARD-RULES.md`. The "Current operator" block and standing decisions are
  removed.
- `PIPELINE.md` and `EDITORIAL.md`: the "Current operator" block and every
  reference to Codex, Dot, or "the parent" removed. Content rules unchanged.

Check: `npm run build && npm run lint && npm test` pass. `grep -ri "codex\|parent" *.md docs/routines` returns nothing.

## Task 2. Owner documents in the tracker repo

- `HARD-RULES.md`: identical to the Bulletin copy.
- `OPERATOR.md`: the tracker's owner procedure. Replaces Dot's text.
- `BACKLOG.md`: seeded.
- `CHARTER.md`: deleted.
- `CLAUDE.md`: "Site operation" section rewritten to point at
  `OPERATOR.md`. No Codex, Hermes, or parent references.
- `docs/journal/README.md`: names the owner, not "yall".
- `docs/operator-plan.md`: kept, points at the spec.

Check: `bun run check && bun test` pass. `grep -ril "codex\|hermes\|parent" *.md docs/journal/README.md` returns nothing.

## Task 3. Heartbeat outside Claude

`.github/workflows/heartbeat.yml` in the Bulletin repo. Runs at 14:30 UTC
daily (9:30 a.m. Central in summer) and on manual dispatch. It fetches both
live sites. The Bulletin must answer 200 and contain today's date in
Central time, or the previous day's before 13:00 UTC. The tracker must
answer 200 and its footer build date must be within two days. Any miss
fails the job. A failed scheduled workflow sends Evan a GitHub notification.

Check: dispatch the workflow by hand and read its log. Then dispatch it
with a deliberate bad URL through an input, confirm it fails, and restore.

## Task 4. Alert path

`scripts/alert.mjs` in the Bulletin repo and `scripts/alert.ts` in the
tracker: open a GitHub issue titled `ALERT: <reason>` with the `alert`
label, using the `gh` CLI, and append an `ALERT` line to the day's log or
journal. If an open issue with the same title exists, comment on it
instead. Routines call this. Evan gets the GitHub notification.

Check: run it once with a test reason, confirm the issue exists, close it.

## Task 5. Five cloud routines

Create with `RemoteTrigger`, environment `env_01DhnuLgA3G72Zm18AVxJDHh`,
model `claude-opus-5-5`, tools: Bash, Read, Write, Edit, Glob, Grep,
WebSearch, WebFetch, ToolSearch, TodoWrite, Skill, PushNotification.

| Name | Cron (UTC) | Sources | Prompt file |
|---|---|---|---|
| bulletin-daily | 0 11 * * * | austin-bulletin | docs/routines/bulletin-daily.md |
| tracker-daily | 30 12 * * * | austin-council-tracker | docs/routines/tracker-daily.md (in the Bulletin repo, so the routine clones both) |
| owner-afternoon | 0 20 * * * | both | docs/routines/owner-afternoon.md |
| owner-weekly | 0 15 * * 1 | both | docs/routines/owner-weekly.md |
| critic-weekly | 0 16 * * 4 | both | docs/routines/critic-weekly.md |

The old `austin-bulletin-daily` routine stays disabled.

Check: `RemoteTrigger get` on each shows enabled, the right cron, the right
sources. Run `owner-afternoon` once by hand and read its run log. It must
read the scoreboard, do work, and push a log entry.

## Task 6. Memory and index

Update the memory store: Dot is retired, Claude is the owner as of
2026-10-09, the spec path, the five routine names and ids, the alert path.

## Task 7. Adversarial review

Dispatch a review agent with the spec, the plan, and both repos. Budget
ten tool calls. It returns a table: finding, file, severity (blocking,
major, minor), evidence. Fix every blocking and major finding. Re-run the
checks from tasks 1 to 5 after fixes.

## Task 8. Report to Evan

One message: what runs when, where the files are, what he does once (the
account steps), and the first morning's expected outcome.
