// Hex columns for /austin-311-wait/: the located requests binned into hexagons
// (radius DATA.hexR, about 1 km across), built once into a prism mesh.
import { LEVELS, minutesCode } from "./wait-311-core.js";
import { program, locate, staticBuffer, attrib, setUniforms } from "./wait-311-gl.js";
import { HEX_VERT, HEX_FRAG } from "./wait-311-shaders.js";

const SLOW = minutesCode(7 * 1440);  // a closed request that took more than a week
const MIN_COUNT = 3;                 // smaller hexagons are left out of the mesh
// Slow-request columns show a share, so they need enough closed requests to mean something.
export const RATE_MIN = 30, RATE_TOP = 0.5;   // 50% or more took over a week = full height
// Vehicle columns show a median wait, from 3 days (flat) to 60 days (full height).
export const VEH_MIN = 5;
const VEH_LO = minutesCode(3 * 1440), VEH_HI = minutesCode(60 * 1440);
const SQ3 = Math.sqrt(3);

/** Axial coordinates of the pointy-top hexagon holding (x, y). */
export function hexOf(x, y, r) {
  const q = ((SQ3 / 3) * x - y / 3) / r, s = ((2 / 3) * y) / r;
  let rx = Math.round(q), rz = Math.round(s), ry = Math.round(-q - s);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - s), dy = Math.abs(ry + q + s);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dz > dy) rz = -rx - ry;
  return [rx, rz];
}

const centerOf = (q, s, r) => [r * SQ3 * (q + s / 2), r * 1.5 * s];

function median(hist, n) {
  let c = 0;
  for (let i = 0; i < hist.length; i++) { c += hist[i]; if (c * 2 >= n) return i; }
  return 0;
}

function newBin(q, s) {
  return { q, s, total: 0, closed: 0, slow: 0, veh: 0, months: new Uint32Array(12),
    slowHist: new Uint32Array(LEVELS + 1), vehHist: new Uint32Array(LEVELS + 1) };
}

function count(b, prep, i, vehicle) {
  const code = prep.aMeta[i * 4];
  b.total++;
  b.months[Math.min(11, Math.floor((prep.aTR[i * 2] / prep.slots) * 12))]++;
  if (code > LEVELS) return;
  b.closed++;
  if (code > SLOW) { b.slow++; b.slowHist[code]++; }
  if (prep.aMeta[i * 4 + 1] === vehicle) { b.veh++; b.vehHist[code]++; }
}

/** Count every located request into its hexagon. */
export async function binHexes(prep, r, vehicle) {
  const bins = new Map();
  for (let i = 0; i < prep.n; i++) {
    if (i && !(i & 0xffff)) await new Promise((done) => setTimeout(done));
    const x = prep.aMap[i * 2], y = prep.aMap[i * 2 + 1];
    if (x < -50) continue;
    const [q, s] = hexOf(x, y, r), key = q * 65536 + s;
    if (!bins.has(key)) bins.set(key, newBin(q, s));
    count(bins.get(key), prep, i, vehicle);
  }
  return [...bins.values()].filter((b) => b.total >= MIN_COUNT);
}

const FACE_SHADE = [0.62, 0.42, 0.3, 0.38, 0.55, 0.72];  // light from the upper left

function pushVertex(m, x, y, top, shade, h) {
  m.pos.push(x, y, top); m.shade.push(shade);
  m.cum.push(...h.cum); m.hex.push(h.slow, h.code, h.veh, h.vehCode);
}

function pushPrism(m, h, cx, cy, r) {
  const corner = (k) => {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  for (let k = 0; k < 6; k++) {
    const [x1, y1] = corner(k), [x2, y2] = corner(k + 1);
    for (const [x, y] of [[cx, cy], [x1, y1], [x2, y2]]) pushVertex(m, x, y, 1, 1, h);
    const f = FACE_SHADE[k];
    for (const [x, y, t] of [[x1, y1, 0], [x2, y2, 0], [x2, y2, 1], [x1, y1, 0], [x2, y2, 1],
      [x1, y1, 1]]) pushVertex(m, x, y, t, f, h);
  }
}

/** Prism mesh: 54 vertices per hexagon, heights normalized to the tallest. */
/** The busiest hex and its center, for the hero label. */
export function tallest(bins, r) {
  const bin = bins.reduce((a, b) => (b.total > a.total ? b : a));
  return { bin, center: centerOf(bin.q, bin.s, r) };
}

/** Share of a hexagon's closed requests that took more than a week (0 if too few). */
export const slowShare = (b) => (b.closed >= RATE_MIN ? b.slow / b.closed : 0);
/** Column height for a median vehicle wait code: 3 days flat, 60 days full. */
export const vehHeight = (c) => Math.max(0.03, (c - VEH_LO) / (VEH_HI - VEH_LO));

export function hexMesh(bins, r) {
  const maxTotal = Math.max(...bins.map((b) => b.total));
  const byte = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  const code = (hist, n) => byte(median(hist, n) / LEVELS);
  const m = { pos: [], shade: [], cum: [], hex: [] };
  for (const b of bins) {
    let c = 0;
    const cum = [...b.months].map((v) => Math.round(((c += v) / maxTotal) * 65535));
    const h = { cum, slow: byte(slowShare(b) / RATE_TOP), code: code(b.slowHist, b.slow),
      veh: b.veh >= VEH_MIN ? byte(vehHeight(median(b.vehHist, b.veh))) : 0,
      vehCode: code(b.vehHist, b.veh) };
    const [cx, cy] = centerOf(b.q, b.s, r);
    pushPrism(m, h, cx, cy, r * 0.88);
  }
  return { count: m.shade.length, maxTotal, pos: new Float32Array(m.pos),
    shade: new Float32Array(m.shade), cum: new Uint16Array(m.cum), hex: new Uint8Array(m.hex) };
}

/** The draw pass. f = { m, a, b, mix, clock, h } (modes a and b, height in world units). */
export function hexPass(gl, mesh) {
  const prog = program(gl, HEX_VERT, HEX_FRAG);
  const loc = locate(gl, prog, ["uView", "uProj", "uA", "uB", "uMix", "uClock", "uH"],
    ["aPos", "aShade", "aCumA", "aCumB", "aCumC", "aHex"]);
  const pos = staticBuffer(gl, mesh.pos), shade = staticBuffer(gl, mesh.shade);
  const cum = staticBuffer(gl, mesh.cum), hex = staticBuffer(gl, mesh.hex);
  const cumAttrs = ["aCumA", "aCumB", "aCumC"].map((n) => loc[n]);
  const bindCum = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, cum);
    cumAttrs.forEach((l, i) => {
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 4, gl.UNSIGNED_SHORT, true, 24, i * 8);
    });
  };
  const all = [loc.aPos, loc.aShade, loc.aHex, ...cumAttrs];
  return (f) => {
    if (f.a === 0 && f.b === 0) return;
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    attrib(gl, loc.aPos, pos, 3); attrib(gl, loc.aShade, shade, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, hex);
    gl.enableVertexAttribArray(loc.aHex);
    gl.vertexAttribPointer(loc.aHex, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    bindCum();
    setUniforms(gl, loc, { uView: f.m.view, uProj: f.m.proj, uA: f.a, uB: f.b, uMix: f.mix,
      uClock: f.clock, uH: f.h });
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    for (const l of all) gl.disableVertexAttribArray(l);
    gl.disable(gl.DEPTH_TEST);
  };
}
