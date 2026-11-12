// Server-rendered line chart for the Nov. 12 short-term rental lead.
// No client script. Labels use words. The series is the City's daily file.

const VB = { w: 640, h: 240, padX: 28, top: 0.36, bottom: 0.9 };
const MARKS = [
  { date: "2026-09-30", count: 3015, value: "3,015", caption: "Sept. 30", kind: "mark" },
  { date: "2026-11-10", count: 3663, value: "3,663", caption: "Nov. 10", kind: "end" }
];

export function dayNumber(iso) {
  return Date.parse(`${iso}T00:00:00Z`) / 86400000;
}

function parseRow(line) {
  const [date, count] = line.split(",");
  return { date, count: Number(count) };
}

export function readSeries(text) {
  return String(text).trim().split("\n").slice(1).filter(Boolean).map(parseRow);
}

function seriesExtent(rows) {
  const counts = rows.map((row) => row.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const pad = Math.round((max - min) * 0.08);
  return {
    min: min - pad,
    max: max + pad,
    minDay: dayNumber(rows[0].date),
    maxDay: dayNumber(rows.at(-1).date)
  };
}

function makeScale(extent) {
  const top = VB.h * VB.top;
  const bottom = VB.h * VB.bottom;
  return {
    x(date) {
      const t = (dayNumber(date) - extent.minDay) / (extent.maxDay - extent.minDay);
      return VB.padX + t * (VB.w - VB.padX * 2);
    },
    y(count) {
      const t = (count - extent.min) / (extent.max - extent.min);
      return bottom - t * (bottom - top);
    }
  };
}

function requireRow(rows, date, count) {
  const row = rows.find((item) => item.date === date);
  if (!row || row.count !== count) {
    throw new Error(`chart ${date} is ${row ? row.count : "missing"}, expected ${count}`);
  }
}

function checkedRows(text) {
  const rows = readSeries(text);
  requireRow(rows, "2026-09-30", 3015);
  requireRow(rows, "2026-11-10", 3663);
  if (rows[0].date !== "2025-09-01" || rows.at(-1).date !== "2026-11-10") {
    throw new Error("chart range is not Sept. 1, 2025 through Nov. 10, 2026");
  }
  return rows;
}

function pathCommand(prev, row, scale) {
  const gap = prev && dayNumber(row.date) - dayNumber(prev.date) > 1;
  const letter = !prev || gap ? "M" : "L";
  return `${letter}${scale.x(row.date).toFixed(1)} ${scale.y(row.count).toFixed(1)}`;
}

function pathOf(rows, scale) {
  let prev = null;
  const parts = [];
  for (const row of rows) {
    parts.push(pathCommand(prev, row, scale));
    prev = row;
  }
  return parts.join("");
}

function chartParts(text) {
  const rows = checkedRows(text);
  const scale = makeScale(seriesExtent(rows));
  return { scale, path: pathOf(rows, scale) };
}

function pct(n, total) {
  return `${((n / total) * 100).toFixed(2)}%`;
}

function dot(mark, scale) {
  const fill = mark.kind === "end" ? "#FFC233" : "#56B4E9";
  const cls = mark.kind === "end" ? "end-dot" : "mark-dot";
  const x = scale.x(mark.date).toFixed(1);
  const y = scale.y(mark.count).toFixed(1);
  return `<circle class="${cls}" cx="${x}" cy="${y}" r="8" fill="${fill}"/>`;
}

function callout(mark, scale) {
  const cls = mark.kind === "end" ? "callout callout-end" : "callout callout-mark";
  const left = pct(scale.x(mark.date), VB.w);
  const top = pct(scale.y(mark.count), VB.h);
  return `<p class="${cls}" style="left:${left};top:${top}">` +
    `<b>${mark.value}</b><span>${mark.caption}</span></p>`;
}

export function lineChartHtml(text) {
  const { scale, path } = chartParts(text);
  const dots = MARKS.map((mark) => dot(mark, scale)).join("");
  const labels = MARKS.map((mark) => callout(mark, scale)).join("");
  return `<div class="line-chart" data-budget-exempt><div class="line-stage">` +
    `<svg viewBox="0 0 ${VB.w} ${VB.h}" aria-hidden="true" focusable="false">` +
    `<path class="series" d="${path}" fill="none" stroke="#FFC233" stroke-width="2.5" ` +
    `stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` +
    `${dots}</svg>${labels}</div>` +
    `<p class="axis"><span>Sept. 1, 2025</span><span>Nov. 10, 2026</span></p></div>`;
}

function shareText(x, y, size, fill, weight, body, anchor) {
  const align = anchor ? ` text-anchor="${anchor}"` : "";
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" ` +
    `font-weight="${weight}" font-family="Arial, Helvetica, sans-serif" ` +
    `letter-spacing="0"${align}>${body}</text>`;
}

function shareDots(scale) {
  return MARKS.map((mark) => {
    const fill = mark.kind === "end" ? "#FFC233" : "#56B4E9";
    const x = scale.x(mark.date).toFixed(1);
    const y = scale.y(mark.count).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="7" fill="${fill}"/>`;
  }).join("");
}

function shareCallouts(scale) {
  return MARKS.map((mark) => {
    const x = scale.x(mark.date).toFixed(1);
    const y = scale.y(mark.count) - 14;
    const fill = mark.kind === "end" ? "#FFC233" : "#FBF4E6";
    return shareText(x, y.toFixed(1), 20, fill, 800, mark.value, "end") +
      shareText(x, (y + 18).toFixed(1), 16, "#C9D3DE", 650, mark.caption, "end");
  }).join("");
}

export function shareSvg(text) {
  const { scale, path } = chartParts(text);
  const chart = `<g transform="translate(80 520) scale(2.05)">` +
    `<path d="${path}" fill="none" stroke="#FFC233" stroke-width="2.5" ` +
    `stroke-linejoin="round" stroke-linecap="round"/>` +
    `${shareDots(scale)}${shareCallouts(scale)}` +
    shareText(28, 232, 16, "#C9D3DE", 650, "Sept. 1, 2025") +
    shareText(612, 232, 16, "#C9D3DE", 650, "Nov. 10, 2026", "end") +
    `</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067" ` +
    `viewBox="0 0 1600 1067">` +
    `<rect width="1600" height="1067" fill="#0F2A47"/>` +
    shareText(80, 150, 28, "#FFC233", 700, "Bulletin original") +
    shareText(80, 320, 148, "#FFC233", 800, "3,663") +
    shareText(80, 390, 32, "#C9D3DE", 650, "active licenses, Nov. 10") +
    shareText(760, 250, 42, "#FBF4E6", 750, "Licensed short-term rentals") +
    shareText(760, 310, 42, "#FBF4E6", 750, "rise since September") +
    shareText(80, 500, 28, "#FBF4E6", 650, "Active short-term rental licenses in Austin, by day") +
    chart +
    `</svg>`;
}
