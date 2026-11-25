// /austin-311-wait/: every 311 request in a year as a point of light, in WebGL.
// This file wires the page (scroll steps, the "your wait" form, fallbacks); the
// graphic lives in wait-311-scene.js and the modules it imports.
// No WebGL, no DecompressionStream, or a failed load: the page keeps its still images.
import { decode, districtAt, fmtDays, guessDays, guessText, guessVerdict,
  minutesCode }
  from "./wait-311-core.js";
import { prepare } from "./wait-311-prep.js";
import { run } from "./wait-311-scene.js";

export * from "./wait-311-core.js";

// The 1 MB of data and the GPU work wait for the reader's first scroll, touch, key or
// mouse move, so the page paints and answers input first. The poster shows meanwhile.
const INTENT = ["scroll", "wheel", "pointerdown", "pointermove", "touchstart", "keydown"];

const root = typeof document === "undefined" ? null : document.getElementById("w3");
if (root) start(root);

/** On a phone, the hero copy starts just below the first screen. */
function padHero(root, wide) {
  const step = root.querySelector(".w3-hero-step");
  if (!step) return;
  if (wide.matches) { step.style.paddingTop = ""; return; }
  const top = step.getBoundingClientRect().top + scrollY;
  step.style.paddingTop = `${Math.max(0, innerHeight - top)}px`;
}

/** Track which caption is active and tell the graphic. */
function watchSteps(root, stage, wide) {
  const steps = [...root.querySelectorAll(".w3-step")];
  let current = -1;
  const pickStep = () => {
    const line = innerHeight * (wide.matches ? 0.62 : 0.8);
    let index = 0;
    steps.forEach((s, i) => { if (s.getBoundingClientRect().top < line) index = i; });
    const heroTop = steps[0].firstElementChild.getBoundingClientRect().top;
    root.classList.toggle("is-hud-off", !wide.matches && heroTop < innerHeight * 0.3);
    if (index === current) return;
    steps[current]?.classList.remove("is-active");
    current = index;
    steps[index].classList.add("is-active");
    const scene = steps[index].dataset.scene;
    stage.dataset.scene = scene;
    root.dispatchEvent(new CustomEvent("w3:scene", { detail: scene }));
  };
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; pickStep(); });
  };
  const watch = { rootMargin: "0px 0px -18% 0px", threshold: [0, 1] };
  for (const el of [root, ...steps]) new IntersectionObserver(queue, watch).observe(el);
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", () => { padHero(root, wide); queue(); });
  padHero(root, wide);
  pickStep();
}

function start(root) {
  const DATA = JSON.parse(document.getElementById("w3-data").textContent);
  const stage = root.querySelector(".w3-stage");
  const canvas = root.querySelector(".w3-canvas");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const wide = matchMedia("(min-width: 900px)");
  root.classList.add("is-live");
  watchSteps(root, stage, wide);
  setupYou(root, DATA);
  setupGuess(root, DATA);

  // An explicit check: no WebGL (or no gzip streams) means the still images stay.
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, depth: true,
    premultipliedAlpha: true, powerPreference: "high-performance" });
  if (!gl || typeof DecompressionStream === "undefined") return fallback(root, "no-webgl");
  root.classList.add("is-webgl");
  const ctx = { root, stage, canvas, gl, DATA, reduce, wide,
    labels: root.querySelector(".w3-labels"), hud: root.querySelector(".w3-hud"),
    getScene: () => stage.dataset.scene };
  onIntent(root, () => load(DATA.src)
    .then(async (data) => run({ ...ctx, data, prep: await prepare(data, DATA) }))
    .catch((err) => { console.warn("wait-311:", err); fallback(root, "load-failed"); }));
}

function onIntent(root, begin) {
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    for (const type of INTENT) removeEventListener(type, go);
    begin();
  };
  for (const type of INTENT) addEventListener(type, go, { passive: true });
  root.querySelector(".w3-replay")?.addEventListener("click", go);
  if (scrollY > 0) go();
}

/** " By district: 12 hours (District 10) to 17 hours (District 5)." */
export function districtRange(group) {
  const rows = group.byDistrict.filter((x) => x.closed >= 20)
    .sort((a, b) => a.medianDays - b.medianDays);
  if (rows.length < 2) return "";
  const [lo, hi] = [rows[0], rows.at(-1)];
  return ` By district: ${fmtDays(lo.medianDays)} (District ${lo.district}) to `
    + `${fmtDays(hi.medianDays)} (District ${hi.district}).`;
}

function youHtml(group, district) {
  const s = district ? group.byDistrict[district - 1] : group;
  const where = district ? `District ${district}` : "Austin";
  const what = group.label.toLowerCase();
  if (!s.closed) return `<p>No closed ${what} requests in ${where} in this data.</p>`;
  return `<p class="w3-you-big">${fmtDays(s.medianDays)}</p>
    <p>Half of ${what} requests in ${where} were closed within ${fmtDays(s.medianDays)}.
    9 in 10 within <b>${fmtDays(s.p90Days)}</b>.${district ? "" : districtRange(group)}</p>
    <p class="w3-you-n">Based on ${s.closed.toLocaleString("en-US")} closed requests.</p>`;
}

/** Guess first: the reader commits to a typical wait before the pile reveals it. */
function setupGuess(root, DATA) {
  const form = root.querySelector(".w3-guess-form");
  if (!form) return;
  const range = form.elements.guess, val = form.querySelector(".w3-guess-val");
  const lock = form.querySelector(".w3-guess-lock");
  const out = root.querySelector(".w3-guess-out"), result = root.querySelector(".w3-guess-result");
  range.value = "60";
  // Tick labels sit where their times fall on the log scale.
  for (const tick of form.querySelectorAll("[data-min]")) {
    tick.style.left = `${(minutesCode(Number(tick.dataset.min)) / Number(range.max)) * 100}%`;
  }
  const show = () => { val.textContent = guessText(Number(range.value)); };
  range.addEventListener("input", () => {
    show();
    lock.disabled = false; lock.textContent = "Lock in my guess";
  });
  lock.addEventListener("click", () => {
    const code = Number(range.value), text = guessText(code);
    const median = DATA.overall.medianDays;
    const verdict = guessVerdict(guessDays(code), median);
    lock.disabled = true; lock.textContent = "Locked";
    out.innerHTML = `Locked: <b>${text}</b>. Keep scrolling for the answer.`;
    result.innerHTML = verdict === "close"
      ? `You guessed <b>${text}</b>. That's close.`
      : `You guessed <b>${text}</b>: ${verdict}.`;
    result.hidden = false;
    root._guess = code;
    root.dispatchEvent(new CustomEvent("w3:guess"));
  });
  show();
}

/** The "your wait" form. Works without WebGL; tells the graphic what to highlight. */
function setupYou(root, DATA) {
  const form = root.querySelector(".w3-you-form");
  const out = root.querySelector(".w3-you-out");
  if (!form || !out) return;
  const groupIndex = Object.fromEntries(DATA.groups.map((g, i) => [g.key, i]));
  let pin = null;
  const update = (write = true) => {
    const key = form.elements.problem.value, district = Number(form.elements.district.value);
    if (write) out.innerHTML = youHtml(DATA.groups[groupIndex[key]], district);
    root._you = { group: groupIndex[key], district, pin };
    root.dispatchEvent(new CustomEvent("w3:you"));
  };
  form.addEventListener("change", () => { pin = null; update(); });
  form.querySelector(".w3-locate")?.addEventListener("click", () => locate(form, DATA, (d, at) => {
    form.elements.district.value = String(d); pin = at; update();
  }));
  update(false);
}

/** Match the reader's position to a district on the device; nothing is sent. */
function locate(form, DATA, done) {
  const note = form.querySelector(".w3-locate-note");
  if (!navigator.geolocation) { note.textContent = "Your browser can't share a location."; return; }
  note.textContent = "Finding you… (your location stays on this device)";
  const found = (pos) => {
    const f = DATA.frame, kx = Math.cos((((f.minLat + f.maxLat) / 2) * Math.PI) / 180);
    const s = Math.max((f.maxLon - f.minLon) * kx, f.maxLat - f.minLat);
    const x = ((pos.coords.longitude - f.minLon) * kx) / s;
    const y = (f.maxLat - pos.coords.latitude) / s;
    const d = districtAt(DATA.outlines, x, y);
    if (!d) { note.textContent = "That spot is outside Austin's 10 Council districts."; return; }
    note.textContent = `You're in District ${d}. Your location was not sent anywhere.`;
    done(d, [x, y]);
  };
  const failed = () => { note.textContent = "Location not shared. Pick your district instead."; };
  navigator.geolocation.getCurrentPosition(found, failed,
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
}

function fallback(root, why) {
  root.classList.remove("is-webgl");
  root.classList.add("is-still");
  root.dataset.fallback = why;
}

async function load(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`data ${res.status}`);
  const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
  return decode(new Uint8Array(await new Response(stream).arrayBuffer()));
}
