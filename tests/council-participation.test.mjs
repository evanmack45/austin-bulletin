import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(
	new URL("../src/council/2026-10-08-preview.md", import.meta.url), "utf8",
);
test("Council preview provides dated signup and a direct neutral official rules link", () => {
  assert.match(source, /Wednesday, October 7 at noon CDT/);
  assert.match(source, /Thursday, October 8 at 9:15 a\.m\./);
  assert.match(source, new RegExp(
    String.raw`\[Read registration instructions\]\(` +
    String.raw`https://services\.austintexas\.gov/edims/document\.cfm\?id=482484\)`,
  ));
  assert.match(source, /regular business hours/);
  assert.match(source, /remote and in-person/);
  assert.doesNotMatch(source, /Register now|signup is open|automatically expires at noon/i);
});
test("separate AHFC hearing points to its own instructions, not Council's signup context", () => {
  assert.match(source, /Council item 27.*development approval/s);
  assert.match(source, /AHFC item 4.*bond issuance/s);
  assert.match(source, new RegExp(
    String.raw`\[Separate AHFC registration instructions\]\(` +
    String.raw`https://services\.austintexas\.gov/edims/document\.cfm\?id=482485\)`,
  ));
});
