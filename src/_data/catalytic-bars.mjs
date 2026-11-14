// Share image for the Nov. 14 catalytic-converter theft bars.
// Labels sit above and below the bars, on the night ground, not on the fill.

const NIGHT = "#0F2A47";
const SUN = "#FFC233";
const PAPER = "#FBF4E6";
const INK = "#C9D3DE";
const MUTED = "#5E7A99";
const FONT = "Inter, Liberation Sans, sans-serif";

export const THEFT_COUNTS = [
  { year: "2020", count: 220, text: "220", hi: false },
  { year: "2021", count: 1522, text: "1,522", hi: false },
  { year: "2022", count: 1763, text: "1,763", hi: false },
  { year: "2023", count: 438, text: "438", hi: false },
  { year: "2024", count: 29, text: "29", hi: false },
  { year: "2025", count: 32, text: "32", hi: false },
  { year: "2026", count: 297, text: "297", hi: true }
];

export const CHART_ALT = "Chart: Austin police reports of catalytic converter theft, " +
  "January through October: 220 in 2020, 1,522 in 2021, 1,763 in 2022, " +
  "438 in 2023, 29 in 2024, 32 in 2025 and 297 in 2026.";

export const CHART_SOURCE = "Source: City of Austin, Crime Reports (fdj4-gpfu), " +
  "as of Nov. 9, 2026.";

export function barShare(count, max = THEFT_COUNTS[2].count) {
  return Math.round((count / max) * 1000) / 10;
}

function text(x, y, size, fill, weight, value, anchor = "start") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" ` +
    `font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">` +
    `${value}</text>`;
}

function bars() {
  const max = Math.max(...THEFT_COUNTS.map((bar) => bar.count));
  const base = 960;
  const height = 340;
  const left = 80;
  const right = 1520;
  const slot = (right - left) / THEFT_COUNTS.length;
  const barW = 64;
  return THEFT_COUNTS.map((bar, index) => {
    const h = Math.max(2, Math.round((bar.count / max) * height));
    const x = left + index * slot + (slot - barW) / 2;
    const y = base - h;
    const fill = bar.hi ? SUN : MUTED;
    const ink = bar.hi ? SUN : INK;
    const cx = x + barW / 2;
    const rect = `<rect x="${x.toFixed(1)}" y="${y}" width="${barW}" height="${h}" ` +
      `rx="4" fill="${fill}"/>`;
    const value = text(cx, y - 16, 26, ink, 700, bar.text, "middle");
    const year = text(cx, base + 40, 22, ink, 650, bar.year, "middle");
    return rect + value + year;
  }).join("");
}

export function shareSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067" ` +
    `viewBox="0 0 1600 1067">` +
    `<rect width="1600" height="1067" fill="${NIGHT}"/>` +
    text(80, 130, 32, SUN, 700, "Bulletin original") +
    text(80, 300, 148, SUN, 800, "297") +
    text(80, 360, 32, INK, 650, "theft reports, Jan.–Oct.") +
    text(80, 450, 40, PAPER, 750, "Catalytic converter theft reports surge back") +
    text(80, 520, 28, INK, 650, "January–October") +
    `<line x1="80" y1="960" x2="1520" y2="960" stroke="${MUTED}" stroke-width="1"/>` +
    bars() +
    `</svg>`;
}
