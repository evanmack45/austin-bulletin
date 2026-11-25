// Viewport geometry and cameras for /austin-311-wait/: where the charts sit inside
// the part of the screen the captions leave free, and the camera for each scene.
import { perspective, lookAt, apply } from "./wait-311-gl.js";
import { BINS } from "./wait-311-prep.js";

const FOV = (32 * Math.PI) / 180;
const CAM_OF = { hero: "hero", map: "map", color: "map", terrain: "terrain", hist: "pile",
  rows: "pile", vehicles: "vehicles", rings: "ring", you: "you", end: "map" };

// Dots fill a bin's width in as many columns as keep the pile under its height.
const fillFor = (binW) => (count, height) => {
  const cols = Math.max(1, Math.ceil(Math.sqrt((count * binW * 0.92) / height)));
  return { cols, s: (binW * 0.92) / cols };
};

/** The pile charts live in a box with the safe area's aspect, 1 unit tall. */
function geometry(aspect, prep, rows) {
  const boxH = 1, boxW = aspect;
  const binW = (boxW * 0.86) / (BINS + 3);
  const fill = fillFor(binW);
  const rowsH = (boxH * 0.9) / rows;
  // Each row's pile is scaled to its own tallest bin, leaving room for its label.
  const rowFit = new Float32Array(20);
  prep.rowMax.forEach((max, i) => {
    const f = fill(Math.max(1, max), rowsH * 0.6);
    rowFit[i * 2] = f.cols; rowFit[i * 2 + 1] = f.s;
  });
  const rowS = Math.max(...prep.rowMax.map((_, i) => rowFit[i * 2 + 1]));
  return { boxW, boxH, binW, left: -boxW * 0.43, bottom: -boxH * 0.42,
    hist: fill(prep.maxBin, boxH * 0.78), rows: { s: rowS }, rowFit, rowsH, top: boxH * 0.45 };
}

/** Cameras: target, tilt, rotation, and the world size to fit in the safe area. */
function cameras(DATA, geo) {
  const map = { t: [0, 0, 0], tilt: 0, rot: 0, w: DATA.mapW * 1.02, h: DATA.mapH * 1.02 };
  const terrain = { t: [0, -0.04, 0.04], tilt: 0.92, rot: -0.3, w: DATA.mapW, h: DATA.mapH * 0.9 };
  // The hero looks across the city from the south, so the columns read as a skyline.
  const hero = { t: [0, 0.02, 0.06], tilt: 0.95, rot: -0.32,
    w: DATA.mapW * 0.98, h: DATA.mapH * 1.0 };
  return { map, terrain, hero,
    pile: { t: [0, 0, 0], tilt: 0, rot: 0, w: geo.boxW, h: geo.boxH },
    ring: { t: [0, 0, 0], tilt: 0, rot: 0, w: 2.5, h: 2.5 },
    vehicles: { ...terrain, tilt: 0.85, rot: 0.25 }, you: { ...terrain, tilt: 0.6, rot: -0.15 } };
}

export const lerpCam = (a, b, k) => ({ t: a.t.map((v, i) => v + (b.t[i] - v) * k),
  tilt: a.tilt + (b.tilt - a.tilt) * k, rot: a.rot + (b.rot - a.rot) * k,
  w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k });

export function createView(canvas, wide, DATA, prep) {
  const v = { wide, W: 1, H: 1, dpr: 1, safe: { x: 0, y: 0, w: 1, h: 1 }, geo: {}, cams: {} };
  v.resize = () => {
    v.dpr = Math.min(devicePixelRatio || 1, 2);
    const W = (v.W = canvas.clientWidth), H = (v.H = canvas.clientHeight);
    canvas.width = Math.round(W * v.dpr); canvas.height = Math.round(H * v.dpr);
    // Phone: the top half, above the captions. Desktop: right of the captions.
    v.safe = wide.matches ? { x: W * 0.36, y: H * 0.1, w: W * 0.6, h: H * 0.8 }
      : { x: W * 0.05, y: H * 0.085, w: W * 0.9, h: H * 0.46 };
    v.geo = geometry(v.safe.w / v.safe.h, prep, DATA.rowKeys.length);
    v.cams = cameras(DATA, v.geo);
  };
  v.sceneCam = (scene) => v.cams[CAM_OF[scene] || "map"];
  /** View and projection for camera c, centered on the safe area by a lens shift. */
  v.matrices = (c, orbit) => {
    const { W, H, safe } = v, aspect = W / H, tan = Math.tan(FOV / 2);
    const fitH = c.h / ((safe.h / H) * 2 * tan), fitW = c.w / ((safe.w / W) * aspect * 2 * tan);
    const dist = Math.max(fitH, fitW) * 1.04;
    const ncx = ((safe.x + safe.w / 2) / W) * 2 - 1, ncy = 1 - ((safe.y + safe.h / 2) / H) * 2;
    const rot = c.rot + orbit, s = Math.sin(c.tilt);
    const eye = [c.t[0] + dist * s * Math.sin(rot), c.t[1] - dist * s * Math.cos(rot),
      c.t[2] + dist * Math.cos(c.tilt)];
    const up = [-Math.sin(rot), Math.cos(rot), 0];
    return { view: lookAt(eye, c.t, up), dist,
      proj: perspective(FOV, aspect, dist * 0.05, dist * 4, ncx, ncy) };
  };
  v.toScreen = (m) => (p) => {
    const c = apply(m.proj, apply(m.view, p));
    return [((c[0] / c[3]) * 0.5 + 0.5) * v.W, (1 - ((c[1] / c[3]) * 0.5 + 0.5)) * v.H];
  };
  return v;
}
