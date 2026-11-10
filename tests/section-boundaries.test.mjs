import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { collectProbes } from "../scripts/author-edition-probes.mjs";

const chrome = execFileSync(
  "bash",
  ["-lc", "command -v google-chrome || command -v chromium || true"],
  { encoding: "utf8" }
).trim();

test("rendered section boundaries stay within 44 to 52px", { skip: !chrome }, async () => {
  const report = await collectProbes();
  const pages = ["home-390", "home-1280", "edition-390", "edition-1280"];
  for (const name of pages) {
    const gaps = report[name].sectionGaps;
    if (name.startsWith("home-")) {
      assert.deepEqual(gaps, [], `${name} uses the reset lead, not the old section rules`);
      continue;
    }
    assert.ok(gaps.length >= 1, `${name} measured no section boundaries`);
    const span = name.endsWith("390") ? [60, 66] : [84, 90];
    for (const gap of gaps) {
      assert.ok(
        gap.px >= span[0] && gap.px <= span[1],
        `${name} ${gap.name} is ${gap.px}px, outside ${span[0]}–${span[1]}`
      );
    }
  }
});
