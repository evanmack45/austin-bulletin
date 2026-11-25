// Turns the decoded requests into GPU attributes for /austin-311-wait/, plus the
// counts the layouts need (pile ranks, per-row tallest bins, a running total by time).
import { LEVELS, OPEN, MIN_PER_YEAR } from "./wait-311-core.js";

export const BINS = 56;          // bins in the wait piles, 1 minute to 1 year on a log scale
const NO_ROW = 255;

const binOf = (code) => {
  if (code <= LEVELS) return Math.floor((code / 125) * BINS);
  return code === OPEN ? BINS + 1 : BINS + 2;
};

function placeRow(o, i, code, bin, row) {
  if (row !== NO_ROW && code <= LEVELS) {
    o.aRG[i * 2] = o.rowBin[row * (BINS + 1) + bin]++;
    o.aRG[i * 2 + 1] = row;
  } else o.aRG[i * 2 + 1] = NO_ROW;
}

function fillRecord(o, data, i, k) {
  const located = data.gx[i] <= k.G && data.gy[i] <= k.G;
  o.aMap[i * 2] = located ? data.gx[i] / k.G - k.hw : -99;
  o.aMap[i * 2 + 1] = located ? k.hh - data.gy[i] / k.G : -99;
  const code = data.code[i], group = data.group[i], district = data.district[i], t = data.t[i];
  const bin = binOf(code);
  o.aTR[i * 2] = t; o.aTR[i * 2 + 1] = o.binCount[bin]++;
  placeRow(o, i, code, bin, k.rowOfGroup[group]);
  o.aMeta[i * 4] = code; o.aMeta[i * 4 + 1] = group; o.aMeta[i * 4 + 2] = district;
  o.aMeta[i * 4 + 3] = (Math.imul(i + 1, 2654435761) >>> 24) & 255;
  if (located) o.located11[group * 11 + district]++;
  o.perSlot[t]++;
  if (t > o.maxT) o.maxT = t;
}

function finish(o, data, DATA) {
  o.slots = o.maxT + 1;
  // Minutes from the Monday 00:00 before the first day (dates are local Austin time).
  const startDow = (new Date(`${DATA.from}T12:00:00Z`).getUTCDay() + 6) % 7;
  o.ringOffset = startDow * 1440;
  o.ringWeeks = Math.ceil((o.slots * data.slot + o.ringOffset) / 10080);
  o.cumulative = new Uint32Array(o.slots);
  for (let s = 0, c = 0; s < o.slots; s++) { c += o.perSlot[s]; o.cumulative[s] = c; }
  o.maxBin = Math.max(...o.binCount.subarray(0, BINS + 2));
  const W = BINS + 1;
  o.rowMax = DATA.rowKeys.map((_, r) => Math.max(...o.rowBin.subarray(r * W, (r + 1) * W)));
  o.countOf = (group, district) => {
    let c = 0;
    for (let d = 0; d < 11; d++) if (!district || d === district) c += o.located11[group * 11 + d];
    return c;
  };
  return o;
}

/** Build every attribute in one pass, yielding to the page every 64k requests. */
export async function prepare(data, DATA) {
  const n = data.n;
  const groupIndex = Object.fromEntries(DATA.groups.map((g, i) => [g.key, i]));
  const rowOfGroup = new Uint8Array(16).fill(NO_ROW);
  DATA.rowKeys.forEach((key, i) => { rowOfGroup[groupIndex[key]] = i; });
  const k = { G: data.grid - 2, hw: DATA.mapW / 2, hh: DATA.mapH / 2, rowOfGroup };
  const o = { n, groupIndex, maxT: 0,
    aMap: new Float32Array(n * 2), aTR: new Uint16Array(n * 2), aRG: new Uint16Array(n * 2),
    aMeta: new Uint8Array(n * 4), binCount: new Uint32Array(BINS + 3),
    rowBin: new Uint32Array(DATA.rowKeys.length * (BINS + 1)), located11: new Uint32Array(16 * 11),
    perSlot: new Uint32Array(Math.ceil((MIN_PER_YEAR * 1.01) / data.slot) + 2) };
  for (let i = 0; i < n; i++) {
    if (i && !(i & 0xffff)) await new Promise((r) => setTimeout(r));
    fillRecord(o, data, i, k);
  }
  return finish(o, data, DATA);
}
