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
    assert.ok(gaps.length >= 1, `${name} measured no section boundaries`);
    for (const gap of gaps) {
      assert.ok(
        gap.px >= 44 && gap.px <= 52,
        `${name} ${gap.name} is ${gap.px}px, outside 44–52`
      );
      assert.equal(gap.rule, "1px", `${name} ${gap.name} rule width`);
      assert.equal(gap.ruleColor, "rgb(204, 204, 204)", `${name} ${gap.name} rule color`);
    }
  }
});
