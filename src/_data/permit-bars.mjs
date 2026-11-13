// Share image for the Nov. 13 new-house permit bars.
// Labels sit above and below the bars, on the night ground, not on the fill.

const NIGHT = "#0F2A47";
const SUN = "#FFC233";
const PAPER = "#FBF4E6";
const INK = "#C9D3DE";
const MUTED = "#5E7A99";
const FONT = "Inter, Liberation Sans, sans-serif";

export const PERMIT_COUNTS = [
  { year: "2023", count: 1348, text: "1,348", hi: false },
  { year: "2024", count: 1498, text: "1,498", hi: false },
  { year: "2025", count: 1743, text: "1,743", hi: false },
  { year: "2026", count: 1845, text: "1,845", hi: true }
];

function text(x, y, size, fill, weight, value, anchor = "start") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" ` +
    `font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">` +
    `${value}</text>`;
}

function bars() {
  const max = PERMIT_COUNTS[PERMIT_COUNTS.length - 1].count;
  const base = 940;
  const height = 280;
  const width = 120;
  const step = 280;
  const start = 360;
  return PERMIT_COUNTS.map((bar, index) => {
    const h = Math.round((bar.count / max) * height);
    const x = start + index * step;
    const y = base - h;
    const fill = bar.hi ? SUN : MUTED;
    const ink = bar.hi ? SUN : INK;
    const cx = x + width / 2;
    const rect = `<rect x="${x}" y="${y}" width="${width}" height="${h}" ` +
      `rx="4" fill="${fill}"/>`;
    const value = text(cx, y - 18, 28, ink, 700, bar.text, "middle");
    const year = text(cx, base + 44, 24, ink, 650, bar.year, "middle");
    return rect + value + year;
  }).join("");
}

export function shareSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067" ` +
    `viewBox="0 0 1600 1067">` +
    `<rect width="1600" height="1067" fill="${NIGHT}"/>` +
    text(80, 150, 32, SUN, 700, "Bulletin original") +
    text(80, 330, 148, SUN, 800, "1,845") +
    text(80, 390, 32, INK, 650, "new-house permits, Jan.–Oct.") +
    text(80, 480, 40, PAPER, 750, "New-house permits rise a third straight year") +
    text(80, 560, 28, INK, 650, "January–October") +
    bars() +
    `</svg>`;
}
