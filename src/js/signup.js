// Morning-edition email signup. One module for the page and the tests.
// A blank NEWSLETTER_ENDPOINT does not store addresses. RSS stays the path
// that works. A set endpoint must accept POST application/x-www-form-urlencoded
// and return 2xx only after the address is saved.

export const VALUE_LINE = "What matters in Austin, in your inbox each morning. Free.";
export const DISMISS_KEY = "abSignupBarDismissed";
export const DONE_KEY = "abSignupDone";
export const FALLBACK_ACTION = "/subscribe/";
export const MOBILE_QUERY = "(max-width: 760px)";
export const BAR_RESERVE_PX = 168;

export const CONFIGURED_NOTE = "One email each morning. Your address is used only to send it.";
export const UNCONFIGURED_NOTE =
  "Mail delivery is not connected yet, so this form does not save your address.";
export const UNCONFIGURED_BAR_NOTE = "Not connected yet. Your address is not saved.";

export const MESSAGES = Object.freeze({
  invalid: "Enter an email address to subscribe.",
  unavailable: "Email signup is not connected yet. Nothing was sent. Follow by RSS until it is.",
  sending: "Sending…",
  success: "You're in. Look for the morning edition in your inbox.",
  error: "That didn't go through. Your address was not saved. Try again, or follow by RSS."
});

export function messageFor(type) {
  return MESSAGES[type] || "";
}

export function safeFieldName(value) {
  const name = String(value ?? "").trim();
  return /^[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(name) ? name : "email";
}

export function classifyEmail(value) {
  const email = String(value ?? "").trim();
  if (!email) return { ok: false, reason: "empty" };
  if (email.length > 254) return { ok: false, reason: "long" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "invalid" };
  return { ok: true, email };
}

function unconfigured() {
  return { configured: false, action: FALLBACK_ACTION, mode: "unavailable" };
}

function isBlankEndpoint(raw) {
  return !raw || raw === FALLBACK_ACTION || raw === "/subscribe";
}

function absoluteHttpUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return "";
  }
  return "";
}

// Relative paths post with fetch (same site). Absolute http(s) posts natively
// so a provider that does not send CORS headers can still accept the form.
export function resolveSignup(endpoint) {
  const raw = String(endpoint ?? "").trim();
  if (isBlankEndpoint(raw)) return unconfigured();
  if (raw.startsWith("//")) return unconfigured();
  if (raw.startsWith("/")) return { configured: true, action: raw, mode: "fetch" };
  const action = absoluteHttpUrl(raw);
  if (!action) return unconfigured();
  return { configured: true, action, mode: "native" };
}

export function submitDecision({ configured, mode, email }) {
  const parsed = classifyEmail(email);
  if (!parsed.ok) return { type: "invalid", prevent: true };
  if (!configured || mode === "unavailable") return { type: "unavailable", prevent: true };
  if (mode === "native") return { type: "native", prevent: false, email: parsed.email };
  return { type: "fetch", prevent: true, email: parsed.email };
}

export function actionClearOfBar(rect, viewportHeight, reserve = BAR_RESERVE_PX) {
  if (!rect) return true;
  if (rect.bottom <= 0 || rect.top >= viewportHeight) return true;
  return rect.bottom <= viewportHeight - reserve;
}

export function barShouldShow({ mobile, dismissed, subscribed, inlineInView, actionClear }) {
  return mobile === true && dismissed !== true && subscribed !== true
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

function formEmail(form) {
  return form.querySelector("input[type='email']");
}

function setStatus(form, type) {
  const status = form.querySelector("[data-signup-status]");
  if (status) status.textContent = messageFor(type);
  const input = formEmail(form);
  if (!input) return;
  if (type === "invalid" || type === "error") input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
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
  const forms = doc.querySelectorAll("[data-signup-inline]");
  return [...forms].some(el => intersectsViewport(el, height));
}

export function syncBar(doc, storage) {
  const bar = doc.querySelector("form[data-signup='bar']");
  if (!bar) return false;
  const mobile = doc.defaultView.matchMedia(MOBILE_QUERY).matches;
  const show = barShouldShow({
    mobile,
    dismissed: readFlag(storage, DISMISS_KEY) || bar.dataset.dismissed === "1",
    subscribed: readFlag(storage, DONE_KEY),
    inlineInView: inlineInView(doc),
    actionClear: leadActionClear(doc)
  });
  bar.classList.toggle("is-fixed", show);
  bar.hidden = !show;
  doc.body.classList.toggle("signup-bar-stuck", show);
  return show;
}

async function postSignup(form, action, fetchImpl) {
  const button = form.querySelector("[type='submit']");
  setStatus(form, "sending");
  if (button) button.disabled = true;
  try {
    const response = await fetchImpl(action, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(new FormData(form)),
      credentials: "same-origin",
      signal: AbortSignal.timeout(8000)
    });
    setStatus(form, response.ok ? "success" : "error");
    return response.ok;
  } catch {
    setStatus(form, "error");
    return false;
  } finally {
    if (button) button.disabled = false;
  }
}

function onSubmit(event, doc, storage, fetchImpl) {
  const form = event.currentTarget;
  const plan = resolveSignup(form.getAttribute("data-endpoint"));
  const decision = submitDecision({
    configured: plan.configured,
    mode: plan.mode,
    email: formEmail(form)?.value
  });
  if (!decision.prevent) return;
  event.preventDefault();
  if (decision.type !== "fetch") {
    setStatus(form, decision.type);
    return;
  }
  postSignup(form, plan.action, fetchImpl).then(ok => {
    if (!ok) return;
    writeFlag(storage, DONE_KEY);
    syncBar(doc, storage);
  });
}

function onDismiss(doc, storage) {
  const bar = doc.querySelector("form[data-signup='bar']");
  if (bar) bar.dataset.dismissed = "1";
  writeFlag(storage, DISMISS_KEY);
  syncBar(doc, storage);
  const top = doc.getElementById("top");
  if (!top) return;
  top.setAttribute("tabindex", "-1");
  top.focus({ preventScroll: true });
}

export function bootSignup(doc, storage, fetchImpl) {
  const view = doc.defaultView;
  if (!view) return;
  for (const form of doc.querySelectorAll("form[data-signup]")) {
    form.addEventListener("submit", event => onSubmit(event, doc, storage, fetchImpl));
  }
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
  const start = () => bootSignup(document, localStorage, (url, options) => fetch(url, options));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}
