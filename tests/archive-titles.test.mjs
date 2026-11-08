import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { archiveDate } from "../scripts/edition-dates.mjs";
import {
  archiveTitle, archiveTitleProblems, editionArchiveTitles, mostlyPercentage
} from "../scripts/archive-titles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOOD = "Five housing projects, a copper-theft request, and a school food award";

test("an explicit archive title wins over the briefing headline", () => {
  const md = "---\ntitle: x\narchive_title: \"" + GOOD + "\"\n---\n\n"
    + "### Early voting is over: 47.20%.\n";
  assert.equal(archiveTitle(md), GOOD);
});

test("a missing archive title falls back to the briefing headline", () => {
  const md = "---\ntitle: x\n---\n\n### Prices &amp; bills, *again*\n";
  assert.equal(archiveTitle(md), "Prices & bills, again");
  assert.equal(archiveTitle("---\ntitle: x\n---\n\nno headline"), "");
});

test("a dollar figure is not treated as a percentage", () => {
  const title = "Viva La Vida today, a murder charge in a library death, and $1.2 million";
  assert.equal(mostlyPercentage(title), false);
  assert.equal(mostlyPercentage("Last day of early voting: 41.98%."), true);
  assert.equal(mostlyPercentage("Early voting is over: 47.20%."), true);
  assert.equal(mostlyPercentage("30.62% of Travis County voters have cast ballots."), true);
});

test("empty lines, percentage lines, and exact repeats fail", () => {
  const problems = archiveTitleProblems([
    { date: "2026-10-30", title: "Last day of early voting: 41.98%.", explicit: true },
    { date: "2026-10-31", title: "Early voting is over: 47.20%.", explicit: true },
    {
      date: "2026-11-01",
      title: "30.62% of Travis County voters have cast ballots.",
      explicit: true
    },
    { date: "2026-11-02", title: GOOD, explicit: true },
    { date: "2026-11-03", title: GOOD, explicit: true },
    { date: "2026-11-04", title: "", explicit: false }
  ]);
  const text = problems.join("\n");
  assert.match(text, /2026-10-30: archive title is mostly a percentage/);
  assert.match(text, /2026-10-31: archive title is mostly a percentage/);
  assert.match(text, /2026-11-01: archive title is mostly a percentage/);
  assert.match(text, /2026-11-03: archive title repeats the previous edition/);
  assert.match(text, /2026-11-04: archive title is empty/);
  assert.match(text, /2026-11-04: set archive_title/);
  assert.doesNotMatch(text, /2026-11-02/);
});

test("editions before the cutover may keep the briefing headline", () => {
  const problems = archiveTitleProblems([
    { date: "2026-10-23", title: GOOD, explicit: false },
    {
      date: "2026-11-04",
      title: "Parks and library bonds lead, three council runoffs, " +
        "and a school board seat 74 votes apart",
      explicit: true
    }
  ]);
  assert.deepEqual(problems, []);
});

test("an archive date keeps the day number with the month", () => {
  assert.equal(archiveDate("2026-11-04T00:00:00.000Z"), "Wednesday, Nov.\u00a04");
});

test("the built archive lists those titles and the homepage card stays the lead", () => {
  const archive = readFileSync(path.join(root, "_site/archive/index.html"), "utf8");
  assert.match(archive, /datetime="2026-11-04"/);
  assert.match(archive, /school board seat 74 votes apart/);
  assert.match(archive, /Five housing projects, a copper-theft request/);
  assert.doesNotMatch(archive, /Early voting is over: 47\.20%/);
  assert.doesNotMatch(archive, /Last day of early voting: 41\.98%/);
  const home = readFileSync(path.join(root, "_site/index.html"), "utf8");
  assert.match(home, /property="og:title" content="Thursday is the registration deadline/);
  assert.match(home, /name="twitter:title" content="Thursday is the registration deadline/);
  const card = "https://theaustinbulletin.com/images/2026-11-08/" +
    "runoff-lead-desktop-1600.webp";
  assert.ok(home.includes(`property="og:image" content="${card}"`));
  assert.match(archive, /Austin Energy bonds, a \$5\.48 million trail purchase/);
});

test("every published edition has a usable archive title", async () => {
  const editions = await editionArchiveTitles(path.join(root, "src", "bulletins"));
  assert.ok(editions.length > 60);
  assert.deepEqual(archiveTitleProblems(editions), []);
});
