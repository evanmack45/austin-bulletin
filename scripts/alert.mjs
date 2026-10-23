#!/usr/bin/env node
// Reach Evan. Three channels, in order: an ALERT issue (the record), a
// deliberately failing "Alert" workflow run (the bell: GitHub emails Evan
// about failed runs, but not about issues his own account opens), and a
// line in today's log. Exits non-zero if no channel reached him.
// Usage: node scripts/alert.mjs "reason" [--repo owner/name]
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
const body = `Raised by the owner on ${today} (America/Chicago).\n\n${reason}\n\nClose this issue when handled.`;
const gh = (...a) => execFileSync("gh", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const api = async (path, payload) => {
  const res = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
      "User-Agent": "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.status === 204 ? {} : res.json();
};

let url = "";
let rang = false;

// 1. The record: an issue, reused if the same title is already open.
try {
  const open = JSON.parse(gh("issue", "list", "--repo", repo, "--state", "open", "--label", "alert",
    "--json", "number,title", "--limit", "50"));
  const same = open.find((i) => i.title === title);
  if (same) {
    gh("issue", "comment", String(same.number), "--repo", repo, "--body", `Still open on ${today}.`);
    url = `https://github.com/${repo}/issues/${same.number}`;
  } else {
    try { gh("label", "create", "alert", "--repo", repo, "--color", "B60205", "--description", "Needs Evan"); } catch {}
    url = gh("issue", "create", "--repo", repo, "--title", title, "--label", "alert", "--body", body);
  }
} catch (err) {
  console.error("gh issue failed:", err.message.split("\n")[0]);
  if (token) {
    try { url = (await api("issues", { title, labels: ["alert"], body })).html_url ?? ""; }
    catch (e) { console.error("REST issue failed:", e.message); }
  }
}

// 2. The bell: a failing workflow run.
try {
  gh("workflow", "run", "alert.yml", "--repo", repo, "-f", `reason=${reason}`, "-f", `issue=${url}`);
  rang = true;
} catch (err) {
  console.error("gh workflow run failed:", err.message.split("\n")[0]);
  if (token) {
    try {
      await api("actions/workflows/alert.yml/dispatches", { ref: "main", inputs: { reason, issue: url } });
      rang = true;
    } catch (e) { console.error("REST dispatch failed:", e.message); }
  }
}

// 3. The log line, in this repo's logs/ whatever the current directory is.
const logDir = join(dirname(fileURLToPath(import.meta.url)), "..", "logs");
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
appendFileSync(join(logDir, `${today}.md`), `\n**ALERT** ${title}${url ? ` — ${url}` : ""}${rang ? "" : " (bell NOT rung)"}\n`);

if (!url && !rang) {
  console.error("No channel reached Evan. Open the issue and dispatch alert.yml with the GitHub MCP tool, and call PushNotification.");
  process.exit(1);
}
console.log(`${url || "(no issue)"}${rang ? " · bell rung" : " · bell NOT rung"}`);
