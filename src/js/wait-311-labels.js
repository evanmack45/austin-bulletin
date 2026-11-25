// HTML labels pinned to world positions in /austin-311-wait/. Each label keeps a
// pos(geo) function, so placing them is one loop for every scene.
import { fmtDays, fmtMonth, minutesCode, shortWait } from "./wait-311-core.js";
import { BINS } from "./wait-311-prep.js";

const TICKS = [["1 min", 1], ["1 hr", 60], ["1 day", 1440], ["1 wk", 10080], ["1 mo.", 43200]];
const DAYS = ["Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat.", "Sun."];
const xOf = (geo, code) => geo.left + (code / 125) * BINS * geo.binW;
const fixed = (p) => () => p;

function districtLabels(add, DATA, prep) {
  const veh = DATA.groups[prep.groupIndex.vehicle];
  const hw = DATA.mapW / 2, hh = DATA.mapH / 2;
  for (const o of DATA.outlines) {
    const v = veh.byDistrict[o.district - 1];
    const days = (Math.round(v.medianDays * 10) / 10).toFixed(1);
    const html = `<b>D${o.district}</b><span>${days}</span>`;
    const el = add("districts", html, "is-district", fixed([o.label[0] - hw, hh - o.label[1], 0]));
    el._veh = html;
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
  add("axis", `Still open<br><b>${DATA.open.toLocaleString("en-US")}</b>`, "is-open",
    (g) => [g.left + (BINS + 2) * g.binW, g.bottom - 0.04, 0]);
}

function rowLabels(add, DATA, prep) {
  DATA.rowKeys.forEach((key, i) => {
    const g = DATA.groups[prep.groupIndex[key]];
    const top = (geo) => geo.top - i * geo.rowsH;
    add("rows", `${g.label} <b>${fmtDays(g.medianDays)}</b>`, "is-row",
      (geo) => [geo.left, top(geo) - 0.004, 0]);
    const code = minutesCode(g.medianDays * 1440);
    add("rows", "", "is-rowtick", (geo) => [xOf(geo, code), top(geo) - geo.rowsH + 0.004, 0]);
  });
}

function ringLabels(add, DATA, prep) {
  DAYS.forEach((label, d) => {
    const a = ((d + 0.5) / 7) * Math.PI * 2;
    add("rings", label, "is-hour", fixed([Math.sin(a) * 1.1, Math.cos(a) * 1.1, 0]));
  });
  const from = Date.parse(`${DATA.from}T00:00:00Z`);
  for (const [i, mk] of (DATA.marks || []).entries()) {
    // Noon on that day, placed the way the shader places a request.
    const minutes = (Date.parse(`${mk.date}T12:00:00Z`) - from) / 60000 + prep.ringOffset;
    const week = Math.floor(minutes / 10080), a = ((minutes % 10080) / 10080) * Math.PI * 2;
    const r = 0.3 + ((week + 0.5) / prep.ringWeeks) * 0.7;
    add("rings", mk.label, i % 2 ? "is-mark" : "is-mark is-left",
      fixed([Math.sin(a) * r, Math.cos(a) * r, 0]));
  }
  add("rings", fmtMonth(DATA.from), "is-ringdate", fixed([0, 0, 0]));
  add("rings", fmtMonth(DATA.to), "is-ringdate is-outer", fixed([0, 1.02, 0]));
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

export function createLabels(container, DATA, prep) {
  const sets = { districts: [], axis: [], rows: [], rings: [] };
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
  const pin = document.createElement("div");
  pin.className = "w3-lbl is-pin"; pin.hidden = true;
  container.append(pin);
  const hw = DATA.mapW / 2, hh = DATA.mapH / 2;
  let districtText = "vehicles";
  const sizes = new Map();
  const sizeOf = (el) => {
    if (!sizes.has(el)) sizes.set(el, [el.offsetWidth + 4, el.offsetHeight + 2]);
    return sizes.get(el);
  };

  // District labels: abandoned-vehicle medians, or the chosen problem's medians.
  const setDistrictText = (v) => {
    const want = v.scene === "you" ? `you:${v.focus[1]}` : "vehicles";
    if (want === districtText) return;
    districtText = want;
    sizes.clear();
    const g = DATA.groups[v.focus[1]];
    for (const el of sets.districts) {
      const d = want === "vehicles" ? null : g.byDistrict[el._d - 1];
      el.innerHTML = d ? `<b>D${el._d}</b><span>${d.closed ? shortWait(d.medianDays) : "–"}</span>`
        : el._veh;
    }
  };
  const moveTo = (el, [x, y]) => {
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };
  const placeSet = (els, on, toScreen, geo, v) => {
    const at = on ? els.map((el) => toScreen(el._pos(geo))) : [];
    if (on && els[0]?._d) spread(at, els.map(sizeOf));
    els.forEach((el, i) => {
      el.classList.toggle("is-on", on);
      if (on) moveTo(el, at[i]);
      if (el._d) el.classList.toggle("is-focus", v.scene === "you" && v.focus[2] === el._d);
    });
  };
  const placePin = (toScreen, v) => {
    pin.hidden = !(v.pin && v.scene === "you" && v.settled);
    if (!pin.hidden) moveTo(pin, toScreen([v.pin[0] - hw, hh - v.pin[1], 0]));
  };

  /** v = { scene, focus, pin, settled }; toScreen maps a world point to pixels. */
  const place = (toScreen, geo, v) => {
    setDistrictText(v);
    const show = { districts: v.scene === "vehicles" || v.scene === "you",
      axis: v.scene === "hist", rows: v.scene === "rows", rings: v.scene === "rings" };
    for (const [set, els] of Object.entries(sets)) {
      placeSet(els, show[set] && v.settled, toScreen, geo, v);
    }
    placePin(toScreen, v);
  };
  return { place };
}
