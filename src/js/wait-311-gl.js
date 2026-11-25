// WebGL plumbing for /austin-311-wait/: programs, buffers, the HDR target and the
// four draw passes (points, basemap, tone map, district outlines). No dependencies.
import * as S from "./wait-311-shaders.js";

export function program(gl, vs, fs) {
  const make = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export function locate(gl, prog, uniforms, attribs = []) {
  const loc = {};
  for (const name of uniforms) loc[name] = gl.getUniformLocation(prog, name);
  for (const name of attribs) loc[name] = gl.getAttribLocation(prog, name);
  return loc;
}

export function staticBuffer(gl, array) {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
  return b;
}

function texture(gl, filter) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** Bind one vertex attribute from a buffer. */
export function attrib(gl, loc, buffer, size, type = gl.FLOAT) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, type, false, 0, 0);
}

/** Uniform values by length: a number, vec2/3/4, a mat4, or a vec2[10] array. */
export function setUniforms(gl, loc, values) {
  const set = {
    1: (l, v) => gl.uniform1f(l, v), 2: (l, v) => gl.uniform2fv(l, v),
    3: (l, v) => gl.uniform3fv(l, v), 4: (l, v) => gl.uniform4fv(l, v),
    16: (l, v) => gl.uniformMatrix4fv(l, false, v), 20: (l, v) => gl.uniform2fv(l, v)
  };
  for (const [name, v] of Object.entries(values)) {
    set[typeof v === "number" ? 1 : v.length](loc[name], v);
  }
}

const POINT_UNIFORMS = ["uView", "uProj", "uFrom", "uTo", "uMix", "uClock", "uSlots", "uRise",
  "uSize", "uDpr", "uRef", "uColor", "uGain", "uRingOffset", "uLift", "uRowFit", "uHist",
  "uHistCols", "uRows", "uRing", "uFocus"];

/** One point per request; positions and colors come from the vertex shader. */
function pointPass(gl, prep) {
  const prog = program(gl, S.VERT, S.FRAG);
  const loc = locate(gl, prog, POINT_UNIFORMS, ["aMap", "aTR", "aRG", "aMeta"]);
  const attrs = [["aMap", prep.aMap, 2, gl.FLOAT], ["aTR", prep.aTR, 2, gl.UNSIGNED_SHORT],
    ["aRG", prep.aRG, 2, gl.UNSIGNED_SHORT], ["aMeta", prep.aMeta, 4, gl.UNSIGNED_BYTE]]
    .map(([name, arr, size, type]) => ({ loc: loc[name], b: staticBuffer(gl, arr), size, type }));
  return (values) => {
    gl.useProgram(prog);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (const a of attrs) attrib(gl, a.loc, a.b, a.size, a.type);
    setUniforms(gl, loc, values);
    gl.drawArrays(gl.POINTS, 0, prep.n);
    for (const a of attrs) gl.disableVertexAttribArray(a.loc);
  };
}

/** OpenStreetMap water and roads under the points, loaded after the data. */
function basemapPass(gl, DATA, onLoad) {
  const prog = program(gl, S.BASE_VERT, S.BASE_FRAG);
  const loc = locate(gl, prog, ["uView", "uProj", "uSize", "uTex", "uAlpha"], ["aPos"]);
  const quad = staticBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
  let tex = null;
  const img = new Image();
  img.onload = () => {
    tex = texture(gl, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
    onLoad();
  };
  if (DATA.basemap) img.src = DATA.basemap;
  return (m, alpha) => {
    if (!tex || alpha < 0.01) return;
    gl.useProgram(prog);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc.uTex, 0);
    const size = [DATA.mapW, DATA.mapH];
    setUniforms(gl, loc, { uView: m.view, uProj: m.proj, uSize: size, uAlpha: alpha });
    attrib(gl, loc.aPos, quad, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(loc.aPos);
  };
}

/** Council district outlines as thin lines. */
function linePass(gl, DATA) {
  const prog = program(gl, S.LINE_VERT, S.LINE_FRAG);
  const loc = locate(gl, prog, ["uView", "uProj", "uCol"], ["aPos"]);
  const seg = [], hw = DATA.mapW / 2, hh = DATA.mapH / 2;
  for (const o of DATA.outlines) for (const ring of o.rings) {
    ring.forEach(([x1, y1], i) => {
      const [x2, y2] = ring[(i + 1) % ring.length];
      seg.push(x1 - hw, hh - y1, 0, x2 - hw, hh - y2, 0);
    });
  }
  const buf = staticBuffer(gl, new Float32Array(seg));
  return (m, a) => {
    if (a < 0.01) return;
    gl.useProgram(prog);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const col = [0.16 * a, 0.2 * a, 0.28 * a, 0.3 * a];
    setUniforms(gl, loc, { uView: m.view, uProj: m.proj, uCol: col });
    attrib(gl, loc.aPos, buf, 3);
    gl.drawArrays(gl.LINES, 0, seg.length / 3);
    gl.disableVertexAttribArray(loc.aPos);
  };
}

/** Texture types the device can render into, best first. */
function hdrTypes(gl) {
  const types = [];
  const half = gl.getExtension("OES_texture_half_float");
  gl.getExtension("EXT_color_buffer_half_float");
  if (half) types.push(half.HALF_FLOAT_OES);
  if (gl.getExtension("OES_texture_float") && gl.getExtension("WEBGL_color_buffer_float")) {
    types.push(gl.FLOAT);
  }
  return types;
}

/** A half-float target the points add light into; fb stays null when the device has none. */
function hdrTarget(gl) {
  const types = hdrTypes(gl);
  const target = { fb: null, tex: null };
  const tryType = (type, w, h) => {
    const tex = texture(gl, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (ok) return { fb, tex };
    gl.deleteTexture(tex); gl.deleteFramebuffer(fb);
    return null;
  };
  target.resize = (w, h) => {
    if (target.fb) { gl.deleteTexture(target.tex); gl.deleteFramebuffer(target.fb); }
    target.fb = null; target.tex = null;
    for (const type of types) {
      const made = tryType(type, w, h);
      if (made) { Object.assign(target, made); return true; }
    }
    return false;
  };
  return target;
}

/** Hue-preserving tone map of the HDR target onto the screen. */
function tonePass(gl) {
  const prog = program(gl, S.TONE_VERT, S.TONE_FRAG);
  const loc = locate(gl, prog, ["uSrc", "uExposure"], ["aPos"]);
  const tri = staticBuffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]));
  return (tex) => {
    gl.useProgram(prog);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc.uSrc, 0); gl.uniform1f(loc.uExposure, 1.6);
    attrib(gl, loc.aPos, tri, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(loc.aPos);
  };
}

/**
 * All passes for one frame. f = { m, points (uniform values), base, lines }:
 * points go into the HDR target (when there is one), then basemap, tone map, outlines.
 */
export function createRenderer(gl, prep, DATA, onAsset) {
  const points = pointPass(gl, prep), base = basemapPass(gl, DATA, onAsset);
  const lines = linePass(gl, DATA), tone = tonePass(gl), hdr = hdrTarget(gl);
  let hex = null;   // the hex-column pass, added once its mesh is built
  const draw = (f) => {
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    if (hdr.fb) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.fb);
      gl.clear(gl.COLOR_BUFFER_BIT);
      points(f.points);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    base(f.m, f.base);
    if (hdr.fb) tone(hdr.tex); else points(f.points);
    if (hex && f.hex) hex({ m: f.m, ...f.hex });
    lines(f.m, f.lines);
  };
  /** Second pass: a boxed zoom, in device pixels, y up from the bottom of the canvas. */
  const drawInset = (f, r) => {
    gl.enable(gl.SCISSOR_TEST);
    gl.viewport(r.x, r.y, r.w, r.h);
    gl.scissor(r.x, r.y, r.w, r.h);
    gl.clearColor(0.02, 0.03, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    base(f.m, f.base);
    points(f.points);
    lines(f.m, f.lines);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  };
  const resize = (w, h) => { gl.viewport(0, 0, w, h); return hdr.resize(w, h); };
  const setHex = (pass) => { hex = pass; };
  return { draw, resize, setHex, drawInset };
}

/* ---------- a small matrix kit ---------- */
export function perspective(fovy, aspect, near, far, sx, sy) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, -sx, -sy, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0]);
}

const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const cross = (a, b) =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function lookAt(eye, center, up) {
  const z = norm([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
  const x = norm(cross(up, z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}

export function apply(m, v) {
  const [x, y, z] = v;
  return [0, 1, 2, 3].map((i) => m[i] * x + m[4 + i] * y + m[8 + i] * z + m[12 + i]);
}
