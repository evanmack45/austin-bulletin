// Fail when authored CSS declares a font-size in px.
// rem and em follow the reader's root font size. px does not.
//
// A px size that truly cannot be relative goes in PX_FONT_SIZE_ALLOW.
// Each entry is the declaration's trimmed value, with a comment for why.
// Example:
// "16px", // a widget that ignores rem

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const PX_FONT_SIZE_ALLOW = [
];

const PX_LENGTH = /\d*\.?\d+px\b/i;
const ABSOLUTE_SIZE = /^[\d.]+(?:px|rem|em|%|vw|vh|vmin|vmax|ch|ex)$/i;
const SIZE_FUNCTION = /^(?:clamp|calc|min|max|var)\(/i;

export function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
}

function lineNumber(css, index) {
  return css.slice(0, index).split("\n").length;
}

function shorthandSize(value) {
  for (const token of value.trim().split(/\s+/)) {
    const size = token.split("/")[0];
    if (ABSOLUTE_SIZE.test(size) || SIZE_FUNCTION.test(size)) return size;
  }
  return "";
}

function collect(css, pattern, property, pick) {
  const found = [];
  for (const match of css.matchAll(pattern)) {
    const value = match[1].trim();
    const size = pick(value);
    if (size && PX_LENGTH.test(size)) {
      found.push({ line: lineNumber(css, match.index), property, value });
    }
  }
  return found;
}

export function pxFontSizeViolations(css, allow = PX_FONT_SIZE_ALLOW) {
  const clean = stripCssComments(css);
  const fontSize = /(?:^|[^\w-])font-size\s*:\s*([^;}]*)/g;
  const shorthand = /(?:^|[^\w-])font\s*:\s*([^;}]*)/g;
  const decls = [
    ...collect(clean, fontSize, "font-size", (value) => value),
    ...collect(clean, shorthand, "font", shorthandSize)
  ];
  return decls.filter((item) => !allow.includes(item.value));
}

function cssFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...cssFiles(full));
    else if (name.endsWith(".css")) out.push(full);
  }
  return out;
}

export function repoPxFontSizeViolations(dir = path.join(root, "src")) {
  const problems = [];
  for (const file of cssFiles(dir)) {
    const css = readFileSync(file, "utf8");
    for (const problem of pxFontSizeViolations(css)) {
      problems.push({ file: path.relative(root, file), ...problem });
    }
  }
  return problems;
}

function report(problems) {
  if (problems.length === 0) {
    console.error("check: font sizes are relative");
    return;
  }
  for (const problem of problems) {
    const where = `${problem.file}:${problem.line}`;
    console.error(`${where} ${problem.property}: ${problem.value}`);
  }
  const noun = problems.length === 1 ? "declaration" : "declarations";
  console.error(`check: ${problems.length} px font-size ${noun}`);
  process.exitCode = 1;
}

function main() {
  report(repoPxFontSizeViolations());
}

const invoked = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
