// HTML labels pinned to world positions in /austin-311-wait/. Each label keeps a
// pos(geo) function, so placing them is one loop for every scene.
import { fmtDays, fmtMonth, minutesCode, shortWait } from "./wait-311-core.js";
import { BINS } from "./wait-311-prep.js";

const TICKS = [["1 min", 1], ["1 hr", 60], ["1 day", 1440], ["1 wk", 10080], ["1 mo.", 43200]];
const xOf = (geo, code) => geo.left + (code / 125) * BINS * geo.binW;
const fixed = (p) => () => p;

function districtLabels(add, DATA, prep) {
  const veh = DATA.groups[prep.groupIndex.vehicle];
  const hw = DATA.mapW / 2, hh = DATA.mapH / 2;
  for (const o of DATA.outlines) {
    const v = veh.byDistrict[o.district - 1];
    const html = `<b>D${o.district}</b><span>${shortWait(v.medianDays)}</span>`;
    const el = add("districts", html, "is-district", fixed([o.label[0] - hw, hh - o.label[1], 0]));
    el._d = o.district;
  }
}

function axisLabels(add, DATA) {
  for (const [label, minutes] of TICKS) {
    const code = minutesCode(minutes);
    add("axis", label, "is-tick", (g) => [xOf(g, code), g.bottom - 0.035, 0]);
  }
  const med = minutesCode(DATA.overall.medianDays * 1440);
  add("axis", `Half closed within <b>${fmtDays(DATA.overall.medianDays)}</b>`, "is-median",
    (g) => [xOf(g, med), g.bottom + 0.86, 0]);
  const guess = add("axis", "Your guess", "is-guess",
    (g) => [xOf(g, guess._code), g.bottom + 0.6, 0]);
  guess._code = null;
  add("axis", `Still open<br><b>${DATA.open.toLocaleString("en-US")}</b>`, "is-open",
    (g) => [g.left + (BINS + 2) * g.binW, g.bottom - 0.04, 0]);
}

function rowLabels(add, DATA, prep) {
  DATA.rowKeys.forEach((key, i) => {
    const g = DATA.groups[prep.groupIndex[key]];
    const top = (geo) => geo.top - i * geo.rowsH;
    const n = `<i>${g.closed.toLocaleString("en-US")} closed</i>`;
    add("rows", `${g.label} <b>${fmtDays(g.medianDays)}</b> ${n}`, "is-row",
      (geo) => [geo.left, top(geo) - 0.004, 0]);
    const code = minutesCode(g.medianDays * 1440);
    add("rows", "", "is-rowtick", (geo) => [xOf(geo, code), top(geo) - geo.rowsH + 0.004, 0]);
  });
}

function ringLabels(add, DATA, prep) {
  const out = (a, r) => fixed([Math.sin(a) * r, Math.cos(a) * r, 0]);
  // Saturday and Sunday are the last two sevenths of each ring, tinted yellow.
  add("rings", "Weekends", "is-sector is-weekend", out((6 / 7) * Math.PI * 2, 1.13));
  add("rings", "Weekdays", "is-sector", out((2.5 / 7) * Math.PI * 2, 1.13));
  const from = Date.parse(`${DATA.from}T00:00:00Z`);
  for (const [i, mk] of (DATA.marks || []).entries()) {
    // Noon on that day, placed the way the shader places a request; the name sits
    // outside the disc at the same angle, nudged apart when two share a weekday.
    const minutes = (Date.parse(`${mk.date}T12:00:00Z`) - from) / 60000 + prep.ringOffset;
    const week = Math.floor(minutes / 10080), a = ((minutes % 10080) / 10080) * Math.PI * 2;
    const r = 0.3 + ((week + 0.5) / prep.ringWeeks) * 0.7;
    add("rings", "", "is-markdot", out(a, r));
    const side = i % 2 ? 1 : -1;
    add("rings", mk.label, `is-mark-out ${side < 0 ? "is-left" : ""}`, out(a - side * 0.3, 1.14));
  }
  add("rings", fmtMonth(DATA.from), "is-ringdate", fixed([0, 0, 0]));
  add("rings", fmtMonth(DATA.to), "is-ringdate is-outer", fixed([0, 1.02, 0]));
}

// Landmarks for reading the map; coordinates checked against a street map.
const PLACES = [["Downtown", 30.2700, -97.7431], ["Airport", 30.1975, -97.6664]];

/** World position of a latitude/longitude, the inverse of the data script's projection. */
export function worldOf(DATA, lat, lon) {
  const f = DATA.frame, s = DATA.kmPerUnit / 111.32;
  const k = Math.cos(((f.minLat + f.maxLat) / 2) * Math.PI / 180);
  return [((lon - f.minLon) * k) / s - DATA.mapW / 2, DATA.mapH / 2 - (f.maxLat - lat) / s, 0];
}

function placeLabels(add, DATA) {
  for (const [name, lat, lon] of PLACES) {
    add("places", name, "is-place", fixed(worldOf(DATA, lat, lon)));
  }
}

/** Push overlapping labels (centered at points, with [w, h] sizes) apart vertically. */
export function spread(points, sizes) {
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) separate(points, sizes, i, j);
    }
  }
  return points;
}

function separate(points, sizes, i, j) {
  const [a, b] = [points[i], points[j]];
  const ox = (sizes[i][0] + sizes[j][0]) / 2 - Math.abs(a[0] - b[0]);
  const oy = (sizes[i][1] + sizes[j][1]) / 2 - Math.abs(a[1] - b[1]);
  if (ox <= 0 || oy <= 0) return;
  const dir = a[1] <= b[1] ? 1 : -1;
  points[i] = [a[0], a[1] - (dir * oy) / 2];
  points[j] = [b[0], b[1] + (dir * oy) / 2];
}

const byValue = (list) => list.filter((x) => x.value !== null).sort((a, b) => a.value - b.value);
const ends = (list) => { const s = byValue(list); return [s.at(-1).d, s[0].d]; };

/** Which district labels to show and what they say: { key, text(d), only }. */
export function districtPlan(DATA, prep, v) {
  if (v.scene === "terrain") {
    const share = (d) => DATA.overWeek[d - 1].share;
    const list = DATA.overWeek.map((x) => ({ d: x.district, value: x.share }));
    return { key: "terrain", text: (d) => `${Math.round(share(d) * 100)}%`, only: ends(list) };
  }
  const group = v.scene === "you" ? v.focus[1] : prep.groupIndex.vehicle;
  const rows = DATA.groups[group].byDistrict;
  const text = (d) => (rows[d - 1].closed ? fmtDays(rows[d - 1].medianDays) : "–");
  const list = rows.map((x) => ({ d: x.district, value: x.closed ? x.medianDays : null }));
  if (v.scene === "vehicles") return { key: "vehicles", text, only: ends(list) };
  // Your wait: only the chosen district is labeled; "All of Austin" leaves the map bare.
  return { key: `you:${group}`, text, only: [v.focus[2]] };
}

export function createLabels(container, DATA, prep) {
  const sets = { districts: [], axis: [], rows: [], rings: [], places: [], tower: [] };
  const add = (set, html, cls, pos) => {
    const el = document.createElement("div");
    el.className = `w3-lbl ${cls}`; el.innerHTML = html; el._pos = pos;
    container.append(el); sets[set].push(el);
    return el;
  };
  districtLabels(add, DATA, prep);
  axisLabels(add, DATA);
  rowLabels(add, DATA, prep);
  ringLabels(add, DATA, prep);
  placeLabels(add, DATA);
  const pin = document.createElement("div");
  pin.className = "w3-lbl is-pin"; pin.hidden = true;
  container.append(pin);
  const hw = DATA.mapW / 2, hh = DATA.mapH / 2;
  let districtKey = "";
  const sizes = new Map();
  const sizeOf = (el) => {
    if (!sizes.has(el)) sizes.set(el, [el.offsetWidth + 10, el.offsetHeight + 4]);
    return sizes.get(el);
  };
  let only = null;

  // District labels follow the scene: slow-request shares in the 3D view, abandoned-vehicle
  // medians, or the chosen problem's medians. On a phone only the extremes (or your
  // district) are labeled, so the downtown districts don't pile up.
  const setDistricts = (v) => {
    const plan = districtPlan(DATA, prep, v);
    only = plan.only;
    if (plan.key === districtKey) return;
    districtKey = plan.key;
    sizes.clear();
    for (const el of sets.districts) {
      el.innerHTML = `<b>D${el._d}</b><span>${plan.text(el._d)}</span>`;
    }
  };
  const moveTo = (el, [x, y]) => {
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };
  const placeSet = (els, on, toScreen, geo, v) => {
    const at = on ? els.map((el) => toScreen(el._pos(geo))) : [];
    const keep = (el) => el._code !== null && !(el._d && only && !only.includes(el._d));
    if (on && els[0]?._d) {
      const kept = els.map(keep);
      const moved = spread(at.filter((_, i) => kept[i]), els.filter(keep).map(sizeOf));
      els.forEach((_, i) => { if (kept[i]) at[i] = moved.shift(); });
    }
    els.forEach((el, i) => {
      const shown = on && keep(el);
      el.classList.toggle("is-on", shown);
      if (shown) moveTo(el, at[i]);
      if (el._d) el.classList.toggle("is-focus", v.scene === "you" && v.focus[2] === el._d);
    });
  };
  const placePin = (toScreen, v) => {
    pin.hidden = !(v.pin && v.scene === "you" && v.settled);
    if (!pin.hidden) moveTo(pin, toScreen([v.pin[0] - hw, hh - v.pin[1], 0]));
  };

  /** v = { scene, focus, pin, settled, narrow, clock }; toScreen maps a world point to pixels. */
  const place = (toScreen, geo, v) => {
    setDistricts(v);
    const show = { districts: ["vehicles", "you", "terrain"].includes(v.scene),
      axis: v.scene === "hist", rows: v.scene === "rows", rings: v.scene === "rings",
      places: v.scene === "color",
      tower: v.scene === "hero" && v.clock >= 1 };
    for (const [set, els] of Object.entries(sets)) {
      placeSet(els, show[set] && v.settled, toScreen, geo, v);
    }
    placePin(toScreen, v);
  };
  // The tallest hero column, labeled once the hex bins are ready.
  const setTower = (bin, pos) => {
    const html = `Downtown: <b>${bin.total.toLocaleString("en-US")}</b> requests`;
    add("tower", html, "is-tower", fixed(pos));
  };
  const guessEl = sets.axis.find((el) => el.classList.contains("is-guess"));
  const setGuess = (code) => { guessEl._code = code ?? null; };
  return { place, setGuess, setTower };
}
