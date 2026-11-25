// The scroll-driven scenes of /austin-311-wait/: state, transitions, the hero
// time-lapse clock and the per-frame point uniforms.
import { createRenderer } from "./wait-311-gl.js";
import { BINS } from "./wait-311-prep.js";
import { createView, lerpCam } from "./wait-311-view.js";
import { createLabels } from "./wait-311-labels.js";

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const LAYOUT = { hero: 0, map: 0, color: 0, terrain: 1, hist: 2, rows: 3, vehicles: 4, rings: 5,
  you: 6, end: 0 };
const BASE_A = { hero: 0.7, map: 1, color: 0.75, terrain: 0.6, hist: 0, rows: 0, vehicles: 0.6,
  rings: 0, you: 0.6, end: 0.8 };
const MAP_LIKE = [0, 1, 4, 6];
const ORBIT_MS = 12000;         // terrain and vehicles turn slowly for this long, then hold
const PLAY_MS = 11000;          // the hero time-lapse of the year
const colorFor = (scene) => (scene === "hero" || scene === "map" ? 0 : 1);
const blend = (f, a, b, k) => f(a) * (1 - k) + f(b) * k;

/** Dot size (px at the reference distance), brightness and highlight lift. */
function pointLook(st, k, cam, v, prep, hdrOn) {
  const pxPerUnit = v.safe.h / (cam.h || 1);
  const sizeOf = (l) => ({ 2: v.geo.hist.s * pxPerUnit * 1.15, 3: v.geo.rows.s * pxPerUnit * 1.15,
    5: 1.3 }[l] ?? (v.wide.matches ? 1.5 : 1.2));
  // About one point's worth of light per pixel where points spread evenly; denser
  // places add up and glow in the tone map.
  const area = (l) => v.safe.w * v.safe.h * v.dpr * v.dpr * l;
  const gainOf = (l) => {
    if (l === 2 || l === 3) return 1;
    const px = sizeOf(l) * v.dpr;
    return Math.min(1, (area(l === 5 ? 0.22 : 0.35) * 2.2) / (prep.n * px * px));
  };
  // Highlighted subsets (abandoned vehicles; your problem and district) get the
  // brightness they would have on their own.
  const liftOf = (l) => {
    const c = l === 4 ? prep.countOf(prep.groupIndex.vehicle, 0)
      : (l === 6 && st.focus[0] ? prep.countOf(st.focus[1], st.focus[2]) : 0);
    if (!c) return 1;
    const px = sizeOf(l) * v.dpr;
    return Math.max(1, Math.min(1, (area(0.35) * 2.2) / (c * px * px)) / gainOf(l));
  };
  return { uSize: Math.max(0.6, blend(sizeOf, st.from, st.to, k)),
    uGain: blend(gainOf, st.from, st.to, k) * (hdrOn ? 1 : 0.55),
    uLift: blend(liftOf, st.from, st.to, k) };
}

function pointValues(st, k, cam, m, v, prep, hdrOn) {
  const g = v.geo;
  return { uView: m.view, uProj: m.proj, uFrom: st.from, uTo: st.to, uMix: k, uClock: st.clock,
    uSlots: prep.slots, uRise: st.rise, uColor: st.color, uDpr: v.dpr, uRef: m.dist,
    uHist: [g.left, g.bottom, g.binW, g.hist.s], uHistCols: [g.hist.cols, BINS],
    uRows: [g.left, g.top, g.rowsH, g.rows.s], uRowFit: g.rowFit,
    uRing: [0.3, 1.0, prep.ringWeeks], uRingOffset: prep.ringOffset, uFocus: st.focus,
    ...pointLook(st, k, cam, v, prep, hdrOn) };
}

/** The date and running count over the hero while the year plays. */
function createHud(hud, DATA, prep, slot) {
  const date = hud.querySelector(".w3-hud-date"), count = hud.querySelector(".w3-hud-count");
  const start = Date.UTC(...DATA.from.split("-").map((x, i) => (i === 1 ? x - 1 : +x)));
  const fmt = new Intl.DateTimeFormat("en-US",
    { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (clock) => {
    const s = Math.max(0, Math.min(prep.slots - 1, Math.floor(Math.min(1, clock) * prep.slots)));
    date.textContent = fmt.format(new Date(start + s * slot * 60000));
    count.textContent = prep.cumulative[s].toLocaleString("en-US");
  };
}

/** Advance the transition, the clock and the orbit; true while still moving. */
function step(st, now, ctx) {
  let busy = false;
  if (st.mix < 1) { st.mix = Math.min(1, (now - st.t0) / st.dur); busy = true; }
  st.color = st.colorA + (st.colorB - st.colorA) * ease(st.mix);
  if (st.playing) {
    const p = (now - st.playStart) / PLAY_MS;
    st.clock = Math.min(1.2, p);
    if (p >= 1.2) { st.playing = false; ctx.root.classList.add("is-played"); }
    ctx.updateHud(st.clock);
    busy = true;
  }
  return orbitStep(st, now, ctx.reduce.matches) || busy;
}

function orbitStep(st, now, reduced) {
  const orbitScene = !reduced && (st.scene === "terrain" || st.scene === "vehicles");
  const dt = st.lastT ? Math.min(64, now - st.lastT) : 16;
  st.lastT = 0;
  if (orbitScene && now - st.t0 < ORBIT_MS) {
    st.orbit += dt * 0.00005; st.lastT = now;
    return true;
  }
  if (orbitScene) return false;
  if (Math.abs(st.orbit) > 0.0005) { st.orbit *= 0.9; st.lastT = now; return true; }
  st.orbit = 0;
  return false;
}

function newState() {
  return { from: 0, to: 0, mix: 1, t0: 0, dur: 1500, camA: null, camB: null, color: 0, colorA: 0,
    colorB: 0, rise: 0.3, clock: 1.2, playing: false, playStart: 0, orbit: 0, lastT: 0,
    focus: [0, -1, 0], scene: "hero", prevScene: "hero" };
}

/** Start the graphic once the data is in. ctx: root, canvas, labels, hud, gl, DATA, data,
 *  prep, reduce, wide, getScene. */
export function run(ctx) {
  const { root, canvas, gl, DATA, prep, reduce } = ctx;
  const st = newState();
  let raf = 0, hdrOn = false, pin = null;
  const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const view = createView(canvas, ctx.wide, DATA, prep);
  const renderer = createRenderer(gl, prep, DATA, request);
  const labels = createLabels(ctx.labels, DATA, prep);
  ctx.updateHud = createHud(ctx.hud, DATA, prep, ctx.data.slot);
  const currentCam = () => lerpCam(st.camA || st.camB, st.camB, ease(st.mix));

  function draw(k) {
    const cam = lerpCam(st.camA || st.camB, st.camB, k);
    const m = view.matrices(cam, st.orbit);
    const lines = (st.scene === "hero" ? 0 : 1)
      * blend((l) => (MAP_LIKE.includes(l) ? 1 : 0), st.from, st.to, k);
    renderer.draw({ m, points: pointValues(st, k, cam, m, view, prep, hdrOn),
      base: (BASE_A[st.prevScene] ?? 0) * (1 - k) + (BASE_A[st.scene] ?? 0) * k, lines });
    labels.place(view.toScreen(m), view.geo,
      { scene: st.scene, focus: st.focus, pin, settled: k > 0.85 });
  }
  function frame(now) {
    raf = 0;
    const busy = step(st, now, ctx);
    draw(ease(st.mix));
    if (busy) request();
  }
  function resize() {
    view.resize();
    hdrOn = renderer.resize(canvas.width, canvas.height);
    root.dataset.hdr = hdrOn ? "1" : "0";
    request();
  }
  // Your wait: the form lives in setupYou(); the graphic follows its choice.
  function applyFocus() {
    const f = root._you || { group: prep.groupIndex.pothole, district: 0, pin: null };
    st.focus = [1, f.group, f.district];
    pin = f.pin;
    request();
  }
  function goTo(scene, instant) {
    st.from = st.to;
    st.camA = st.camB ? currentCam() : view.sceneCam(scene);
    st.to = LAYOUT[scene] ?? 0; st.camB = view.sceneCam(scene);
    st.colorA = st.color; st.colorB = colorFor(scene);
    st.mix = instant || reduce.matches ? 1 : 0;
    st.t0 = performance.now(); st.lastT = 0;
    st.dur = st.from === st.to ? 900 : 1700;
    st.prevScene = st.scene; st.scene = scene;
    if (scene === "you") applyFocus(); else st.focus = [0, -1, 0];
    request();
  }
  function play() {
    if (reduce.matches) {
      st.clock = 1.2; ctx.updateHud(st.clock); root.classList.add("is-played"); request(); return;
    }
    root.classList.remove("is-played");
    st.playing = true; st.playStart = performance.now(); st.clock = 0; request();
  }
  wire({ ctx, st, goTo, play, resize, applyFocus, request });
}

function wire({ ctx, st, goTo, play, resize, applyFocus, request }) {
  const { root, canvas, reduce, getScene } = ctx;
  root.querySelector(".w3-replay")?.addEventListener("click", () => {
    window.scrollTo({ top: root.offsetTop, behavior: reduce.matches ? "auto" : "smooth" });
    play();
  });
  root.addEventListener("w3:you", () => { if (st.scene === "you") applyFocus(); });
  root.addEventListener("w3:scene", (e) => goTo(e.detail));
  new ResizeObserver(resize).observe(canvas);
  resize();
  goTo(getScene(), true);
  root.classList.add("is-ready");
  ctx.updateHud(st.clock);
  if (getScene() === "hero" || getScene() === "map") play();
  else { st.clock = 1.2; root.classList.add("is-played"); }
  const setClock = (c) => { st.playing = false; st.clock = c; ctx.updateHud(c); request(); };
  // Exposed for the still-image renderer and tests.
  window.__w3 = { goTo, play, setClock, state: st };
}
