// Parses a {% river %} block into typed items and beats.
//
// The section this parses prints as "City Desk" since 2026-08-29 (it printed
// as "The River" before); this file, its exports and the {% river %}
// shortcode keep the internal name "river".
//
// Two kinds of item, per EDITORIAL.md "The shape of a day":
//   lead  — a ##### headline over a 50–70 word summary
//   brief — one sentence, no headline
//
// Item = { kind: "lead"|"brief", headline: string|null, body: string,
//          words: number, beat: string|null }.
// `beat` is null only for stray content that appears before the River's
// first #### heading. checkRiver's checkItemBeats rejects any item left in
// that state, so a River that clears the gate never has a null beat — the
// type is nullable in the data, not in anything that gets published.
//
// Heading detection uses exact CommonMark ATX-heading grammar (#### or
// ##### followed by REQUIRED whitespace), never a bare startsWith:
// "####Schools" (no space) is not a heading to markdown-it either, so a
// startsWith match would silently create a beat/lead here that never
// actually renders as a heading on the built page — its items would look
// grouped in this parser while the reader sees no heading and no beat nav
// destination at all. scripts/check.mjs scans the same grammar (imported
// from here, not re-typed) so the gate and the parser cannot drift apart.
// Careful: lead detection (#####) must still be tested before beat
// detection (####), since a five-# line also starts with four #s.
// One slug rule for every in-page anchor: markdown-it-anchor's heading ids,
// the beat nav's hrefs, and the gate's First Read link validation all use
// this. The default slugifier percent-encodes "&" ("roads-%26-transit").
export function slug(s) {
  return String(s).trim().toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const BEAT_HEADING_RE = /^####\s+(.+)$/;
export const LEAD_HEADING_RE = /^#####\s+(.+)$/;

// The six-beat map adopted 2026-08-29 (Evan's pick from the beat-taxonomy
// jam, docs/reviews/river-beats-jam-2026-08-29.md). Order is the Who Pays
// ladder. Routing rules live in EDITORIAL.md "The shape of a day".
export const BEATS = [
  "Money & bills",
  "Public safety & courts",
  "Growth & infrastructure",
  "City Hall & county",
  "Schools",
  "Business & street life"
];

// Pre-cutover editions keep the nine-beat map they were published under.
export const BEATS_LEGACY = [
  "Roads & transit",
  "Public safety & courts",
  "City Hall & county",
  "Schools",
  "Health",
  "Business & tech",
  "Around town",
  "Texas",
  "Sports"
];

export function words(block) {
  return block
    .replace(/!\[[\s\S]*?\]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(block) {
  const t = words(block);
  return t ? t.split(" ").length : 0;
}

// Two kinds of visual count as "graphic": an original chart/timeline/map
// from `npm run graphic`, wrapped in <figure class="graphic"> so it can be
// told apart from a photo. Anything else — a bare Markdown image or any
// other <figure> (a verified real photo, an AI-generated image) — is a
// plain "image": it still breaks up a wall of text, but it is not the
// original-graphic EDITORIAL.md requires at least one of per day.
function visualKind(block) {
  if (block.startsWith("{% voice")) return "voice";
  if (block.startsWith("{% video")) return "video";
  if (block.startsWith('<figure class="graphic"')) return "graphic";
  if (block.startsWith("![") || block.startsWith("<figure")) return "image";
  return null;
}

// --- parseRiver: per-block classification -------------------------------
// Each helper below recognises (or builds) one kind of block that the River
// walk can encounter. Order matters in the walk itself: a lead ("#####")
// must be tested before a beat heading ("####"), because "#####".startsWith
// ("####") is true — see the file-header note.

// Only the block's own first line can be a heading; a lead's body lines
// (or any other trailing content) must not accidentally match the grammar.
function firstLine(block) {
  const idx = block.indexOf("\n");
  return idx === -1 ? block : block.slice(0, idx);
}

function isLeadBlock(block) {
  return LEAD_HEADING_RE.test(firstLine(block));
}

function parseLeadBlock(block, current) {
  const [head, ...rest] = block.split("\n");
  const headline = head.match(LEAD_HEADING_RE)[1].trim();
  const body = rest.join("\n").trim();
  return { kind: "lead", headline, body, words: wordCount(body), beat: current?.name ?? null };
}

function isBeatHeading(block) {
  return BEAT_HEADING_RE.test(firstLine(block));
}

function parseBeatHeading(block) {
  const name = firstLine(block).match(BEAT_HEADING_RE)[1].trim();
  return { name, items: [], visuals: 0, voice: 0, words: 0 };
}

// A visual (voice/video/graphic/image) always counts toward the edition
// total; only when it falls inside a beat does it also count toward that
// beat's visuals (and, for voice, that beat's voice count).
//
// Every visual is also recorded in `visualList` with beat: current?.name ??
// null, exactly like addItem does for items — a visual before any beat
// heading interrupts nothing, so checkRiver's checkVisualBeats rejects it
// the same way checkItemBeats rejects an ungrouped item.
function recordVisual(kind, block, visuals, visualList, current) {
  visuals[kind] += 1;
  visualList.push({ kind, beat: current?.name ?? null, id: visualId(block) });
  if (current) {
    current.visuals += 1;
    if (kind === "voice") current.voice += 1;
  }
}

// Pulls a human-identifiable label out of a visual block for failure
// messages: the quoted id for a `{% voice %}`/`{% video %}` shortcode, or
// the src/path for an <img>/Markdown image (graphic or bare photo). Returns
// null when neither pattern matches, so the caller can fall back to naming
// just the kind.
function visualId(block) {
  const shortcode = block.match(/^\{%\s*(?:voice|video)\s+"([^"]+)"/);
  if (shortcode) return shortcode[1];
  const img = block.match(/<img\s+[^>]*\bsrc="([^"]+)"/) || block.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return img ? img[1] : null;
}

// Blocks that are structural noise, not content: embeds, the trailing
// sources line, and figure captions.
function isSkippableBlock(block) {
  return (
    block.startsWith("{%") ||
    block.startsWith('<p class="source-line"') ||
    block.startsWith("<figcaption")
  );
}

function parseBriefBlock(block, current) {
  return {
    kind: "brief",
    headline: null,
    body: block,
    words: wordCount(block),
    beat: current?.name ?? null
  };
}

// An item before any beat heading still gets recorded (with beat: null) so
// checkRiver's checkItemBeats can flag it, rather than being silently lost.
function addItem(item, items, current) {
  items.push(item);
  current?.items.push(item);
}

function finalizeBeats(beats) {
  for (const beat of beats) {
    beat.words = beat.items.reduce((n, i) => n + i.words, 0);
  }
}

function buildParseResult(beats, items, visuals, visualList) {
  return {
    beats,
    items,
    leads: items.filter((i) => i.kind === "lead"),
    briefs: items.filter((i) => i.kind === "brief"),
    visuals,
    visualList
  };
}

export function parseRiver(river) {
  const blocks = river
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const beats = [];
  const items = [];
  const visuals = { voice: 0, video: 0, graphic: 0, image: 0 };
  const visualList = [];
  let current = null;

  for (const block of blocks) {
    if (isLeadBlock(block)) {
      addItem(parseLeadBlock(block, current), items, current);
      continue;
    }

    if (isBeatHeading(block)) {
      current = parseBeatHeading(block);
      beats.push(current);
      continue;
    }

    const kind = visualKind(block);
    if (kind) {
      recordVisual(kind, block, visuals, visualList, current);
      continue;
    }

    if (isSkippableBlock(block)) {
      continue;
    }

    addItem(parseBriefBlock(block, current), items, current);
  }

  finalizeBeats(beats);

  return buildParseResult(beats, items, visuals, visualList);
}

export const LIMITS = {
  briefMax: 35,
  leadMin: 40,
  leadMax: 80,
  leadsPerBeat: 2,
  leadsPerEdition: 12,
  itemsMin: 25,
  itemsMax: 40,
  wordsWarn: 1800,
  wordsFail: 2200,
  voiceMin: 4,
  voiceMax: 10,
  voicePerBeat: 2,
  videoMin: 1,
  videoMax: 3,
  graphicMin: 1,
  beatWordsBeforeVisual: 400,
  wordsTarget: 1500,
  leadsWarnBelow: 4
};

function preview(item) {
  return words(item.body).slice(0, 60) + "…";
}

// A visual_exception is substantive only past this floor of non-whitespace
// characters AND this floor of distinct, meaningful word-like tokens. A
// meaningful token is 3+ letters (case-insensitive dedup) — this rules out
// short filler ("a", "no", "as"), pure punctuation ("...................."),
// and a single token merely repeated to pad the count ("aaaa aaaa aaaa
// aaaa" is one reason restated four times, not four reasons; "a a a a
// ...................." has four tokens but every one is a single letter,
// so none qualify). Only a real sentence clears both floors together.
const EXCEPTION_MIN_CHARS = 20;
const EXCEPTION_MIN_DISTINCT_WORDS = 4;
const WORD_TOKEN_RE = /^[A-Za-z]{3,}$/;

// Counts real content, not whitespace — `.trim()` alone only strips the
// ends, so "x" + 18 spaces + "y" would pass a plain length check at 20
// chars while carrying 2 characters of actual reason.
function substantiveChars(s) {
  return s.replace(/\s+/g, "").length;
}

// Counts DISTINCT word-like tokens (3+ letters, case-insensitive). See the
// EXCEPTION_MIN_CHARS/EXCEPTION_MIN_DISTINCT_WORDS comment above for why
// both distinctness and a minimum token length are required, not just an
// alphanumeric-content check.
function substantiveWords(s) {
  const seen = new Set();
  for (const token of s.split(/\s+/)) {
    if (WORD_TOKEN_RE.test(token)) seen.add(token.toLowerCase());
  }
  return seen.size;
}

function isSubstantiveException(s) {
  return (
    substantiveChars(s) >= EXCEPTION_MIN_CHARS &&
    substantiveWords(s) >= EXCEPTION_MIN_DISTINCT_WORDS
  );
}

// A missing/empty exception is simply "no exception" — normal rules apply.
// A present-but-short one is its own failure: a half-filled escape hatch
// must not quietly behave like no hatch at all. Returns whether the
// exception is valid; pushes its own problem via `bad` when it is not.
function resolveVisualException(visualException, bad) {
  let exceptionOk = false;
  if (visualException != null && visualException !== "") {
    if (isSubstantiveException(visualException)) {
      exceptionOk = true;
    } else {
      bad(
        "visuals",
        `visual_exception is too short (${substantiveWords(visualException)} distinct word(s) ` +
          `of 3+ letters, ${substantiveChars(visualException)} non-whitespace chars — needs ` +
          `at least ${EXCEPTION_MIN_DISTINCT_WORDS} distinct words and ${EXCEPTION_MIN_CHARS} ` +
          `chars): "${visualException}"`
      );
    }
  }
  return exceptionOk;
}

// --- structural checks ------------------------------------------------

function checkBeatHeadings(parsed, bad) {
  if (parsed.beats.length === 0) {
    bad(
      "river",
      "no beat headings in City Desk; EDITORIAL requires every item grouped under a recognised beat"
    );
  }
}

function checkItemBeats(parsed, bad) {
  for (const item of parsed.items) {
    if (item.beat === null) {
      bad("river", `item is outside every beat heading: "${preview(item)}"`);
    }
  }
}

// Names shown in the failure message for each visual kind (matches the
// wording checkVoiceBudget/checkGraphicBudget/checkVideoBudget already use).
const VISUAL_KIND_NAMES = {
  voice: "voice card",
  video: "video",
  graphic: "graphic",
  image: "image"
};

// A visual that sits before the first beat heading interrupts nothing, so it
// cannot satisfy the voice/video/graphic minimums those interruptions exist
// for (see the visual budget section below). Fails it explicitly, naming its
// kind and id/src where one was found, rather than silently excluding it
// from the counts — an author who sees four voice cards in the source but a
// "0 voice cards" failure has no idea what to fix.
function checkVisualBeats(parsed, bad) {
  for (const visual of parsed.visualList) {
    if (visual.beat === null) {
      const name = VISUAL_KIND_NAMES[visual.kind] ?? visual.kind;
      const id = visual.id ? ` (${visual.id})` : "";
      bad("river", `${name} is outside every beat heading${id}`);
    }
  }
}

// A declared beat with zero items is a navigation destination that jumps
// to nothing — EDITORIAL.md's "missing beats are omitted, never padded"
// means a beat heading with nothing under it should not have been written
// at all.
function checkEmptyBeats(parsed, bad) {
  for (const beat of parsed.beats) {
    if (beat.items.length === 0) {
      bad(
        "river",
        `${beat.name} is a declared beat with zero items; EDITORIAL says missing beats are ` +
          "omitted, never padded"
      );
    }
  }
}

function checkBriefLength(item, bad) {
  if (item.kind === "brief" && item.words > LIMITS.briefMax) {
    bad("river", `brief is ${item.words} words (cap ${LIMITS.briefMax}): "${preview(item)}"`);
  }
}

function checkLeadShape(item, bad) {
  if (item.kind !== "lead") return;
  if (item.words < LIMITS.leadMin || item.words > LIMITS.leadMax) {
    bad(
      "river",
      `lead is ${item.words} words, wants ${LIMITS.leadMin}–${LIMITS.leadMax}: "${item.headline}"`
    );
  }
  if (!item.headline) {
    bad("river", `lead has an empty headline: "${preview(item)}"`);
  }
}

function checkItemLengths(parsed, bad) {
  for (const item of parsed.items) {
    checkBriefLength(item, bad);
    checkLeadShape(item, bad);
  }
}

function checkLeadsPerBeat(parsed, bad) {
  for (const beat of parsed.beats) {
    const leads = beat.items.filter((i) => i.kind === "lead").length;
    if (leads > LIMITS.leadsPerBeat) {
      bad("river", `${beat.name} has ${leads} leads (cap ${LIMITS.leadsPerBeat})`);
    }
  }
}

function checkLeadsPerEdition(parsed, bad, warn) {
  if (parsed.leads.length > LIMITS.leadsPerEdition) {
    bad("river", `${parsed.leads.length} leads in the edition (cap ${LIMITS.leadsPerEdition})`);
  } else if (parsed.leads.length < LIMITS.leadsWarnBelow) {
    warn(
      "river",
      `${parsed.leads.length} lead(s) in City Desk (EDITORIAL warns below ` +
        `${LIMITS.leadsWarnBelow}; the impact test may legitimately find nothing)`
    );
  }
}

function checkItemCount(parsed, bad) {
  if (parsed.items.length < LIMITS.itemsMin || parsed.items.length > LIMITS.itemsMax) {
    bad(
      "river",
      `${parsed.items.length} items, EDITORIAL wants ${LIMITS.itemsMin}–${LIMITS.itemsMax}`
    );
  }
}

function checkStructure(parsed, bad, warn) {
  checkBeatHeadings(parsed, bad);
  checkItemBeats(parsed, bad);
  checkVisualBeats(parsed, bad);
  checkEmptyBeats(parsed, bad);
  checkItemLengths(parsed, bad);
  checkLeadsPerBeat(parsed, bad);
  checkLeadsPerEdition(parsed, bad, warn);
  checkItemCount(parsed, bad);
}

// --- word budget --------------------------------------------------------

function checkWordBudget(parsed, bad, warn) {
  const total = parsed.items.reduce((n, i) => n + i.words, 0);
  if (total > LIMITS.wordsFail) {
    bad("river", `river is ${total} words (fails above ${LIMITS.wordsFail})`);
  } else if (total > LIMITS.wordsWarn) {
    warn(
      "river",
      `river is ${total} words (target ${LIMITS.wordsTarget}, warns above ${LIMITS.wordsWarn})`
    );
  }
}

// --- visual budget --------------------------------------------------------
// Only the four supply-shortage rules below (voice/graphic/video minimums,
// per-beat density) go through `exceptable`, which downgrades to WARNING
// when a substantive visual_exception is in force. Caps and every
// non-visual rule call `bad` directly and are never exceptable.

function checkVoiceBudget(parsed, exceptable, bad) {
  if (parsed.visuals.voice < LIMITS.voiceMin) {
    exceptable(
      "visuals",
      `${parsed.visuals.voice} voice card(s) in City Desk, EDITORIAL wants at least ` +
        `${LIMITS.voiceMin}`
    );
  }
  // voiceMax is a hard failure regardless of any exception — too many
  // visuals is never a supply shortage.
  if (parsed.visuals.voice > LIMITS.voiceMax) {
    bad("visuals", `${parsed.visuals.voice} voice cards (cap ${LIMITS.voiceMax})`);
  }
}

function checkGraphicBudget(parsed, exceptable) {
  if (parsed.visuals.graphic < LIMITS.graphicMin) {
    exceptable("visuals", "no graphic in City Desk; EDITORIAL wants at least one");
  }
}

function checkVideoBudget(parsed, exceptable, bad) {
  // Only the lower bound (videoMin) is exceptable; the upper bound
  // (videoMax) is a hard failure, checked separately so an exception cannot
  // reach it.
  const videoMessage =
    `${parsed.visuals.video} video(s), EDITORIAL wants ${LIMITS.videoMin}–${LIMITS.videoMax} ` +
    "in City Desk";
  if (parsed.visuals.video < LIMITS.videoMin) {
    exceptable("visuals", videoMessage);
  }
  if (parsed.visuals.video > LIMITS.videoMax) {
    bad("visuals", videoMessage);
  }
}

function checkPerBeatVisuals(parsed, exceptable, bad) {
  for (const beat of parsed.beats) {
    // voicePerBeat is a hard failure regardless of any exception.
    if (beat.voice > LIMITS.voicePerBeat) {
      bad("visuals", `${beat.name} carries ${beat.voice} voice cards (cap ${LIMITS.voicePerBeat})`);
    }
    if (beat.words > LIMITS.beatWordsBeforeVisual && beat.visuals === 0) {
      exceptable(
        "visuals",
        `${beat.name} runs ${beat.words} words with no visual (cap ${LIMITS.beatWordsBeforeVisual})`
      );
    }
  }
}

function checkVisualBudget(parsed, exceptable, bad) {
  checkVoiceBudget(parsed, exceptable, bad);
  checkGraphicBudget(parsed, exceptable);
  checkVideoBudget(parsed, exceptable, bad);
  checkPerBeatVisuals(parsed, exceptable, bad);
}

export function checkRiver(parsed, { visualException } = {}) {
  const problems = [];
  const warnings = [];
  const bad = (check, message) => problems.push({ check, message });
  const warn = (check, message) => warnings.push({ check, message });

  const exceptionOk = resolveVisualException(visualException, bad);
  const exceptable = exceptionOk
    ? (check, message) => warn(check, `${message} (visual_exception: ${visualException.trim()})`)
    : bad;

  checkStructure(parsed, bad, warn);
  checkWordBudget(parsed, bad, warn);
  checkVisualBudget(parsed, exceptable, bad);

  return {
    problems,
    warnings,
    exceptionApplied: exceptionOk,
    visualException: exceptionOk ? visualException.trim() : null
  };
}
