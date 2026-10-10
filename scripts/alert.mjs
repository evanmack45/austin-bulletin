#!/usr/bin/env node
// Open an ALERT issue for Evan and record it in today's log.
// Usage: node scripts/alert.mjs "reason" [--repo owner/name]
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const repoIdx = args.indexOf("--repo");
const repo = repoIdx >= 0 ? args.splice(repoIdx, 2)[1] : "evanmack45/austin-bulletin";
const reason = args.join(" ").trim();
if (!reason) {
  console.error('usage: node scripts/alert.mjs "reason" [--repo owner/name]');
  process.exit(2);
}

const title = `ALERT: ${reason}`.slice(0, 200);
const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
const gh = (...a) => execFileSync("gh", a, { encoding: "utf8" }).trim();

let url = "";
try {
  const open = JSON.parse(
    gh("issue", "list", "--repo", repo, "--state", "open", "--label", "alert",
      "--json", "number,title", "--limit", "50"),
  );
  const same = open.find((i) => i.title === title);
  if (same) {
    gh("issue", "comment", String(same.number), "--repo", repo,
      "--body", `Still open on ${today}.`);
    url = `https://github.com/${repo}/issues/${same.number}`;
  } else {
    try { gh("label", "create", "alert", "--repo", repo, "--color", "B60205",
      "--description", "Needs Evan"); } catch { /* label exists */ }
    url = gh("issue", "create", "--repo", repo, "--title", title,
      "--label", "alert", "--body",
      `Raised by the owner on ${today} (America/Chicago).\n\n${reason}\n\nClose this issue when handled.`);
  }
} catch (err) {
  console.error("gh failed:", err.message);
}

if (!existsSync("logs")) mkdirSync("logs");
appendFileSync(`logs/${today}.md`, `\n**ALERT** ${title}${url ? ` — ${url}` : ""}\n`);
console.log(url || "(issue not created; log line written)");
