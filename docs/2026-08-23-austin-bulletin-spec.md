# The Austin Bulletin — Specification

Date: 2026-08-23
Status: Approved design, ready for implementation planning.
Written in plain language on purpose. Short sentences. One idea per sentence.

## 1. What this project is

The Austin Bulletin is a daily news website for Austin and Texas. An AI produces it. A human (Evan) supervises it with light spot-checks. It publishes one bulletin every morning, seven days a week.

The goal: straight-forward reporting with no political leaning. Neutral. Factual. Clean. A personal experiment that can grow into a real audience and community service.

The reference site is jouster.blog ("The ATX Aggregator"). We keep its good ideas: one daily post, short story summaries, images, weather. We fix its problems: messy layout, too many embeds, obvious AI sloppiness, poor organization, joke titles.

## 2. Platform and architecture

- **Site type:** static site. Plain files. No database. No admin panel.
- **Generator:** Eleventy (11ty). It is simple, template-driven, and gives total design control. The implementation plan may swap it for a similar tool only if a concrete blocker appears.
- **Hosting:** GitHub repository + GitHub Pages. Free. Deploy happens automatically on git push via a GitHub Action.
- **Production engine:** Claude Code on Evan's computer, under his Claude Max subscription. No separate AI API costs.
- **Trigger:** a scheduled task starts Claude Code each morning around 6:00 AM Central. The computer must be on. Evan can also run the pipeline manually with one command at any time.
- **Domain:** Evan already owns hosting/domain arrangements. Not part of this project.

## 3. The daily bulletin — content structure

One post per day. Title format: "The Austin Bulletin — Sunday, August 23, 2026". No puns. Sections in this fixed order:

1. **Morning note.** 3–5 sentences written by the AI in the voice of a friendly local Austinite. Warmth and local color (heat, traffic, city mood). Personality, not opinion. Zero political slant.
2. **Top stories.** 6–8 stories about Austin and Texas. Each story has: a clear headline, a 2–4 sentence neutral summary, one image, and a "Source" line linking to the original outlet(s). Biggest stories first.
3. **Weather.** A compact block: today's forecast, any active alerts, and the next few days. Data from the National Weather Service.
4. **In brief** (optional). 3–5 one-line items with links, for smaller news. Omitted if there is nothing worth including.

Not in scope at launch: sports section, podcasts, videos, events, comments, newsletter, social posting, ads. These are candidates for phase two.

## 4. Site structure and design

Pages:

- **Home** — shows the newest bulletin in full. Readers land on today's news.
- **Archive** — a simple list of past bulletins by date.
- **About** — plain-language explanation of what the site is, how it is made (AI-produced, human-supervised), the neutrality rules, and the corrections policy. This is the one place that discloses the AI process; bulletins themselves carry no AI-disclosure footer.
- **Bulletin pages** — one permanent page per day (e.g. /2026/08/23/).

Design rules (these fix the reference site's failures):

- One column of text. No sidebars.
- Generous white space. Small color palette. Two fonts.
- One image per story. Never stacked screenshots.
- Social embeds (X/Facebook) allowed but capped at 2 per bulletin.
- Identical structure every day so readers learn the rhythm.
- Mobile-first. Fast loading. No heavy scripts.
- Clean typography and spacing that does not look machine-assembled.

## 5. Images

Per-story image selection follows a "mix" rule, in this priority order:

1. **Official embed** — when a source's own X/Facebook post exists for the story (counts toward the 2-embed cap).
2. **Free stock photo** — when the topic is generic (e.g. Texas Capitol for a state story). Only licenses that allow reuse.
3. **AI-generated image** — only for abstract topics (e.g. a budget vote). Always labeled as AI-generated in the caption.

Never: hotlinked copyrighted news photos, screenshots of other outlets' pages or social feeds.

## 6. Daily pipeline (the six steps)

Runs every morning via scheduled task; also runnable on demand.

1. **Gather.** Web-search the last 24 hours of Austin/Texas news from a fixed trusted-outlet list: KXAN, KVUE, CBS Austin, FOX 7, Austin American-Statesman, Austin Monitor, Texas Tribune, Community Impact, National Weather Service. The list lives in a config file and can grow.
2. **Select.** Choose 6–8 stories using the written rulebook (Section 7). Priority: impact on daily life in Austin.
3. **Write.** Draft morning note, summaries, weather block. Every fact must come from a source gathered that morning.
4. **Illustrate.** Pick one image per story using the Section 5 rules.
5. **Build & publish.** Write the bulletin file, build the site, push to GitHub. Live site updates automatically.
6. **Report.** Write a short daily log (published yes/no, story count, uncertainties flagged) and surface it to Evan as the spot-check signal.

Failure behavior: if any step fails, the site keeps yesterday's bulletin. The site never shows a broken or partial page. The failure is recorded in the log.

## 7. Neutrality and accuracy rulebook

The rules live in a written file in the repo. The AI reads it every run. Evan can edit it any time.

Neutrality:

- Report what happened and who said what. Never judge whether a policy is good or bad.
- Political stories present each side's own words, each with a link.
- Neutral verbs only: "said", not "claimed" / "admitted" / "slammed".
- No loaded labels for people or groups.
- The morning note may have warmth, never political opinion.
- Weekly balance check: the AI reviews the past week of bulletins so story selection does not lean one way over time.

Accuracy:

- Every fact traces to a source read that morning.
- Two independent sources for surprising or disputed claims.
- Numbers are quoted from sources, never calculated by the AI.
- If sources disagree, the bulletin says so.
- Social media posts are never the sole source for a story.
- Unverifiable story = omitted story.

Corrections:

- Errors are fixed with a visible note: "Correction: an earlier version said X. The correct fact is Y."
- Errors are never silently erased.
- The About page explains this policy.

## 8. Quality gate (pre-publish self-check)

Before pushing, the AI verifies:

- Every story has a working source link.
- Every summary matches what its source says.
- Date and title are correct.
- Every image loads and follows the image rules.
- No empty sections; page renders cleanly (build succeeds).
- Embed cap respected.

Any failed check: fix it or drop the story. Then publish.

## 9. Supervision and continuous improvement

- **Spot-checks:** Evan reads the daily log and the bulletin when he wants to. Corrections are requested in plain words ("story 3 is wrong — fix it") and produce a visible correction.
- **Feedback loop:** supervision is not corrections-only. Evan chats with Claude Code about anything — design choices, tone, story selection, new ideas. Accepted feedback is written into the persistent project files (rulebook, style guide, templates) so every future bulletin reflects it. The site continuously improves through these conversations.
- **Memory:** the repo carries a project instructions file (CLAUDE.md) holding voice, design decisions, and standing feedback, so every session — scheduled or conversational — starts with full context. All changes are tracked in git.

## 10. Success criteria ("running well")

- Publishes 7 days a week with no missed days.
- Zero uncorrected factual errors.
- A reader cannot infer a political leaning from a month of bulletins.
- Fast load and clean look on a phone.
- When these hold for about a month, phase two (new sections, possibly a newsletter) can begin.

## 11. Out of scope (phase two candidates)

Comments, email newsletter, sports/podcasts/events sections, social media distribution, monetization, analytics dashboards. None at launch.
