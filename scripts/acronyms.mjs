// EDITORIAL.md "Language": every initialism is expanded on its first use in
// the edition. All seven readers in the 2026-08-28 review tripped on at least
// one unexplained abbreviation; this is the guardrail for that rule.
//
// Attribution is not jargon. Outlet names inside <span class="src">, figure
// captions, and the Sources lines are credits the reader is not asked to
// decode, so they are stripped before either check runs.

// Everyday abbreviations and outlet names that never need expanding.
const IGNORE = new Set([
  "US", "USA", "TV", "AI", "CEO", "CFO", "ID", "AM", "PM", "CT", "UT", "HVAC",
  "OK", "II", "III", "IV", "SUV", "DNA", "FBI", "NASA", "HUD", "DPS", "EMS",
  "KXAN", "KUT", "KVUE", "CBS", "FOX", "NBC", "ABC", "NPR", "NWS", "PGA",
  "SXSW", "ACL", "AT", "AP", "DA", "PD", "HOA", "RSS"
]);

function stripAttribution(text) {
  return text
    .replace(/<span class="src">[\s\S]*?<\/span>/g, " ")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/g, " ")
    .replace(/<p class="source-line">[\s\S]*?<\/p>/g, " ");
}

export function checkAcronyms(text, dict) {
  const problems = [];
  const warnings = [];
  const body = stripAttribution(text);

  for (const [short, expansion] of Object.entries(dict)) {
    const at = body.indexOf(short);
    if (at === -1) continue;
    // Spec 3.3: an initialism is expanded on its FIRST USE anywhere in the
    // edition — the Big Story counts, so the River need not repeat it. The
    // expansion may appear anywhere before first use (no left bound), or
    // immediately after it, as in "MoPac (Loop 1)" (right bound: 140 chars).
    // An expansion that only shows up later in the document does not count.
    const window = body.slice(0, at + short.length + 140);
    if (!window.includes(expansion)) {
      problems.push({
        check: "language",
        message: `"${short}" is used before its expansion "${expansion}"`
      });
    }
  }

  const known = new Set(Object.keys(dict));
  const seen = new Set();
  for (const m of body.matchAll(/\b[A-Z]{2,5}\b/g)) {
    const token = m[0];
    if (known.has(token) || IGNORE.has(token) || seen.has(token)) continue;
    seen.add(token);
    warnings.push({
      check: "language",
      message: `unknown initialism "${token}" — expand it, or add it to scripts/acronyms.json`
    });
  }

  return { problems, warnings };
}
