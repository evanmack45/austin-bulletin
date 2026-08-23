# The Austin Bulletin — Implementation Plan

> **For executors:** Steps use checkbox (`- [ ]`) syntax for tracking. Work through tasks top to bottom. Don't skip verification steps. If a step's exact content doesn't make sense in context, stop and ask rather than improvising.

**Work type:** Mixed (code + non-code)

**Goal:** Build a fully AI-produced daily news site for Austin/Texas — one clean, neutral bulletin published every morning by Claude Code to a free static site.

**Approach:** Eleventy static site in a git repo, deployed to GitHub Pages by a GitHub Action on every push. Claude Code produces one markdown bulletin file per day by following a written pipeline procedure and editorial rulebook stored in the repo, then commits and pushes. A scheduled job triggers the run each morning.

**Tools / Tech / Materials:** Node.js ≥ 18, Eleventy 3.x (Nunjucks templates), git + GitHub account, GitHub Pages, Claude Code (Max subscription). Spec: `2026-08-23-austin-bulletin-spec.md` (same folder as this plan — keep them together).

**Repo layout (target):**

```
austin-bulletin/
├── CLAUDE.md                      # project memory for Claude Code
├── EDITORIAL.md                   # neutrality & accuracy rulebook
├── PIPELINE.md                    # six-step daily procedure
├── .claude/commands/daily-bulletin.md
├── package.json
├── eleventy.config.js
├── .gitignore
├── .github/workflows/deploy.yml
├── logs/                          # one run log per day
└── src/
    ├── _includes/layout.njk       # base page shell
    ├── _includes/bulletin.njk     # bulletin page layout
    ├── css/style.css
    ├── index.njk                  # home = newest bulletin
    ├── archive.njk
    ├── about.md
    └── bulletins/                 # one .md file per day
```

---

### Task 1: Initialize the project

**Files:**
- Create: `austin-bulletin/package.json`
- Create: `austin-bulletin/.gitignore`

- [ ] **Step 1: Create the project folder and git repo**

```bash
mkdir austin-bulletin && cd austin-bulletin
git init -b main
mkdir -p src/_includes src/css src/bulletins logs .claude/commands .github/workflows
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "austin-bulletin",
  "version": "1.0.0",
  "private": true,
  "description": "The Austin Bulletin — a daily AI-produced news bulletin for Austin and Texas.",
  "scripts": {
    "build": "eleventy",
    "serve": "eleventy --serve"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0"
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
_site/
.DS_Store
```

- [ ] **Step 4: Install and verify**

Run: `npm install`
Expected: installs with no errors; `node_modules/` exists.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore package-lock.json
git commit -m "chore: initialize Austin Bulletin project"
```

---

### Task 2: Eleventy config, base layout, and stylesheet

**Files:**
- Create: `eleventy.config.js`
- Create: `src/_includes/layout.njk`
- Create: `src/css/style.css`

- [ ] **Step 1: Create `eleventy.config.js`**

```js
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");

  eleventyConfig.addCollection("bulletins", (api) =>
    api.getFilteredByGlob("src/bulletins/**/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addFilter("readableDate", (d) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    })
  );

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
```

- [ ] **Step 2: Create `src/_includes/layout.njk`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title }} · The Austin Bulletin</title>
  <meta name="description" content="A daily, neutral news bulletin for Austin and Texas.">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <header class="site-header">
    <a class="wordmark" href="/">The Austin Bulletin</a>
    <nav>
      <a href="/archive/">Archive</a>
      <a href="/about/">About</a>
    </nav>
  </header>
  <main>
    {{ content | safe }}
  </main>
  <footer class="site-footer">
    <p>© The Austin Bulletin · <a href="/about/">About this site</a></p>
  </footer>
</body>
</html>
```

- [ ] **Step 3: Create `src/css/style.css`**

Design rules from the spec: one column, no sidebars, generous white space, two fonts, small palette, mobile-first, fast.

```css
:root {
  --ink: #1a1a1a;
  --muted: #6b6b6b;
  --accent: #7a1f1f;
  --rule: #e4e0d8;
  --bg: #faf9f6;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 1.05rem;
  line-height: 1.7;
}
main { max-width: 42rem; margin: 0 auto; padding: 1.5rem 1.25rem 4rem; }
h1, h2, h3, .wordmark { font-family: Georgia, "Times New Roman", serif; line-height: 1.25; }
h1 { font-size: 1.9rem; margin: 1rem 0 0.25rem; }
h2 { font-size: 1.35rem; margin-top: 2.5rem; border-bottom: 2px solid var(--rule); padding-bottom: 0.3rem; }
h3 { font-size: 1.15rem; margin: 2rem 0 0.4rem; }
a { color: var(--accent); }
img { max-width: 100%; height: auto; border-radius: 4px; }
.site-header {
  max-width: 42rem; margin: 0 auto; padding: 1.25rem;
  display: flex; justify-content: space-between; align-items: baseline;
  border-bottom: 3px double var(--rule);
}
.wordmark { font-size: 1.3rem; font-weight: bold; color: var(--ink); text-decoration: none; }
.site-header nav a { margin-left: 1rem; color: var(--muted); text-decoration: none; }
.bulletin-date { color: var(--muted); font-size: 0.95rem; margin-bottom: 2rem; }
.morning-note {
  font-family: Georgia, serif; font-style: italic; font-size: 1.1rem;
  border-left: 3px solid var(--accent); padding-left: 1rem; margin: 1.5rem 0 2rem;
}
.source-line { font-size: 0.9rem; color: var(--muted); }
.correction { background: #fdf3e7; border: 1px solid #e8c9a0; padding: 0.75rem 1rem; border-radius: 4px; }
figcaption { font-size: 0.85rem; color: var(--muted); }
.site-footer {
  max-width: 42rem; margin: 0 auto; padding: 1.25rem;
  border-top: 1px solid var(--rule); color: var(--muted); font-size: 0.9rem;
}
.archive-list { list-style: none; padding: 0; }
.archive-list li { padding: 0.5rem 0; border-bottom: 1px solid var(--rule); }
```

- [ ] **Step 4: Verify the build runs**

Run: `npm run build`
Expected: build completes with 0 errors (0 or few files written — no pages exist yet; that is fine).

- [ ] **Step 5: Commit**

```bash
git add eleventy.config.js src/_includes/layout.njk src/css/style.css
git commit -m "feat: Eleventy config, base layout, stylesheet"
```

---

### Task 3: Bulletin layout and a sample bulletin

**Files:**
- Create: `src/_includes/bulletin.njk`
- Create: `src/bulletins/2026-08-23.md` (sample fixture; replaced by the first real run)

- [ ] **Step 1: Create `src/_includes/bulletin.njk`**

```html
---
layout: layout.njk
---
<article class="bulletin">
  <h1>{{ title }}</h1>
  <p class="bulletin-date">{{ page.date | readableDate }}</p>
  {{ content | safe }}
</article>
```

- [ ] **Step 2: Create the sample bulletin `src/bulletins/2026-08-23.md`**

This file defines the exact daily format. Every real bulletin copies this structure.

```markdown
---
layout: bulletin.njk
title: "The Austin Bulletin — Sunday, August 23, 2026"
date: 2026-08-23
permalink: "/2026/08/23/"
---

<p class="morning-note">SAMPLE — Good morning, Austin. Another triple-digit
scorcher is on the way, so get your errands done early. Here's what the
city is talking about today.</p>

## Top stories

### Sample headline for the biggest story of the day

Two to four sentences of neutral summary go here. Facts only, from the
sources linked below. No opinion words.

![Descriptive alt text](https://example.com/sample.jpg)
<figcaption>Photo: source name (sample)</figcaption>

<p class="source-line">Source: <a href="https://example.com">Outlet Name</a></p>

### Second sample headline

Another short neutral summary.

<p class="source-line">Source: <a href="https://example.com">Outlet Name</a></p>

## Weather

Today: sample forecast line. Alerts: none. Next few days: sample outlook.

<p class="source-line">Source: <a href="https://www.weather.gov/ewx/">National Weather Service Austin/San Antonio</a></p>

## In brief

- One-line sample item. <a href="https://example.com">Outlet</a>
- Another one-line sample item. <a href="https://example.com">Outlet</a>
```

- [ ] **Step 3: Create the home page `src/index.njk`**

Home shows the newest bulletin in full.

```html
---
layout: layout.njk
title: "Today"
permalink: "/"
---
{% set latest = collections.bulletins | first %}
<article class="bulletin">
  <h1>{{ latest.data.title }}</h1>
  <p class="bulletin-date">{{ latest.date | readableDate }} · <a href="{{ latest.url }}">Permanent link</a></p>
  {{ latest.templateContent | safe }}
</article>
```

- [ ] **Step 4: Build and verify**

Run: `npm run build && ls _site`
Expected: build succeeds; `_site/index.html` and `_site/2026/08/23/index.html` both exist and contain the sample headline.

- [ ] **Step 5: Visual check**

Run: `npm run serve` and open `http://localhost:8080`.
Verify: one column; morning note styled italic with a left accent bar; date under the title; no sidebars. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/_includes/bulletin.njk src/bulletins/2026-08-23.md src/index.njk
git commit -m "feat: bulletin layout, sample bulletin, home page"
```

---

### Task 4: Archive and About pages

**Files:**
- Create: `src/archive.njk`
- Create: `src/about.md`

- [ ] **Step 1: Create `src/archive.njk`**

```html
---
layout: layout.njk
title: "Archive"
permalink: "/archive/"
---
<h1>Archive</h1>
<ul class="archive-list">
{% for b in collections.bulletins %}
  <li><a href="{{ b.url }}">{{ b.data.title }}</a></li>
{% endfor %}
</ul>
```

- [ ] **Step 2: Create `src/about.md`**

```markdown
---
layout: layout.njk
title: "About"
permalink: "/about/"
---

# About The Austin Bulletin

The Austin Bulletin publishes one news bulletin every morning, seven days
a week. It covers Austin and Texas. It reports facts, not opinions.

## How this site is made

An AI system produces this site. It reads the day's news from established
local outlets, selects the stories that matter most to daily life in
Austin, and writes short, neutral summaries with links to the original
reporting. A human supervises the system, reviews its output, and is
responsible for the site.

## Our rules

- We report what happened and who said what. We do not say whether a
  policy is good or bad.
- Political stories present each side's own words, with links.
- Every fact comes from a source we read that morning, linked in the story.
- Numbers are quoted from sources, never calculated by us.
- If sources disagree, we say so.
- If we cannot verify a story, we leave it out.

## Corrections

When we get something wrong, we fix it with a visible note in the
bulletin: "Correction: an earlier version said X. The correct fact is Y."
We never silently erase errors.

## Contact

Feedback is welcome. Reach the publisher on the site's social accounts.
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: `_site/archive/index.html` lists the sample bulletin; `_site/about/index.html` renders the full about text.

- [ ] **Step 4: Commit**

```bash
git add src/archive.njk src/about.md
git commit -m "feat: archive and about pages"
```

---

### Task 5: GitHub repository and Pages deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Create the GitHub repo and push**

If the `gh` CLI is available:

```bash
gh repo create austin-bulletin --public --source=. --push
```

If not, stop and ask the user to create an empty GitHub repo named `austin-bulletin` and provide the remote URL, then:

```bash
git remote add origin <URL>
git add .github/workflows/deploy.yml
git commit -m "ci: GitHub Pages deploy workflow"
git push -u origin main
```

- [ ] **Step 3: Enable Pages**

Run: `gh api repos/{owner}/austin-bulletin/pages -X POST -f build_type=workflow` (or ask the user to set Settings → Pages → Source → "GitHub Actions" in the repo UI).
Expected: Pages enabled with the workflow as the source.

- [ ] **Step 4: Verify the live site**

Wait for the action to finish: `gh run watch`
Then fetch the Pages URL and confirm it returns the sample bulletin's headline.
Expected: HTTP 200; page shows "The Austin Bulletin — Sunday, August 23, 2026".

Note: a custom domain the user already owns can be pointed at Pages later; do not configure it in this plan.

- [ ] **Step 5: Checkpoint note**

Append to `logs/setup.md`: "Task 5 complete — site live on GitHub Pages at <URL>."

---

### Task 6: Editorial rulebook (non-code)

**Files:**
- Create: `EDITORIAL.md`
- Source: spec sections 5, 7, 8 (`2026-08-23-austin-bulletin-spec.md`)

- [ ] **Step 1: Write the verification criteria**

The file is done when it contains, verbatim in substance: the neutrality rules (6 items), accuracy rules (6 items), corrections policy, image rules with the 3-tier priority and 2-embed cap, and the pre-publish quality gate (6 checks) — all phrased as instructions to the AI writer.

- [ ] **Step 2: Create `EDITORIAL.md`**

```markdown
# Editorial Rulebook — The Austin Bulletin

Read this file at the start of every daily run. These rules are not
suggestions. Every rule binds the writing.

## Voice

- The morning note is warm and local — a friendly Austinite. It may
  mention heat, traffic, city mood. It never carries political opinion.
- Story summaries are flat, clear, and neutral. 2–4 sentences.
- Bulletin titles are plain: "The Austin Bulletin — {Weekday, Month D, YYYY}".
  Never puns or jokes.

## Neutrality rules

1. Report what happened and who said what. Never state whether a policy
   is good or bad.
2. Political stories present each side's own words, each with a link.
3. Use neutral verbs: "said" — never "claimed", "admitted", "slammed".
4. No loaded labels for people or groups.
5. The morning note may have personality, never political opinion.
6. Weekly balance check: every Sunday, re-read the past 7 bulletins and
   note in the log whether story selection leaned toward any side. Adjust
   the coming week if it did.

## Accuracy rules

1. Every fact traces to a source read this morning, linked in the story.
2. Two independent sources for surprising or disputed claims.
3. Quote numbers from sources. Never calculate or extrapolate them.
4. If sources disagree, the bulletin says so.
5. Social media posts are never the sole source for a story.
6. Unverifiable story = omitted story. Missing is better than wrong.

## Trusted outlets

KXAN, KVUE, CBS Austin, FOX 7 Austin, Austin American-Statesman,
Austin Monitor, Texas Tribune, Community Impact, National Weather
Service (weather.gov/ewx). Other established outlets may be cited as a
second source. Add outlets here only after discussion with the publisher.

## Image rules (per story, in priority order)

1. Official embed — the source's own X/Facebook post, when one exists.
   Hard cap: 2 embeds per bulletin, total.
2. Free stock photo — for generic topics (e.g., Texas Capitol for a
   state story). Reuse-licensed only. Credit in the caption.
3. AI-generated image — only for abstract topics (e.g., a budget vote).
   The caption must say "AI-generated illustration".

Never: hotlinked copyrighted news photos; screenshots of other outlets'
pages or social feeds.

## Corrections

Fix errors with a visible note inside the bulletin, wrapped in
`<p class="correction">`: "Correction: an earlier version said X. The
correct fact is Y." Never silently erase an error.

## Pre-publish quality gate

Do not push unless every check passes:

1. Every story has a working source link.
2. Every summary matches what its source actually says.
3. Date, title, and permalink are correct and consistent.
4. Every image follows the image rules; embed cap respected.
5. No empty sections; `npm run build` succeeds with no errors.
6. The full page reads clean top to bottom — no leftover notes, no
   sample text, no broken markdown.

A story that fails a check is fixed or dropped. A bulletin that cannot
pass the gate is not published; log why.
```

- [ ] **Step 3: Check the draft against the verification criteria**

Confirm all listed elements are present. Fix any gap inline.

- [ ] **Step 4: Commit**

```bash
git add EDITORIAL.md
git commit -m "docs: editorial rulebook"
```

---

### Task 7: Daily pipeline procedure and slash command (non-code)

**Files:**
- Create: `PIPELINE.md`
- Create: `.claude/commands/daily-bulletin.md`
- Source: spec section 6

- [ ] **Step 1: Write the verification criteria**

Done when: PIPELINE.md walks the six spec steps (gather, select, write, illustrate, build & publish, report) with concrete instructions and failure behavior; the slash command file simply invokes the procedure so a scheduled headless run and a chat run behave identically.

- [ ] **Step 2: Create `PIPELINE.md`**

```markdown
# Daily Pipeline — The Austin Bulletin

Run this procedure once each morning. Also runnable any time on demand.
Before starting, read `EDITORIAL.md` in full.

## Step 1 — Gather

Web-search the last 24 hours of Austin and Texas news from the trusted
outlets listed in EDITORIAL.md. Also fetch today's forecast and any
active alerts from weather.gov/ewx. Collect candidate stories with URLs.

## Step 2 — Select

Pick 6–8 stories. Priority: impact on daily life in Austin (safety,
schools, transportation, cost of living, weather, city government), then
major Texas news. Order by importance. Check recent bulletins in
`src/bulletins/` to avoid repeating a story with no new development.

## Step 3 — Write

Create `src/bulletins/YYYY-MM-DD.md` for today, copying the exact front
matter and section structure of the newest existing bulletin file:
morning note, "## Top stories" (### headline + summary + image + source
line per story), "## Weather", optional "## In brief" (3–5 one-line
items). Set `permalink: "/YYYY/MM/DD/"`. Every rule in EDITORIAL.md
applies to every sentence.

## Step 4 — Illustrate

One image per story, chosen by the image rules in EDITORIAL.md.

## Step 5 — Build & publish

Run `npm run build`. Then run the full pre-publish quality gate from
EDITORIAL.md. When every check passes:

    git add src/bulletins/ logs/
    git commit -m "bulletin: YYYY-MM-DD"
    git push

GitHub Pages deploys automatically.

## Step 6 — Report

Write `logs/YYYY-MM-DD.md` (before the commit in Step 5) containing:
published yes/no, story count, embeds used, images by type, any facts
you were unsure about, any stories dropped and why. On Sundays, add the
weekly balance check from EDITORIAL.md.

## Failure behavior

If any step fails (no internet, build error, gate failure): do not push.
The live site keeps yesterday's bulletin. Write the failure and its
cause to `logs/YYYY-MM-DD.md` and commit only the log if possible.
```

- [ ] **Step 3: Create `.claude/commands/daily-bulletin.md`**

```markdown
---
description: Produce and publish today's Austin Bulletin
---

Read EDITORIAL.md, then execute every step of PIPELINE.md for today's
date, in order. Do not skip the quality gate. Report the contents of
today's log file when finished.
```

- [ ] **Step 4: Check against the verification criteria, then commit**

```bash
git add PIPELINE.md .claude/commands/daily-bulletin.md
git commit -m "docs: daily pipeline procedure and command"
```

---

### Task 8: Project memory (CLAUDE.md) (non-code)

**Files:**
- Create: `CLAUDE.md`
- Source: spec sections 1, 9

- [ ] **Step 1: Write the verification criteria**

Done when: a fresh Claude Code session reading only this file knows what the project is, where the rules live, how to run the daily pipeline, and that user feedback must be persisted into the repo files — plus a dated "Standing decisions" list seeded with the launch decisions.

- [ ] **Step 2: Create `CLAUDE.md`**

```markdown
# The Austin Bulletin — Project Instructions

This repo is a daily AI-produced news site for Austin and Texas,
supervised by its publisher, Evan. One bulletin per day, every morning.
Neutral. Factual. Clean.

## Key files

- `EDITORIAL.md` — binding rules for voice, neutrality, accuracy,
  images, corrections, and the pre-publish quality gate.
- `PIPELINE.md` — the six-step daily procedure. `/daily-bulletin` runs it.
- `src/bulletins/` — one markdown file per day; the newest file is the
  format template for the next one.
- `logs/` — one run log per day; the publisher's spot-check signal.

## Working agreements

- Evan gives feedback conversationally: corrections, design opinions,
  tone notes, feature ideas. When feedback is accepted, WRITE IT DOWN —
  update EDITORIAL.md, the templates/CSS, or the Standing decisions list
  below in the same session. Feedback that lives only in a chat is lost.
- Never weaken the neutrality or accuracy rules without an explicit,
  confirmed request from Evan.
- Corrections to published bulletins are visible, never silent.
- Site changes beyond the daily bulletin (design, new sections) happen
  only when Evan asks; propose, don't surprise.

## Standing decisions

- 2026-08-23: Plain date titles, no puns. Morning note = warm local
  voice, zero politics. Top stories (6–8) + Weather + optional In brief.
  No sports/podcasts/newsletter/comments at launch. Max 2 embeds per
  bulletin. No AI-disclosure footer on bulletins; the About page carries
  the disclosure. Eleventy + GitHub Pages.
```

- [ ] **Step 3: Check against the verification criteria, then commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: project memory"
git push
```

- [ ] **Step 4: Checkpoint note**

Append to `logs/setup.md`: "Tasks 6–8 complete — rulebook, pipeline, memory in place."

---

### Task 9: First real bulletin (dry run of the whole pipeline)

**Files:**
- Create: `src/bulletins/<today>.md`
- Create: `logs/<today>.md`
- Delete: `src/bulletins/2026-08-23.md` (the sample) — only after the real bulletin passes the gate

- [ ] **Step 1: Run the pipeline**

Execute the `/daily-bulletin` command (i.e., follow PIPELINE.md end to end) for today's actual date, producing a real bulletin from real news.

- [ ] **Step 2: Verify against the quality gate**

Run every check in EDITORIAL.md's pre-publish gate explicitly and record each pass/fail in the log. All must pass.

- [ ] **Step 3: Remove the sample bulletin**

```bash
git rm src/bulletins/2026-08-23.md
```

(If today IS 2026-08-23, the real bulletin replaces the sample file directly.)

- [ ] **Step 4: Publish and verify live**

Commit, push, wait for the deploy action, then load the live home page.
Expected: today's real bulletin renders as the home page; archive lists it; permalink works.

- [ ] **Step 5: Checkpoint note**

Append to `logs/setup.md`: "Task 9 complete — first real bulletin live."

---

### Task 10: Schedule the morning run

**Files:**
- Create: none in-repo (scheduler configuration on the user's machine)

- [ ] **Step 1: Ask the user which scheduler to use**

Two options; the user picks:

- **Option A — Claude Code / Cowork scheduled task (preferred if available):** create a scheduled task that runs every day at 6:00 AM Central with the prompt: "Open the austin-bulletin repo and run /daily-bulletin."
- **Option B — macOS launchd:** a plist that runs headless Claude Code daily at 6:00 AM.

- [ ] **Step 2 (only if Option B): Create the launchd job**

Create `~/Library/LaunchAgents/com.austinbulletin.daily.plist` (replace `REPOPATH` with the absolute repo path and verify `claude` is on PATH via `which claude`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.austinbulletin.daily</string>
  <key>WorkingDirectory</key><string>REPOPATH</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>claude -p "/daily-bulletin" &gt;&gt; logs/scheduler.out 2&gt;&amp;1</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>6</integer><key>Minute</key><integer>0</integer></dict>
</dict>
</plist>
```

Load it: `launchctl load ~/Library/LaunchAgents/com.austinbulletin.daily.plist`

- [ ] **Step 3: Tell the user the operating constraints**

State plainly: the computer must be on and awake at 6:00 AM for the run to happen (System Settings → Energy → schedule wake, or leave it on). If a morning is missed, the site keeps yesterday's bulletin; running `/daily-bulletin` manually catches up.

- [ ] **Step 4: Verify the schedule fires**

Trigger a test run (Option A: run the scheduled task once now; Option B: `launchctl start com.austinbulletin.daily`). Expected: a new log entry appears in `logs/`, and — if the gate passes — a new bulletin publishes.

- [ ] **Step 5: Final checkpoint**

Append to `logs/setup.md`: "Task 10 complete — daily schedule active. Project launch done." Report the live URL and the schedule status to the user.

---

## Self-review record

- Spec coverage: platform/architecture → Tasks 1–5; bulletin structure → Task 3; site design → Tasks 2–4; images → Task 6 (EDITORIAL.md); pipeline → Task 7; rulebook → Task 6; quality gate → Tasks 6, 9; supervision/feedback loop → Task 8 (CLAUDE.md); success criteria → operational (Section 10 of spec; tracked via logs), scheduling → Task 10. About-page disclosure (spec §4) → Task 4. No-footer decision → recorded in CLAUDE.md Standing decisions.
- Placeholders: sample bulletin content is explicitly labeled SAMPLE and is a format fixture removed in Task 9 — intentional, not a placeholder.
- Cross-references: collection name `bulletins`, layout names, and file paths are consistent across Tasks 2, 3, 4, 7.
- Granularity: each step is a single 2–5 minute action.
