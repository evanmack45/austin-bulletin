// Morning-edition email signup. Kit's official embed owns the form and
// the confirmation step. This module places the mobile bar and publishes
// the content security policy that embed needs. It does not post an address.

export const VALUE_LINE = "What matters in Austin, in your inbox each morning. Free.";
export const CONFIGURED_NOTE = "One email each morning, after you confirm.";
export const DISMISS_KEY = "abSignupBarDismissed";
export const MOBILE_QUERY = "(max-width: 760px)";
export const BAR_RESERVE_PX = 300;
export const KIT_UID = "e956043af1";
export const KIT_ACCOUNT_ORIGIN = "https://the-austin-bulletin.kit.com";
export const KIT_EMBED_SRC = `${KIT_ACCOUNT_ORIGIN}/${KIT_UID}/index.js`;
export const KIT_FORM_URL = `${KIT_ACCOUNT_ORIGIN}/${KIT_UID}`;
export const KIT_ORIGIN = "https://app.kit.com";

const KIT_ASSET_ORIGINS = [
  "https://f.convertkit.com",
  "https://pages.convertkit.com",
  "https://app.convertkit.com"
];

const SCRIPT_HOSTS = [
  "'self'",
  "'unsafe-inline'",
  "https://static.cloudflareinsights.com",
  "https://cloudflareinsights.com",
  KIT_ACCOUNT_ORIGIN,
  KIT_ORIGIN,
  ...KIT_ASSET_ORIGINS,
  "https://www.google.com",
  "https://www.gstatic.com"
];

const STYLE_HOSTS = [
  "'self'",
  "'unsafe-inline'",
  "https://fonts.googleapis.com",
  KIT_ACCOUNT_ORIGIN,
  KIT_ORIGIN,
  ...KIT_ASSET_ORIGINS
];

const FONT_HOSTS = ["'self'", "data:", "https://fonts.gstatic.com", KIT_ACCOUNT_ORIGIN];

const IMAGE_HOSTS = [
  "'self'",
  "data:",
  "blob:",
  KIT_ACCOUNT_ORIGIN,
  KIT_ORIGIN,
  ...KIT_ASSET_ORIGINS
];

const CONNECT_HOSTS = [
  "'self'",
  KIT_ACCOUNT_ORIGIN,
  KIT_ORIGIN,
  ...KIT_ASSET_ORIGINS,
  "https://cloudflareinsights.com",
  "https://static.cloudflareinsights.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://www.google.com",
  "https://www.gstatic.com"
];

const FORM_HOSTS = ["'self'", KIT_ORIGIN, KIT_ACCOUNT_ORIGIN];

const WORKER_HOSTS = ["'self'", "blob:", "https://static.cloudflareinsights.com"];

export function contentSecurityPolicy() {
  return [
    `script-src ${SCRIPT_HOSTS.join(" ")}`,
    `style-src ${STYLE_HOSTS.join(" ")}`,
    `font-src ${FONT_HOSTS.join(" ")}`,
    `img-src ${IMAGE_HOSTS.join(" ")}`,
    `connect-src ${CONNECT_HOSTS.join(" ")}`,
    `form-action ${FORM_HOSTS.join(" ")}`,
    `worker-src ${WORKER_HOSTS.join(" ")}`
  ].join("; ");
}

export function actionClearOfBar(rect, viewportHeight, reserve = BAR_RESERVE_PX) {
  if (!rect) return true;
  if (rect.bottom <= 0 || rect.top >= viewportHeight) return true;
  return rect.bottom <= viewportHeight - reserve;
}

export function barShouldShow({ mobile, dismissed, inlineInView, actionClear }) {
  return mobile === true && dismissed !== true
    && inlineInView !== true && actionClear !== false;
}

function readFlag(storage, key) {
  try {
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(storage, key) {
  try {
    storage.setItem(key, "1");
  } catch {
    // Private mode can reject storage. The bar still closes for this view.
  }
}

function intersectsViewport(el, height) {
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.bottom > 0 && box.top < height;
}

function leadActionClear(doc) {
  const action = doc.querySelector(".front-lead .front-action");
  if (!action) return true;
  const height = doc.documentElement.clientHeight || doc.defaultView.innerHeight;
  return actionClearOfBar(action.getBoundingClientRect(), height);
}

function inlineInView(doc) {
  const height = doc.documentElement.clientHeight || doc.defaultView.innerHeight;
  const blocks = doc.querySelectorAll("[data-signup-inline]");
  return [...blocks].some(el => intersectsViewport(el, height));
}

export function syncBar(doc, storage) {
  const bar = doc.querySelector("[data-signup='bar']");
  if (!bar) return false;
  const mobile = doc.defaultView.matchMedia(MOBILE_QUERY).matches;
  const show = barShouldShow({
    mobile,
    dismissed: readFlag(storage, DISMISS_KEY) || bar.dataset.dismissed === "1",
    inlineInView: inlineInView(doc),
    actionClear: leadActionClear(doc)
  });
  bar.classList.toggle("is-fixed", show);
  bar.hidden = !show;
  doc.body.classList.toggle("signup-bar-stuck", show);
  return show;
}

function onDismiss(doc, storage) {
  const bar = doc.querySelector("[data-signup='bar']");
  if (bar) bar.dataset.dismissed = "1";
  writeFlag(storage, DISMISS_KEY);
  syncBar(doc, storage);
  const top = doc.getElementById("top");
  if (!top) return;
  top.setAttribute("tabindex", "-1");
  top.focus({ preventScroll: true });
}

export function bootSignup(doc, storage) {
  const view = doc.defaultView;
  if (!view) return;
  const dismiss = doc.querySelector("[data-signup-dismiss]");
  if (dismiss) dismiss.addEventListener("click", () => onDismiss(doc, storage));
  let frame = 0;
  const refresh = () => {
    if (frame) return;
    frame = view.requestAnimationFrame(() => {
      frame = 0;
      syncBar(doc, storage);
    });
  };
  view.addEventListener("scroll", refresh, { passive: true });
  view.addEventListener("resize", refresh);
  view.matchMedia(MOBILE_QUERY).addEventListener("change", refresh);
  doc.documentElement.dataset.signupReady = "1";
  syncBar(doc, storage);
}

if (typeof document !== "undefined") {
  const start = () => bootSignup(document, localStorage);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}
