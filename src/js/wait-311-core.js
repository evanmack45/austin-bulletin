// Shared pieces of /austin-311-wait/ that also run in Node (tests): wait codes,
// number formats, the data-file decoder and the district lookup.

export const LEVELS = 124, DUP = 125, OPEN = 126, NONE = 127;
export const MIN_PER_YEAR = 525600;

/** Minutes for a wait code (the inverse of waitCode in scripts/data-311-wait.mjs). */
export const codeMinutes = (code) => Math.exp((code / LEVELS) * Math.log(MIN_PER_YEAR));
/** The code position of a wait in minutes. */
export const minutesCode = (m) =>
  (m < 1 ? 0 : (Math.log(m) / Math.log(MIN_PER_YEAR)) * LEVELS);

/** "36 minutes", "15 hours", "1 day", "21.2 days": the page's rounding rules. */
export function fmtDays(days) {
  if (days === null || days === undefined) return "—";
  const h = days * 24;
  if (h < 1) return `${Math.round(days * 1440)} minutes`;
  if (h < 1.5) return "1 hour";
  if (days < 1) return `${Math.round(h)} hours`;
  if (days < 1.05) return "1 day";
  return `${(Math.round(days * 10) / 10).toLocaleString("en-US")} days`;
}

/** Decode the byte planes written by scripts/data-311-wait.mjs. */
export function decode(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== "A312") throw new Error("bad data file");
  const n = dv.getUint32(4, true), slot = dv.getUint32(8, true), grid = dv.getUint32(12, true);
  const p = (i) => 16 + i * n;
  const gx = new Uint16Array(n), gy = new Uint16Array(n), t = new Uint16Array(n);
  const code = new Uint8Array(n), group = new Uint8Array(n), district = new Uint8Array(n);
  let y = 0, x = 0;
  for (let i = 0; i < n; i++) {
    const dy = bytes[p(0) + i] | (bytes[p(1) + i] << 8);
    const xv = bytes[p(2) + i] | (bytes[p(3) + i] << 8);
    if (dy !== 0 || i === 0) { y += dy; x = xv; } else x = (x + xv) & 0xffff;
    gx[i] = x; gy[i] = y;
    t[i] = bytes[p(4) + i] | (bytes[p(5) + i] << 8);
    code[i] = bytes[p(6) + i];
    group[i] = bytes[p(7) + i] >> 4; district[i] = bytes[p(7) + i] & 15;
  }
  return { n, slot, grid, gx, gy, t, code, group, district };
}

/** Point-in-polygon on the district outlines (normalized map coordinates). */
export function districtAt(outlines, x, y) {
  for (const o of outlines) {
    let inside = false;
    for (const ring of o.rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    if (inside) return o.district;
  }
  return 0;
}

const MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.",
  "Nov.", "Dec."];
/** "15 hr", "2.4 d": the short form for labels on the map. */
export const shortWait = (days) => (days < 1
  ? `${Math.max(1, Math.round(days * 24))} hr`
  : `${(Math.round(days * 10) / 10).toFixed(1)} d`);
export const fmtMonth = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** A reader's guess (a wait code) in words, rounded the way people guess. */
export function guessText(code) {
  const m = codeMinutes(code);
  const unit = (n, one) => `${n} ${one}${n === 1 ? "" : "s"}`;
  if (m < 59.5) return unit(Math.max(1, Math.round(m)), "minute");
  if (m < 1410) return unit(Math.round(m / 60), "hour");
  return unit(Math.round(m / 1440), "day");
}

/** How a guess compares with the real median (both in days). */
export function guessVerdict(guessDays, medianDays) {
  const r = guessDays / medianDays;
  if (r <= 1.5 && r >= 1 / 1.5) return "close";
  const times = Math.round(r >= 1 ? r : 1 / r);
  return `about ${times} times too ${r >= 1 ? "long" : "short"}`;
}
