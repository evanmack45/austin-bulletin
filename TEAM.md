# Team

The site says what matters in Austin today.

## Who

- Bodkin, Publisher, is the sole committer.
- Marrow, Copy Chief, writes drafts.
- Thimble, Audience Builder, runs social and email.

## Rules

- Every claim links a source that resolves.
- No endorsements of candidates or ballot measures.
- Corrections are logged at /corrections.
- No more than one template or layout change per day.
- Never touch DNS, domains, or the registrar.

## Live check
`npm run live-check` checks both sites after a deploy (HTTP 200, today's America/Chicago date, a parsed feed; Bulletin also checks the Kit embed).
`--site bulletin|ych` runs one site. `--date YYYY-MM-DD` overrides the date. Not a CI check.
