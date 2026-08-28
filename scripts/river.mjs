// Parses a {% river %} block into typed items and beats.
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
// Careful: `startsWith("####")` is true for "#####" as well. Lead detection
// must be tested before beat detection, or every lead is read as a beat.

export const BEATS = [
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

function isLeadBlock(block) {
  return block.startsWith("#####");
}

function parseLeadBlock(block, current) {
  const [head, ...rest] = block.split("\n");
  const headline = head.replace(/^#####\s*/, "").trim();
  const body = rest.join("\n").trim();
  return { kind: "lead", headline, body, words: wordCount(body), beat: current?.name ?? null };
}

function isBeatHeading(block) {
  return block.startsWith("####");
}

function parseBeatHeading(block) {
  return { name: block.replace(/^####\s*/, "").trim(), items: [], visuals: 0, voice: 0, words: 0 };
}

// A visual (voice/video/graphic/image) always counts toward the edition
// total; only when it falls inside a beat does it also count toward that
// beat's visuals (and, for voice, that beat's voice count).
function applyVisual(kind, visuals, current) {
  visuals[kind] += 1;
  if (current) {
    current.visuals += 1;
    if (kind === "voice") current.voice += 1;
  }
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
  return { kind: "brief", headline: null, body: block, words: wordCount(block), beat: current?.name ?? null };
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

function buildParseResult(beats, items, visuals) {
  return {
    beats,
    items,
    leads: items.filter((i) => i.kind === "lead"),
    briefs: items.filter((i) => i.kind === "brief"),
    visuals
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
      applyVisual(kind, visuals, current);
      continue;
    }

    if (isSkippableBlock(block)) {
      continue;
    }

    addItem(parseBriefBlock(block, current), items, current);
  }

  finalizeBeats(beats);

  return buildParseResult(beats, items, visuals);
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
// characters AND this floor of real words — a placeholder like "n/a" fails
// on both; a run of punctuation like "...................." (20 dots) or
// "aaaaaaaaaaaaaaaaaaaa" (one repeated token, no spaces) can clear the
// character floor alone, so the word floor is what actually requires a
// sentence rather than noise.
const EXCEPTION_MIN_CHARS = 20;
const EXCEPTION_MIN_WORDS = 4;

// Counts real content, not whitespace — `.trim()` alone only strips the
// ends, so "x" + 18 spaces + "y" would pass a plain length check at 20
// chars while carrying 2 characters of actual reason.
function substantiveChars(s) {
  return s.replace(/\s+/g, "").length;
}

// Counts whitespace-separated tokens that contain at least one letter or
// digit — "....................", "--------------------", and other
// punctuation-only reasons contain zero such tokens no matter how long they
// are, and a single repeated token like "aaaaaaaaaaaaaaaaaaaa" contains only
// one, well short of a real sentence.
function substantiveWords(s) {
  return s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

function isSubstantiveException(s) {
  return substantiveChars(s) >= EXCEPTION_MIN_CHARS && substantiveWords(s) >= EXCEPTION_MIN_WORDS;
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
        `visual_exception is too short (${substantiveWords(visualException)} word(s), ` +
          `${substantiveChars(visualException)} non-whitespace chars — needs at least ` +
          `${EXCEPTION_MIN_WORDS} words and ${EXCEPTION_MIN_CHARS} chars): "${visualException}"`
      );
    }
  }
  return exceptionOk;
}

// --- structural checks ------------------------------------------------

function checkBeatHeadings(parsed, bad) {
  if (parsed.beats.length === 0) {
    bad("river", "no beat headings in the River; EDITORIAL requires every item grouped under a recognised beat");
  }
}

function checkItemBeats(parsed, bad) {
  for (const item of parsed.items) {
    if (item.beat === null) {
      bad("river", `item is outside every beat heading: "${preview(item)}"`);
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
    bad("river", `lead is ${item.words} words, wants ${LIMITS.leadMin}–${LIMITS.leadMax}: "${item.headline}"`);
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
      `${parsed.leads.length} lead(s) in the River (EDITORIAL warns below ${LIMITS.leadsWarnBelow}; the impact test may legitimately find nothing)`
    );
  }
}

function checkItemCount(parsed, bad) {
  if (parsed.items.length < LIMITS.itemsMin || parsed.items.length > LIMITS.itemsMax) {
    bad("river", `${parsed.items.length} items, EDITORIAL wants ${LIMITS.itemsMin}–${LIMITS.itemsMax}`);
  }
}

function checkStructure(parsed, bad, warn) {
  checkBeatHeadings(parsed, bad);
  checkItemBeats(parsed, bad);
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
    warn("river", `river is ${total} words (target ${LIMITS.wordsTarget}, warns above ${LIMITS.wordsWarn})`);
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
      `${parsed.visuals.voice} voice card(s) in the River, EDITORIAL wants at least ${LIMITS.voiceMin}`
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
    exceptable("visuals", "no graphic in the River; EDITORIAL wants at least one");
  }
}

function checkVideoBudget(parsed, exceptable, bad) {
  // Only the lower bound (videoMin) is exceptable; the upper bound
  // (videoMax) is a hard failure, checked separately so an exception cannot
  // reach it.
  if (parsed.visuals.video < LIMITS.videoMin) {
    exceptable(
      "visuals",
      `${parsed.visuals.video} video(s), EDITORIAL wants ${LIMITS.videoMin}–${LIMITS.videoMax} in the River`
    );
  }
  if (parsed.visuals.video > LIMITS.videoMax) {
    bad(
      "visuals",
      `${parsed.visuals.video} video(s), EDITORIAL wants ${LIMITS.videoMin}–${LIMITS.videoMax} in the River`
    );
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
