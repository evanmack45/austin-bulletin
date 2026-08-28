// Parses a {% river %} block into typed items and beats.
//
// Two kinds of item, per EDITORIAL.md "The shape of a day":
//   lead  — a ##### headline over a 50–70 word summary
//   brief — one sentence, no headline
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

function visualKind(block) {
  if (block.startsWith("{% voice")) return "voice";
  if (block.startsWith("{% video")) return "video";
  if (block.startsWith("![") || block.startsWith("<figure")) return "graphic";
  return null;
}

export function parseRiver(river) {
  const blocks = river
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const beats = [];
  const items = [];
  const visuals = { voice: 0, video: 0, graphic: 0 };
  let current = null;

  for (const block of blocks) {
    if (block.startsWith("#####")) {
      const [head, ...rest] = block.split("\n");
      const headline = head.replace(/^#####\s*/, "").trim();
      const body = rest.join("\n").trim();
      const item = { kind: "lead", headline, body, words: wordCount(body), beat: current?.name ?? null };
      items.push(item);
      current?.items.push(item);
      continue;
    }

    if (block.startsWith("####")) {
      current = { name: block.replace(/^####\s*/, "").trim(), items: [], visuals: 0, voice: 0, words: 0 };
      beats.push(current);
      continue;
    }

    const kind = visualKind(block);
    if (kind) {
      visuals[kind] += 1;
      if (current) {
        current.visuals += 1;
        if (kind === "voice") current.voice += 1;
      }
      continue;
    }

    if (block.startsWith("{%") || block.startsWith('<p class="source-line"') || block.startsWith("<figcaption")) {
      continue;
    }

    const item = { kind: "brief", headline: null, body: block, words: wordCount(block), beat: current?.name ?? null };
    items.push(item);
    current?.items.push(item);
  }

  for (const beat of beats) {
    beat.words = beat.items.reduce((n, i) => n + i.words, 0);
  }

  return {
    beats,
    items,
    leads: items.filter((i) => i.kind === "lead"),
    briefs: items.filter((i) => i.kind === "brief"),
    visuals
  };
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

// A visual_exception is substantive only past this many non-whitespace
// characters — a placeholder like "n/a" or "-" (or padding out a short
// placeholder with spaces to clear a length check) must not silently
// behave like a real, audited reason.
const EXCEPTION_MIN_CHARS = 20;

// Counts real content, not whitespace — `.trim()` alone only strips the
// ends, so "x" + 18 spaces + "y" would pass a plain length check at 20
// chars while carrying 2 characters of actual reason.
function substantiveChars(s) {
  return s.replace(/\s+/g, "").length;
}

export function checkRiver(parsed, { visualException } = {}) {
  const problems = [];
  const warnings = [];
  const bad = (check, message) => problems.push({ check, message });
  const warn = (check, message) => warnings.push({ check, message });

  // A missing/empty exception is simply "no exception" — normal rules apply.
  // A present-but-short one is its own failure: a half-filled escape hatch
  // must not quietly behave like no hatch at all.
  let exceptionOk = false;
  if (visualException != null && visualException !== "") {
    if (substantiveChars(visualException) >= EXCEPTION_MIN_CHARS) {
      exceptionOk = true;
    } else {
      bad(
        "visuals",
        `visual_exception is too short (${substantiveChars(visualException)} non-whitespace chars, needs ${EXCEPTION_MIN_CHARS}): "${visualException}"`
      );
    }
  }
  // Only the four supply-shortage rules below downgrade to WARNING when the
  // exception is substantive. Caps and every non-visual rule are unaffected —
  // they use `bad` directly, never this helper.
  const exceptable = exceptionOk
    ? (check, message) => warn(check, `${message} (visual_exception: ${visualException.trim()})`)
    : bad;

  for (const item of parsed.items) {
    if (item.kind === "brief" && item.words > LIMITS.briefMax) {
      bad("river", `brief is ${item.words} words (cap ${LIMITS.briefMax}): "${preview(item)}"`);
    }
    if (item.kind === "lead" && (item.words < LIMITS.leadMin || item.words > LIMITS.leadMax)) {
      bad("river", `lead is ${item.words} words, wants ${LIMITS.leadMin}–${LIMITS.leadMax}: "${item.headline}"`);
    }
    if (item.kind === "lead" && !item.headline) {
      bad("river", `lead has an empty headline: "${preview(item)}"`);
    }
  }

  for (const beat of parsed.beats) {
    const leads = beat.items.filter((i) => i.kind === "lead").length;
    if (leads > LIMITS.leadsPerBeat) {
      bad("river", `${beat.name} has ${leads} leads (cap ${LIMITS.leadsPerBeat})`);
    }
  }

  if (parsed.leads.length > LIMITS.leadsPerEdition) {
    bad("river", `${parsed.leads.length} leads in the edition (cap ${LIMITS.leadsPerEdition})`);
  } else if (parsed.leads.length < LIMITS.leadsWarnBelow) {
    warn(
      "river",
      `${parsed.leads.length} lead(s) in the River (EDITORIAL warns below ${LIMITS.leadsWarnBelow}; the impact test may legitimately find nothing)`
    );
  }

  if (parsed.items.length < LIMITS.itemsMin || parsed.items.length > LIMITS.itemsMax) {
    bad("river", `${parsed.items.length} items, EDITORIAL wants ${LIMITS.itemsMin}–${LIMITS.itemsMax}`);
  }

  const total = parsed.items.reduce((n, i) => n + i.words, 0);
  if (total > LIMITS.wordsFail) {
    bad("river", `river is ${total} words (fails above ${LIMITS.wordsFail})`);
  } else if (total > LIMITS.wordsWarn) {
    warn("river", `river is ${total} words (target ${LIMITS.wordsTarget}, warns above ${LIMITS.wordsWarn})`);
  }

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
  if (parsed.visuals.graphic < LIMITS.graphicMin) {
    exceptable("visuals", "no graphic in the River; EDITORIAL wants at least one");
  }
  // Only the lower bound (videoMin) is exceptable; the upper bound (videoMax)
  // is a hard failure, checked separately so an exception cannot reach it.
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

  return {
    problems,
    warnings,
    exceptionApplied: exceptionOk,
    visualException: exceptionOk ? visualException.trim() : null
  };
}
