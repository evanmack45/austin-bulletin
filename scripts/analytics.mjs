// Cloudflare Web Analytics beacon. Cookieless and free. The site token is
// public once it is rendered; it is not an API token. A missing, blank, or
// malformed value emits no markup, so the beacon stays off.

export const ANALYTICS_SITE_TOKEN_ENV = "CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN";

const SITE_TOKEN = /^[a-f0-9]{32}$/;
const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

export function analyticsSiteToken(env = process.env) {
  const raw = env?.[ANALYTICS_SITE_TOKEN_ENV];
  if (typeof raw !== "string") return "";
  const token = raw.trim().toLowerCase();
  return SITE_TOKEN.test(token) ? token : "";
}

export function analyticsBeacon(token) {
  const siteToken = analyticsSiteToken({
    [ANALYTICS_SITE_TOKEN_ENV]: typeof token === "string" ? token : ""
  });
  if (!siteToken) return "";
  const open = "<!-- Cloudflare Web Analytics -->";
  const close = "<!-- End Cloudflare Web Analytics -->";
  const beacon = `{"token": "${siteToken}"}`;
  const script = `<script type="module" src="${BEACON_SRC}" data-cf-beacon='${beacon}'></script>`;
  return `${open}${script}${close}`;
}
