// Pre-publish checker for one bulletin.
//
// Usage: node scripts/check.mjs [YYYY-MM-DD] [--no-links] [--dir <path>]
//
// --dir overrides the bulletin directory (default: src/bulletins). It exists
// so tests/gate.test.mjs can point the checker at a throwaway temp directory
// instead of writing fixtures into the live content directory, where a
// crash mid-test could leave a stray file for an Eleventy build to trip
// over. Default behaviour (no --dir) is unchanged.
//
// Runs the mechanical half of EDITORIAL.md's quality gate — everything a
// script can judge without reading for sense. It is not a substitute for
// gate checks 2 and 6, which need a person (or a careful model) to read the
// page top to bottom.
//
// Exits 0 when every check passes, 1 on the first failure class found. Warnings
// do not fail the run.
//
// Why this exists: on 2026-08-25 six of forty River items were over the
// 100-word cap and were only caught by an ad-hoc script written during the
// gate. Everything here was checked by hand at least once; none of it should
// be.

import { readFile, readdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFile } from "node:child_process";
import { BEATS, words, wordCount, parseRiver, checkRiver, BEAT_HEADING_RE } from "./river.mjs";
import { checkAcronyms } from "./acronyms.mjs";

const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";

// The lead/brief contract starts with this edition. Earlier bulletins keep the
// old rules — published editions are not restructured after the fact
// (precedent: the 2026-08-24 Weather ruling left 2026-08-23 alone). The rules
// take effect with the first edition of September; 2026-08-29 through
// 2026-08-31 are grandfathered because they were written and published
// before this contract existed.
//
// WARNING: if this branch has not merged before this date, move it forward
// again. GitHub tests a PR by merging it with current main, so CI evaluates
// whatever main has already published under these new rules. A cutover date
// that has slipped into the past retroactively condemns editions that were
// written and published under the OLD rules — which is exactly the bug this
// comment is here to prevent from recurring.
const NEW_SHAPE_FROM = "2026-09-01";

// EDITORIAL.md "Neutrality rules": use neutral verbs.
const BANNED_VERBS = ["claimed", "admitted", "slammed", "blasted", "gushed", "bragged", "lashed out"];

const RIVER_MIN = 25;
const RIVER_MAX = 40;
const ITEM_WORD_CAP = 100;
const BIG_MIN = 400;
const BIG_MAX = 700;

const problems = [];
const warnings = [];
// Set when a substantive visual_exception is invoked, so the final report
// can print it prominently — the whole point is that it is auditable in
// the day's run log.
let exceptionNotice = null;

function bad(check, message) {
  problems.push({ check, message });
}

function warn(check, message) {
  warnings.push({ check, message });
}

function todayCentral() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-links") args.noLinks = true;
    else if (a === "--dir") args.dir = argv[++i];
    else args._.push(a);
  }
  return args;
}

function section(text, open, close) {
  const a = text.indexOf(open);
  if (a === -1) return null;
  const b = text.indexOf(close, a);
  if (b === -1) return null;
  return text.slice(a + open.length, b);
}

function curl(url) {
  return new Promise((resolve) => {
    execFile(
      "curl",
      ["-sS", "-o", "/dev/null", "-L", "-m", "30", "-A", UA, "-w", "%{http_code}", url],
      { timeout: 40000 },
      (err, stdout) => resolve(err ? "000" : (stdout || "").trim())
    );
  });
}

function curlBody(url) {
  return new Promise((resolve) => {
    execFile(
      "curl",
      ["-sS", "-L", "-m", "30", "-A", UA, url],
      { timeout: 40000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout) => resolve(err ? "" : stdout || "")
    );
  });
}

// KXAN article pages return 403 to every non-browser client — documented in
// PIPELINE.md Step 1, and true of every KXAN link we have ever published. A
// plain status check would call all of them broken. The WordPress API is open
// to us, so verify by slug there instead.
async function kxanSlugExists(url) {
  const slug = url.replace(/[?#].*$/, "").replace(/\/$/, "").split("/").pop();
  if (!slug) return false;
  const body = await curlBody(
    `https://www.kxan.com/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=link`
  );
  try {
    const json = JSON.parse(body);
    return Array.isArray(json) && json.length > 0;
  } catch {
    return false;
  }
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = args._[0] || todayCentral();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("check: date must be YYYY-MM-DD");
    process.exit(1);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");
  const bulletinDir = args.dir ? path.resolve(args.dir) : path.join(repoRoot, "src", "bulletins");
  const file = path.join(bulletinDir, `${date}.md`);

  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    console.error(`check: no bulletin at ${path.relative(repoRoot, file)}`);
    process.exit(1);
  }

  // --- front matter -------------------------------------------------------
  const fm = section(text, "---\n", "\n---");
  // Optional escape hatch for the River's visual minimums (EDITORIAL.md
  // "Voice cards and video"): visual_exception: "<reason>". Narrowly scoped
  // to the front-matter block itself, not the whole file — reusing the same
  // `section()` mechanism the rest of front matter parsing already uses.
  const visualException = fm ? (fm.match(/^visual_exception:\s*"([^"]*)"\s*$/m) || [])[1] : undefined;
  if (!fm) {
    bad("front matter", "could not find front matter");
  } else {
    const [, y, m, d] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const wantPermalink = `/${y}/${m}/${d}/`;
    if (!fm.includes(`date: ${date}`)) bad("front matter", `date: is not ${date}`);
    if (!fm.includes(`permalink: "${wantPermalink}"`)) {
      bad("front matter", `permalink: is not "${wantPermalink}"`);
    }
    const title = (fm.match(/title:\s*"([^"]*)"/) || [])[1] || "";
    const want = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date(`${date}T12:00:00Z`));
    if (title !== `The Austin Bulletin — ${want}`) {
      bad("front matter", `title is "${title}", expected "The Austin Bulletin — ${want}"`);
    }
  }

  // --- Big Story ----------------------------------------------------------
  const big = section(text, "{% bigstory %}", "{% endbigstory %}");
  if (!big) {
    bad("big story", "no {% bigstory %} block");
  } else {
    const prose = big
      .replace(/^###.*$/gm, " ")
      .replace(/<p class="whats-next"[\s\S]*$/, " ")
      .replace(/<figcaption[\s\S]*?<\/figcaption>/g, " ");
    const n = wordCount(prose);
    if (n < BIG_MIN || n > BIG_MAX) {
      bad("big story", `${n} words, EDITORIAL wants ${BIG_MIN}–${BIG_MAX}`);
    }
    if (!/^###\s+\S/m.test(big)) bad("big story", "no ### headline");
    if (!/<p class="whats-next">/.test(big)) bad("big story", 'no "What\'s next" line');
    if (!/<p class="source-line">/.test(big)) bad("big story", "no Sources line");
  }

  // --- River --------------------------------------------------------------
  const ACRONYMS = JSON.parse(
    await readFile(new URL("./acronyms.json", import.meta.url), "utf8")
  );
  const river = section(text, "{% river %}", "{% endriver %}");
  if (!river) {
    bad("river", "no {% river %} block");
  } else {
    // Shares river.mjs's own BEAT_HEADING_RE (rather than a second, hand-typed
    // regex) so this scan and the River parser's heading detection cannot
    // silently drift apart — see river.mjs's file-header note.
    const headingRe = new RegExp(BEAT_HEADING_RE.source, "gm");
    const heads = [...river.matchAll(headingRe)].map((m) => m[1].trim());
    for (const h of heads) {
      if (!BEATS.includes(h)) bad("river", `unknown beat heading "${h}"`);
    }
    const known = heads.filter((h) => BEATS.includes(h));
    const order = known.map((h) => BEATS.indexOf(h));
    if (order.some((v, i) => i > 0 && v <= order[i - 1])) {
      bad("river", `beats out of order or duplicated: ${known.join(" · ")}`);
    }

    const parsed = parseRiver(river);
    const newShape = date >= NEW_SHAPE_FROM;
    const items = parsed.items.map((i) => i.body);
    if (!newShape && (items.length < RIVER_MIN || items.length > RIVER_MAX)) {
      bad("river", `${items.length} items, EDITORIAL wants ${RIVER_MIN}–${RIVER_MAX}`);
    }
    for (const it of items) {
      const n = wordCount(it);
      if (!newShape && n > ITEM_WORD_CAP) {
        bad("river", `item is ${n} words (cap ${ITEM_WORD_CAP}): "${words(it).slice(0, 60)}…"`);
      }
      if (!/<span class="src">[^<]+<\/span>\s*$/.test(it)) {
        bad("river", `item has no closing source tag: "${words(it).slice(0, 60)}…"`);
      }
    }

    if (newShape) {
      const riverFindings = checkRiver(parsed, { visualException });
      for (const p of riverFindings.problems) bad(p.check, p.message);
      for (const w of riverFindings.warnings) warn(w.check, w.message);
      if (riverFindings.exceptionApplied) {
        exceptionNotice = riverFindings.visualException;
      }

      const language = checkAcronyms(text, ACRONYMS);
      for (const p of language.problems) bad(p.check, p.message);
      for (const w of language.warnings) warn(w.check, w.message);
    }

    const note = (text.match(/<p class="river-note">\s*(\d+)\s+items/) || [])[1];
    if (!note) {
      bad("river", "no river-note giving an item count");
    } else if (Number(note) !== items.length) {
      bad("river", `river-note says ${note} items, found ${items.length}`);
    }
  }

  // --- Weather ------------------------------------------------------------
  // Must be its own section outside the river wrapper (publisher's ruling,
  // 2026-08-24) and keep the id the masthead's "Skip to weather" link targets.
  if (!/^##\s+Weather\s*$/m.test(text)) {
    bad("weather", "no `## Weather` heading");
  } else if (river && /^##\s+Weather\s*$/m.test(river)) {
    bad("weather", "Weather is inside the {% river %} wrapper; it must be its own section");
  }
  const weatherPart = text.split(/^##\s+Weather\s*$/m)[1] || "";
  if (weatherPart && !/<p class="source-line">/.test(weatherPart.split(/<aside/)[0])) {
    bad("weather", "Weather section has no sources line");
  }

  // --- rituals ------------------------------------------------------------
  for (const [needle, label] of [
    ['<aside class="the-number"', "The Number"],
    ['<p class="countdown"', "Countdown"],
    ['<p class="good-thing"', "One Good Thing"]
  ]) {
    if (!text.includes(needle)) bad("rituals", `${label} is missing`);
  }
  if (!/<p class="morning-note">/.test(text)) bad("rituals", "morning note is missing");

  // --- neutral verbs ------------------------------------------------------
  for (const verb of BANNED_VERBS) {
    const re = new RegExp(`\\b${verb.replace(/ /g, "\\s+")}\\b`, "gi");
    for (const m of text.matchAll(re)) {
      const around = text.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\s+/g, " ");
      bad("neutral verbs", `"${verb}" — …${around}…`);
    }
  }

  // --- cards and videos ---------------------------------------------------
  // An id used by an earlier edition means a re-fetch rewrote that edition's
  // stored data. See scripts/video.mjs and scripts/card.mjs.
  const others = (await readdir(bulletinDir))
    .filter((n) => n.endsWith(".md") && n !== `${date}.md`)
    .sort();
  const mine = {
    voice: [...text.matchAll(/\{%\s*voice\s+"([^"]+)"\s*%\}/g)].map((m) => m[1]),
    video: [...text.matchAll(/\{%\s*video\s+"([^"]+)"\s*%\}/g)].map((m) => m[1])
  };
  for (const other of others) {
    const otherText = await readFile(path.join(bulletinDir, other), "utf8");
    for (const kind of ["voice", "video"]) {
      for (const id of mine[kind]) {
        if (otherText.includes(`{% ${kind} "${id}" %}`)) {
          bad("reuse", `${kind} "${id}" is also in ${other.replace(/\.md$/, "")}`);
        }
      }
    }
  }
  if (mine.voice.length > 10) bad("caps", `${mine.voice.length} voice cards, cap is 10`);
  if (mine.video.length > 3) bad("caps", `${mine.video.length} videos, cap is 3`);

  // Every referenced card/video id must have its data file.
  for (const [kind, dir] of [["voice", "cards"], ["video", "videos"]]) {
    for (const id of mine[kind]) {
      if (!(await exists(path.join(repoRoot, "src", "_data", dir, `${id}.json`)))) {
        bad("data", `${kind} "${id}" has no src/_data/${dir}/${id}.json`);
      }
    }
  }

  // --- images -------------------------------------------------------------
  const imgs = [...text.matchAll(/!\[([^\]]*)\]\((\/images\/[^)]+)\)/g)];
  for (const [, alt, src] of imgs) {
    if (!alt.trim()) bad("images", `image has empty alt text: ${src}`);
    if (!(await exists(path.join(repoRoot, "src", src.replace(/^\//, ""))))) {
      bad("images", `file not found: src${src}`);
    }
  }

  // --- leftovers ----------------------------------------------------------
  for (const re of [/\bTODO\b/, /\bTK\b/, /\bLorem ipsum\b/i, /\bXXX\b/, /<<+/]) {
    if (re.test(text)) bad("leftovers", `draft marker found: ${re}`);
  }

  // --- links --------------------------------------------------------------
  if (!args.noLinks) {
    const urls = [...new Set([...text.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]))];
    process.stderr.write(`check: verifying ${urls.length} links…\n`);
    for (const url of urls) {
      const code = await curl(url);
      if (code === "200") continue;
      if (/^https?:\/\/(www\.)?kxan\.com\//.test(url) && code === "403") {
        if (await kxanSlugExists(url)) continue;
        bad("links", `KXAN slug not found in its WordPress API: ${url}`);
        continue;
      }
      if (code === "403" || code === "000") {
        warn("links", `${code} (may block automated clients, check by hand): ${url}`);
        continue;
      }
      bad("links", `HTTP ${code}: ${url}`);
    }
  }

  // --- report -------------------------------------------------------------
  if (exceptionNotice) {
    console.error(`\n  *** VISUAL EXCEPTION invoked for ${date}: "${exceptionNotice}" ***`);
  }
  for (const w of warnings) console.error(`  warn  [${w.check}] ${w.message}`);
  if (problems.length === 0) {
    console.error(
      `\ncheck: ${date} passes the mechanical gate` +
        (warnings.length ? ` (${warnings.length} warning${warnings.length === 1 ? "" : "s"})` : "") +
        `\ncheck: this does not replace gate checks 2 and 6 — read the page.`
    );
    process.exit(0);
  }
  console.error("");
  for (const p of problems) console.error(`  FAIL  [${p.check}] ${p.message}`);
  console.error(`\ncheck: ${problems.length} problem${problems.length === 1 ? "" : "s"} in ${date}. Do not publish.`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`check: ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
