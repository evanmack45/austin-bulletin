// Every headed story in a bulletin, for the homepage list.
// The lead stays the briefing story. The rest follow edition order:
// Bulletin original, then News (and any beat sections), then Notices.
// A summary is the story's own first one or two sentences. The Sources
// line is the story's existing source element, not a new line.

import { parseReaderAction, readerActionMarkup } from "./reader-action.mjs";
import { openingSentences } from "./sentences.mjs";
import { slug } from "./river.mjs";
import { presentSourceHtml } from "./story-sources.mjs";

const BIG_OPEN = /\{%\s*bigstory\s*%\}/;
const BIG_CLOSE = /\{%\s*endbigstory\s*%\}/;
const RIVER_OPEN = /\{%\s*river\s*%\}/;
const RIVER_CLOSE = /\{%\s*endriver\s*%\}/;
const H2 = /^##\s+(.+?)\s*$/;
const H3 = /^###\s+(.+?)\s*$/;
const H4 = /^####\s+(.+?)\s*$/;
const H5 = /^#####\s+(.+?)\s*$/;
const SIGNUP_AFTER = 3;

function sectionLabel(heading, beat) {
  const name = heading.trim();
  if (/^notices$/i.test(name)) return "Notices";
  if (/^news$/i.test(name)) return "News";
  if (/^the briefing$/i.test(name)) return "Bulletin original";
  if (beat.trim()) return beat.trim();
  return name || "News";
}

function sectionRank(label) {
  const name = label.toLowerCase();
  if (name === "bulletin original" || name === "the briefing") return 0;
  if (name === "notices") return 2;
  return 1;
}

function uniqueId(title, used) {
  const base = slug(title) || "story";
  let id = base;
  let n = 1;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function plainBody(lines) {
  return lines.join("\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<p class="if-you">[\s\S]*?<\/p>/gi, "")
    .replace(/<p class="whats-next">[\s\S]*?<\/p>/gi, "")
    .replace(/<p class="source-line">[\s\S]*?<\/p>/gi, "")
    .replace(/<span class="src">[\s\S]*?<\/span>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourcesHtml(lines) {
  const chunk = lines.join("\n");
  const line = chunk.match(/<p class="source-line">[\s\S]*?<\/p>/i);
  if (line) return presentSourceHtml(line[0]);
  const span = chunk.match(/<span class="src">[\s\S]*?<\/span>/i);
  return span ? presentSourceHtml(span[0]) : "";
}

function actionHtml(lines) {
  return readerActionMarkup(parseReaderAction(lines.join("\n")));
}

function pushStory(stories, current, used) {
  if (!current) return;
  stories.push({
    title: current.title,
    anchor: uniqueId(current.title, used),
    summary: openingSentences(plainBody(current.lines)),
    sourcesHtml: sourcesHtml(current.lines),
    actionHtml: actionHtml(current.lines),
    section: current.section,
    lead: current.lead
  });
}

function parseStories(markdown) {
  const stories = [];
  const used = new Set();
  let heading = "";
  let beat = "";
  let inBig = false;
  let current = null;
  for (const line of String(markdown ?? "").split("\n")) {
    if (BIG_OPEN.test(line)) {
      inBig = true;
      continue;
    }
    if (BIG_CLOSE.test(line) || RIVER_CLOSE.test(line)) {
      pushStory(stories, current, used);
      current = null;
      inBig = false;
      continue;
    }
    if (RIVER_OPEN.test(line)) continue;
    const h2 = line.match(H2);
    if (h2) {
      pushStory(stories, current, used);
      current = null;
      heading = h2[1];
      beat = "";
      continue;
    }
    const h4 = line.match(H4);
    if (h4) {
      pushStory(stories, current, used);
      current = null;
      beat = h4[1];
      continue;
    }
    const h3 = line.match(H3);
    if (h3 && inBig) {
      pushStory(stories, current, used);
      current = {
        title: h3[1].trim(),
        section: sectionLabel(heading, ""),
        lead: true,
        lines: []
      };
      continue;
    }
    const h5 = line.match(H5);
    if (h5) {
      pushStory(stories, current, used);
      current = {
        title: h5[1].trim(),
        section: sectionLabel(heading, beat),
        lead: false,
        lines: []
      };
      continue;
    }
    if (current) current.lines.push(line);
  }
  pushStory(stories, current, used);
  return stories;
}

function groupSections(stories) {
  const groups = [];
  const byLabel = new Map();
  for (const story of stories) {
    let group = byLabel.get(story.section);
    if (!group) {
      group = { label: story.section, stories: [] };
      byLabel.set(story.section, group);
      groups.push(group);
    }
    group.stories.push(story);
  }
  const ordered = [[], [], []];
  for (const group of groups) ordered[sectionRank(group.label)].push(group);
  const used = new Set();
  return ordered.flat().map((group) => {
    const id = uniqueId(group.label, used);
    return {
      label: group.label,
      slug: id,
      stories: group.stories.map((story) => ({
        title: story.title,
        anchor: story.anchor,
        summary: story.summary,
        sourcesHtml: story.sourcesHtml,
        actionHtml: story.actionHtml,
        signupAfter: false
      }))
    };
  });
}

export function homeEdition(markdown) {
  const stories = parseStories(markdown);
  const lead = stories.find((story) => story.lead) || null;
  const sections = groupSections(stories.filter((story) => !story.lead));
  const listed = sections.flatMap((section) => section.stories);
  const signupAt = Math.min(SIGNUP_AFTER, stories.length);
  // Lead is story 1, so the third rendered story is listed[1].
  if (signupAt >= SIGNUP_AFTER && listed.length > SIGNUP_AFTER - 2) {
    listed[SIGNUP_AFTER - 2].signupAfter = true;
  }
  return {
    leadAnchor: lead?.anchor || "",
    leadActionHtml: lead?.actionHtml || "",
    signupAfterLead: stories.length > 0 && stories.length < SIGNUP_AFTER,
    sections
  };
}
