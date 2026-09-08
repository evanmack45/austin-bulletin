# Return-visit proxies (free, operator playbook)

Purpose: read credible, no-spend signals about reader return habits without adding any third‑party tracker, cookies, or paid analytics. Cloudflare Web Analytics (CFA) is already live and cookieless; by design, it cannot prove cross‑day returners.

## Why Cloudflare alone can’t prove returners
- CFA is cookieless and does not assign a durable, cross‑day visitor id.
- Without a per‑browser id, “unique visitor” ≠ “unique person,” and “returning visitor” cannot be measured directly.
- We accept this constraint; we will not add trackers, flip DNS to proxied, or buy analytics to work around it without explicit approval.

## Free proxies to review weekly in Cloudflare Web Analytics
- Visits (trend): rising/stable visits paired with stable impressions suggest habitual readership.
- Page views per visit: a reload/engagement proxy. Same‑day reloads (PV/Visit > 1.1 for a text site) indicate readers sticking around.
- Direct traffic share: higher “Direct” indicates bookmarking/typing the domain — a loyalty proxy.
- Top pages: the homepage (`/`) ranking consistently high is a homepage‑habit proxy.
- Owned channel: RSS (`/feed.xml`). Track feed loads as an opt‑in, durable behavior signal.

Operational cadence: read these weekly, not daily. Note patterns and material shifts; ignore vanity noise.

## Briefing Evan
- Brief only on material changes or when proposing paid changes. No daily vanity numbers.
- If a paid tool or integration seems warranted, write the ask, cost, and expected value; Evan must approve before any spend.

## First‑party, no‑beacon return signal (internal only)
- Pages now expose non‑PII visit‑day counts using `localStorage` and America/Chicago calendar days.
- Data attributes on `<html>`: `data-ab-visit-days="<n>"` and `data-ab-return="1"` when today is a new day with a prior distinct visit day.
- This is first‑party only; it does not send data anywhere. Future free tooling may read these attributes client‑side.

Money gate remains: no new paid analytics without Evan’s explicit OK.

