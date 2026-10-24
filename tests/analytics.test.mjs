import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import nunjucks from "nunjucks";
import { analyticsBeacon, analyticsSiteToken } from "../scripts/analytics.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_TOKEN = "ab".repeat(16);
const LAYOUT = new URL("../src/_includes/layout.njk", import.meta.url);

function layoutCall() {
  const layout = readFileSync(LAYOUT, "utf8");
  const call = layout.match(/\{\{[^}]*\}\}/g)?.find((tag) => tag.includes("analyticsBeacon"));
  assert.ok(call, "layout must render the beacon through analyticsBeacon");
  assert.equal(layout.includes("cloudflareinsights"), false);
  assert.equal(layout.includes("data-cf-beacon"), false);
  return call;
}

function renderLayoutBeacon(token) {
  const env = new nunjucks.Environment(null, { autoescape: true });
  env.addFilter("analyticsBeacon", analyticsBeacon);
  return env.renderString(layoutCall(), { analyticsSiteToken: token });
}

async function readDefaultSiteToken() {
  const env = { ...process.env };
  delete env.CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN;
  const { stdout } = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    "const { analyticsSiteToken } = await import('./scripts/analytics.mjs');" +
      "process.stdout.write(analyticsSiteToken());"
  ], { cwd: repoRoot, env });
  return stdout;
}

test("the beacon renders only when a site token is configured", () => {
  for (const blank of ["", "   ", undefined, null, "not-a-token", `${SITE_TOKEN}"`]) {
    assert.equal(analyticsBeacon(blank), "");
  }
  assert.equal(analyticsSiteToken({}), "");
  assert.equal(analyticsSiteToken({ CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN: "  " }), "");
  assert.equal(analyticsSiteToken({ CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN: "x".repeat(40) }), "");

  const html = analyticsBeacon(`  ${SITE_TOKEN.toUpperCase()}  `);
  assert.match(html, /type="module"/);
  assert.match(html, /src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"/);
  assert.match(html, new RegExp(`data-cf-beacon='\\{"token": "${SITE_TOKEN}"\\}'`));
  assert.doesNotMatch(html, /cookie/i);
  assert.equal(renderLayoutBeacon(""), "");
  assert.equal(renderLayoutBeacon("nope"), "");
  assert.equal(renderLayoutBeacon(SITE_TOKEN), html);
});

test("an unset environment leaves the site token disabled", async () => {
  const config = readFileSync(new URL("../eleventy.config.js", import.meta.url), "utf8");
  assert.match(config, /addGlobalData\("analyticsSiteToken", analyticsSiteToken\)/);
  assert.match(config, /addFilter\("analyticsBeacon", analyticsBeacon\)/);
  assert.equal(await readDefaultSiteToken(), "");
});
