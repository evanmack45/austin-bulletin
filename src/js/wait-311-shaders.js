// GLSL for /austin-311-wait/. Each point's position in every scene is computed in
// VERT from its attributes, so moving between scenes only changes uniforms.

// The wait color ramp, shared by the points and the columns.
const RAMP = `
vec3 ramp(float c) {
  // 1 min, 1 hour, 1 day, 1 week, 1 month, 3 months+ on the log code scale
  // One sequential scale: quick closes in the background's blue, long waits in the
  // headline yellow, so the slow tail stands out of the crowd.
  vec3 c0 = vec3(0.16, 0.27, 0.52);
  vec3 c1 = vec3(0.22, 0.36, 0.64);
  vec3 c2 = vec3(0.36, 0.45, 0.64);
  vec3 c3 = vec3(0.95, 0.78, 0.35);
  vec3 c4 = vec3(1.0, 0.90, 0.43);
  vec3 c5 = vec3(1.0, 0.97, 0.78);
  float h = 40.0, d = 70.97, w = 89.06, m = 101.68, q = 112.0;
  if (c < h) return mix(c0, c1, c / h);
  if (c < d) return mix(c1, c2, (c - h) / (d - h));
  if (c < w) return mix(c2, c3, (c - d) / (w - d));
  if (c < m) return mix(c3, c4, (c - w) / (m - w));
  return mix(c4, c5, clamp((c - m) / (q - m), 0.0, 1.0));
}
`;

export const VERT = `
precision highp float;
attribute vec2 aMap;      // world x, y of the map position
attribute vec2 aTR;       // time slot, rank in the all-requests pile
attribute vec2 aRG;       // rank in its problem's pile, row (255 = not shown)
attribute vec4 aMeta;     // wait code, group, district, random 0..255
uniform mat4 uView, uProj;
uniform float uFrom, uTo, uMix, uClock, uSlots, uRise, uSize, uDpr, uRef, uColor, uGain;
uniform vec4 uHist;       // left, bottom, bin width, dot spacing
uniform vec2 uHistCols;   // columns per bin, bins
uniform vec4 uRows;       // left, top, row height, dot spacing
uniform vec3 uRing;       // inner radius, outer radius, day count
uniform vec3 uFocus;      // on (0/1), group (-1 any), district (0 any)
uniform float uRingOffset, uLift;
uniform vec2 uRowFit[10]; // per row: dots across each bin, dot spacing
varying vec4 vColor;

${RAMP}
// Returns xyz and, in w, a visibility 0..1.
vec4 place(float id) {
  float code = aMeta.x, grp = aMeta.y, rnd = aMeta.w / 255.0;
  bool closed = code <= 124.0, open = code == 126.0;
  bool located = aMap.x > -50.0;
  float wn = closed ? code / 124.0 : (open ? 1.0 : 0.0);
  if (id < 0.5) { // map, flat
    return vec4(aMap, 0.0, located ? 1.0 : 0.0);
  }
  if (id > 6.5) { // the ending: only duplicates (gray) and still-open requests (white)
    return vec4(aMap, 0.0, located ? (closed ? 0.06 : 1.0) : 0.0);
  }
  if (id < 1.5 || id > 5.5) { // terrain (1), your wait (6)
    // Terrain: the points lie dim on the ground under the hex columns.
    // Your wait: waits past about a week rise, so the slow places stand up.
    if (id < 1.5) return vec4(aMap, 0.0, located ? 0.22 : 0.0);
    float z = uRise * pow(clamp((wn - 0.7) / 0.3, 0.0, 1.0), 1.5);
    return vec4(aMap, z, located ? 1.0 : 0.0);
  }
  if (id < 2.5) { // the pile of every request by wait
    float bins = uHistCols.y;
    float bin = closed ? floor(code / 125.0 * bins) : bins + 1.5;
    float cols = uHistCols.x, r = aTR.y;
    float x = uHist.x + (bin + 0.5) * uHist.z + (mod(r, cols) - (cols - 1.0) * 0.5) * uHist.w;
    float y = uHist.y + (floor(r / cols) + 0.5) * uHist.w;
    return vec4(x, y, 0.0, (closed || open) ? 1.0 : 0.0);
  }
  if (id < 3.5) { // one pile per problem
    if (aRG.y > 200.0 || !closed) return vec4(aMap * 0.2, 0.0, 0.0);
    float bins = uHistCols.y;
    float bin = floor(code / 125.0 * bins);
    vec2 fit = uRowFit[int(aRG.y)];
    float cols = fit.x, sp = fit.y, r = aRG.x;
    float x = uRows.x + (bin + 0.5) * uHist.z + (mod(r, cols) - (cols - 1.0) * 0.5) * sp;
    float y = uRows.y - (aRG.y + 1.0) * uRows.z + (floor(r / cols) + 0.5) * sp;
    return vec4(x, y, 0.0, 1.0);
  }
  if (id < 4.5) { // abandoned vehicles: flat and dim under their hex columns
    bool v = grp == 7.0;
    return vec4(aMap, 0.0, located ? (v ? 0.5 : 0.1) : 0.0);
  }
  // 5: a year as rings. Each ring is a week (Monday at the top, clockwise);
  // radius = week from the center out, angle = time of the week.
  float minutes = aTR.x * 15.0 + uRingOffset + rnd * 15.0;
  float week = floor(minutes / 10080.0);
  float a = mod(minutes, 10080.0) / 10080.0 * 6.2831853;
  float rad = uRing.x + (week + 0.1 + rnd * 0.75) / uRing.z * (uRing.y - uRing.x);
  return vec4(sin(a) * rad, cos(a) * rad, 0.0, 1.0);
}

// Rows have their own dot spacing; dots shrink or grow to match.
float rowScale() {
  if (aRG.y > 200.0) return 1.0;
  float s = uRowFit[int(aRG.y)].y / uRows.w;
  return mix(uFrom == 3.0 ? s : 1.0, uTo == 3.0 ? s : 1.0, uMix);
}

void main() {
  vec4 a = place(uFrom), b = place(uTo);
  float k = uMix;
  vec3 pos = mix(a.xyz, b.xyz, k);
  float vis = mix(a.w, b.w, k);
  float tnorm = aTR.x / uSlots;
  float age = uClock - tnorm;
  if (age < 0.0) vis = 0.0;
  float flash = uClock < 1.05 ? smoothstep(0.012, 0.0, age) : 0.0;
  float code = aMeta.x;
  vec3 col = code <= 124.0 ? ramp(code) : (code == 126.0 ? vec3(1.0) : vec3(0.42, 0.47, 0.58));
  vec3 base = vec3(0.62, 0.76, 1.0);
  col = mix(base, col, uColor);
  // Rings: weekend requests (Saturday and Sunday) are tinted yellow.
  float ringK = (abs(uFrom - 5.0) < 0.5 ? 1.0 - k : 0.0) + (abs(uTo - 5.0) < 0.5 ? k : 0.0);
  float weekMin = mod(aTR.x * 15.0 + uRingOffset, 10080.0);
  col = mix(col, vec3(1.0, 0.90, 0.43), ringK * step(7200.0, weekMin) * 0.85);
  float focus = 1.0;
  if (uFocus.x > 0.5) {
    bool g = uFocus.y < 0.0 || aMeta.y == uFocus.y;
    bool d = uFocus.z < 0.5 || aMeta.z == uFocus.z;
    focus = (g && d) ? uLift : 0.025;
  }
  vec4 clip = uProj * uView * vec4(pos, 1.0);
  gl_Position = clip;
  float grow = mix(1.0, 1.35, step(0.5, focus) * uFocus.x);
  float size = uSize * (1.0 + flash * 2.5) * grow * rowScale();
  gl_PointSize = max(1.0, size * uDpr * uRef / clip.w);
  float alpha = vis * focus * uGain * (1.0 + flash * 2.0);
  col = mix(col, vec3(1.0), flash * 0.7);
  vColor = vec4(col * alpha, alpha);
}`;

export const FRAG = `
precision mediump float;
varying vec4 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  float soft = smoothstep(0.25, 0.08, r);
  gl_FragColor = vColor * soft;
}`;

export const TONE_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
// Hue-preserving tone map: c / L * (1 - exp(-L * k)), output premultiplied.
export const TONE_FRAG = `
precision mediump float;
uniform sampler2D uSrc;
uniform float uExposure;
varying vec2 vUv;
void main() {
  vec3 a = texture2D(uSrc, vUv).rgb;
  float L = max(max(a.r, a.g), a.b) + 1e-5;
  vec3 c = pow(a / L * (1.0 - exp(-L * uExposure)), vec3(0.85));
  gl_FragColor = vec4(c, max(max(c.r, c.g), c.b));
}`;

// Basemap: OpenStreetMap water and roads, pre-rendered into one gray channel
// (water 0.65-1, roads below), drawn as a textured quad under the points.
export const BASE_VERT = `
precision highp float;
attribute vec2 aPos;
uniform mat4 uView, uProj;
uniform vec2 uSize;
varying vec2 vUv;
void main() {
  vUv = aPos;
  vec2 xy = vec2((aPos.x - 0.5) * uSize.x, (0.5 - aPos.y) * uSize.y);
  gl_Position = uProj * uView * vec4(xy, -0.002, 1.0);
}`;
export const BASE_FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float v = texture2D(uTex, vUv).r;
  vec3 water = vec3(0.11, 0.24, 0.42), road = vec3(0.30, 0.36, 0.50);
  vec3 c = v > 0.63 ? water : road;
  float a = (v > 0.63 ? 0.85 : v / 0.59 * 0.55) * uAlpha;
  gl_FragColor = vec4(c * a, a);
}`;

export const LINE_VERT = `
precision highp float;
attribute vec3 aPos;
uniform mat4 uView, uProj;
void main() { gl_Position = uProj * uView * vec4(aPos, 1.0); }`;
export const LINE_FRAG = `
precision mediump float;
uniform vec4 uCol;
void main() { gl_FragColor = uCol; }`;

// Hex columns: one prism per hexagon about 1 km across. Mode 1 grows with the
// running count of requests as the year plays; mode 2 is the count that took
// more than a week, colored by their median wait. Mode 0 is flat and hidden.
export const HEX_VERT = `
precision highp float;
attribute vec3 aPos;      // x, y, and 1 on the top face
attribute float aShade;   // light on this face
attribute vec4 aCumA, aCumB, aCumC; // running count at the end of each month, 0..1
attribute vec4 aHex;      // slow count, its median code / 124, vehicle count, its median
uniform mat4 uView, uProj;
uniform float uA, uB, uMix, uClock, uH;
varying vec4 vColor;
${RAMP}
float month(float i) {
  if (i < 0.5) return 0.0;
  if (i < 4.5) return i < 1.5 ? aCumA.x : i < 2.5 ? aCumA.y : i < 3.5 ? aCumA.z : aCumA.w;
  if (i < 8.5) return i < 5.5 ? aCumB.x : i < 6.5 ? aCumB.y : i < 7.5 ? aCumB.z : aCumB.w;
  return i < 9.5 ? aCumC.x : i < 10.5 ? aCumC.y : i < 11.5 ? aCumC.z : aCumC.w;
}
float heightOf(float mode) {
  if (mode < 0.5) return 0.0;
  if (mode < 1.5) {
    float f = clamp(uClock, 0.0, 1.0) * 12.0, m = floor(f);
    return mix(month(m), month(min(12.0, m + 1.0)), f - m);
  }
  return 0.55 * (mode < 2.5 ? aHex.x : aHex.z);  // shorter than the hero skyline
}
vec3 colorOf(float mode, float h) {
  if (mode < 1.5) {
    float t = clamp(sqrt(h) * 1.8, 0.0, 1.0);
    vec3 lo = vec3(0.12, 0.3, 1.0), mid = vec3(0.3, 0.85, 1.0), hi = vec3(0.95, 0.98, 1.0);
    return t < 0.5 ? mix(lo, mid, t * 2.0) : mix(mid, hi, t * 2.0 - 1.0);
  }
  return ramp((mode < 2.5 ? aHex.y : aHex.w) * 124.0);
}
void main() {
  float ha = heightOf(uA), hb = heightOf(uB);
  float h = mix(ha, hb, uMix);
  float vis = mix(step(0.5, uA), step(0.5, uB), uMix) * smoothstep(0.0, 0.01, h);
  vec3 col = mix(colorOf(uA, ha), colorOf(uB, hb), uMix);
  gl_Position = uProj * uView * vec4(aPos.xy, aPos.z * h * uH, 1.0);
  // Sides darken toward the ground, so each column glows from the top down.
  float lift = mix(0.3, 1.0, aPos.z);
  vColor = vec4(col * aShade * lift * vis, vis);
}`;

export const HEX_FRAG = `
precision mediump float;
varying vec4 vColor;
void main() { gl_FragColor = vColor; }`;
