// Original-graphics toolkit for The Austin Bulletin.
// Usage: node scripts/graphic.mjs <spec.json>
//
// Renders a bar chart, a vertical timeline, or a Google Static Map to
// src/images/<date>/<slug>.png and prints the markdown to paste under a
// story. See EDITORIAL.md "Image rules" and PIPELINE.md Step 4.

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const PAPER = '#f6efe2';
const INK = '#1b1712';
const MUTED = '#6d6357';
const ACCENT = '#7a1f1f';
const RULE = '#d9d2c4';
const FONT = '"Source Serif 4", Georgia, "Times New Roman", serif';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function niceFloor(value) {
  return Math.floor(value / 5) * 5;
}

function niceCeil(value) {
  return Math.ceil(value / 5) * 5;
}

function footerSvg(source) {
  return `<text x="60" y="770" font-family='${FONT}' font-size="22" fill="${MUTED}">The Austin Bulletin · ${esc(source)}</text>`;
}

function wrapLabel(text, maxLen = 48) {
  if (text.length <= maxLen) return [text];
  let idx = text.lastIndexOf(' ', maxLen);
  if (idx <= 0) idx = maxLen;
  const first = text.slice(0, idx).trim();
  const rest = text.slice(idx).trim();
  return rest ? [first, rest] : [first];
}

function validateCommon(spec) {
  if (!['bars', 'timeline', 'map'].includes(spec.type)) {
    fail(`type must be one of bars|timeline|map, got: ${spec.type}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.date || '')) {
    fail('date must be YYYY-MM-DD');
  }
  if (!isNonEmptyString(spec.slug) || !/^[a-z0-9-]+$/.test(spec.slug)) {
    fail('slug must be a non-empty lowercase string of letters, digits, and dashes');
  }
  if (!isNonEmptyString(spec.alt)) {
    fail('alt is required');
  }
  if (!isNonEmptyString(spec.source)) {
    fail('source is required');
  }
}

function renderBarsSvg(spec) {
  const { title, subtitle, unit, bars, reference } = spec;
  if (!isNonEmptyString(title)) fail('bars: title is required');
  if (subtitle !== undefined && typeof subtitle !== 'string') fail('bars: subtitle must be a string');
  if (typeof unit !== 'string') fail('bars: unit is required (use "" for none)');
  if (!Array.isArray(bars) || bars.length < 2 || bars.length > 14) {
    fail('bars: need 2-14 {label, value} items');
  }
  for (const b of bars) {
    if (!isNonEmptyString(b.label) || typeof b.value !== 'number') {
      fail('bars: each bar needs a label and a numeric value');
    }
  }
  if (reference !== undefined) {
    if (typeof reference.value !== 'number' || !isNonEmptyString(reference.label)) {
      fail('bars: reference needs a numeric value and a label');
    }
  }

  const values = bars.map((b) => b.value);
  const allValues = reference ? [...values, reference.value] : values;
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin || Math.abs(dataMax) || 1;

  let yMin = spec.yMin;
  let yMax = spec.yMax;
  if (typeof yMin !== 'number') yMin = niceFloor(dataMin - range * 0.05);
  if (typeof yMax !== 'number') yMax = niceCeil(dataMax + range * 0.12);
  if (yMax <= yMin) fail('bars: yMax must be greater than yMin');

  const plotX0 = 130; // left gutter holds the reference-line label
  const plotX1 = 1140;
  const plotY0 = 170;
  const plotY1 = 700;
  const plotW = plotX1 - plotX0;
  const plotH = plotY1 - plotY0;
  const n = bars.length;
  const slot = plotW / n;
  const barW = slot * 0.62;
  const radius = 4;
  const yFor = (v) => plotY1 - ((v - yMin) / (yMax - yMin)) * plotH;

  const parts = [];
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">');
  parts.push(`<rect x="0" y="0" width="1200" height="800" fill="${PAPER}"/>`);
  parts.push(`<text x="60" y="78" font-family='${FONT}' font-size="44" font-weight="700" fill="${INK}">${esc(title)}</text>`);
  if (subtitle) {
    parts.push(`<text x="60" y="122" font-family='${FONT}' font-size="26" fill="${MUTED}">${esc(subtitle)}</text>`);
  }

  const gridCount = 3;
  for (let i = 1; i <= gridCount; i++) {
    const gy = plotY1 - (plotH * i) / (gridCount + 1);
    parts.push(`<line x1="${plotX0}" y1="${gy.toFixed(1)}" x2="${plotX1}" y2="${gy.toFixed(1)}" stroke="${RULE}" stroke-width="1"/>`);
  }

  bars.forEach((b, i) => {
    const slotX = plotX0 + i * slot;
    const x = slotX + (slot - barW) / 2;
    const topY = yFor(b.value);
    const bottomY = plotY1;
    const r = Math.min(radius, barW / 2, Math.max(0, bottomY - topY));
    const d = `M ${x} ${bottomY} L ${x} ${topY + r} Q ${x} ${topY} ${x + r} ${topY} L ${x + barW - r} ${topY} Q ${x + barW} ${topY} ${x + barW} ${topY + r} L ${x + barW} ${bottomY} Z`;
    parts.push(`<path d="${d}" fill="${ACCENT}"/>`);
    parts.push(`<text x="${x + barW / 2}" y="${(topY - 12).toFixed(1)}" font-family='${FONT}' font-size="28" font-weight="700" fill="${INK}" text-anchor="middle">${esc(b.value + unit)}</text>`);
    parts.push(`<text x="${x + barW / 2}" y="740" font-family='${FONT}' font-size="24" fill="${INK}" text-anchor="middle">${esc(b.label)}</text>`);
  });

  if (reference) {
    const ry = yFor(reference.value);
    parts.push(`<line x1="${plotX0}" y1="${ry.toFixed(1)}" x2="${plotX1}" y2="${ry.toFixed(1)}" stroke="${MUTED}" stroke-width="2" stroke-dasharray="10 6"/>`);
    parts.push(`<text x="${plotX0 - 12}" y="${(ry + 8).toFixed(1)}" font-family='${FONT}' font-size="22" fill="${MUTED}" text-anchor="end">${esc(reference.label)}</text>`);
  }

  parts.push(`<line x1="${plotX0}" y1="${plotY1}" x2="${plotX1}" y2="${plotY1}" stroke="${INK}" stroke-width="1"/>`);
  parts.push(footerSvg(spec.source));
  parts.push('</svg>');
  return parts.join('\n');
}

function renderTimelineSvg(spec) {
  const { title, subtitle, events, next } = spec;
  if (!isNonEmptyString(title)) fail('timeline: title is required');
  if (subtitle !== undefined && typeof subtitle !== 'string') fail('timeline: subtitle must be a string');
  if (!Array.isArray(events) || events.length < 3 || events.length > 7) {
    fail('timeline: need 3-7 events');
  }
  for (const e of events) {
    if (!isNonEmptyString(e.date) || !isNonEmptyString(e.label)) {
      fail('timeline: each event needs date and label');
    }
    if (e.label.length > 60) fail(`timeline: event label exceeds 60 chars: "${e.label}"`);
    if (e.note !== undefined && (typeof e.note !== 'string' || e.note.length > 80)) {
      fail('timeline: note must be a string of at most 80 chars');
    }
  }
  if (next !== undefined && !isNonEmptyString(next.label)) {
    fail('timeline: next.label is required when next is given');
  }

  const items = events.map((e) => ({ ...e, kind: 'event' }));
  if (next) items.push({ ...next, kind: 'next' });

  const lineX = 300;
  const yTop = 190;
  const yBottom = 720;
  const evTop = 210;
  const evBottom = 700;
  const n = items.length;
  const step = n > 1 ? (evBottom - evTop) / (n - 1) : 0;

  const parts = [];
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">');
  parts.push(`<rect x="0" y="0" width="1200" height="800" fill="${PAPER}"/>`);
  parts.push(`<text x="60" y="78" font-family='${FONT}' font-size="44" font-weight="700" fill="${INK}">${esc(title)}</text>`);
  if (subtitle) {
    parts.push(`<text x="60" y="122" font-family='${FONT}' font-size="26" fill="${MUTED}">${esc(subtitle)}</text>`);
  }
  parts.push(`<line x1="${lineX}" y1="${yTop}" x2="${lineX}" y2="${yBottom}" stroke="${RULE}" stroke-width="3"/>`);

  items.forEach((item, i) => {
    const y = evTop + step * i;
    const labelLines = wrapLabel(item.label);
    if (item.kind === 'event') {
      parts.push(`<circle cx="${lineX}" cy="${y}" r="12" fill="${ACCENT}" stroke="${PAPER}" stroke-width="3"/>`);
      parts.push(`<text x="270" y="${(y + 7).toFixed(1)}" font-family='${FONT}' font-size="22" fill="${ACCENT}" text-anchor="end" letter-spacing="2">${esc(item.date.toUpperCase())}</text>`);
      labelLines.forEach((line, li) => {
        parts.push(`<text x="335" y="${(y + 7 + li * 34).toFixed(1)}" font-family='${FONT}' font-size="30" font-weight="700" fill="${INK}">${esc(line)}</text>`);
      });
      if (item.note) {
        const noteY = y + 7 + labelLines.length * 34;
        parts.push(`<text x="335" y="${noteY.toFixed(1)}" font-family='${FONT}' font-size="24" fill="${MUTED}">${esc(item.note)}</text>`);
      }
    } else {
      parts.push(`<circle cx="${lineX}" cy="${y}" r="12" fill="${PAPER}" stroke="${ACCENT}" stroke-width="3"/>`);
      parts.push(`<text x="270" y="${(y + 7).toFixed(1)}" font-family='${FONT}' font-size="22" fill="${ACCENT}" text-anchor="end" letter-spacing="2">NEXT</text>`);
      labelLines.forEach((line, li) => {
        parts.push(`<text x="335" y="${(y + 7 + li * 34).toFixed(1)}" font-family='${FONT}' font-size="30" font-weight="700" fill="${INK}">${esc(line)}</text>`);
      });
    }
  });

  parts.push(footerSvg(spec.source));
  parts.push('</svg>');
  return parts.join('\n');
}

async function renderMap(spec, outPath) {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.POLLEN_API_KEY;
  if (!key) {
    fail('Missing GOOGLE_MAPS_API_KEY (or POLLEN_API_KEY) environment variable');
  }

  const { center, zoom, markers, path: pathPoints } = spec;
  if (markers !== undefined && !Array.isArray(markers)) fail('map: markers must be an array');
  const markerList = markers || [];
  const hasPath = Array.isArray(pathPoints) && pathPoints.length > 0;
  if (markerList.length === 0 && !hasPath) {
    fail('map: needs at least one marker or a path');
  }

  const params = new URLSearchParams();
  params.set('size', '600x400');
  params.set('scale', '2');
  params.set('maptype', 'roadmap');
  params.set('format', 'png');
  if (typeof center === 'string' && center.trim()) {
    params.set('center', center.trim());
  } else if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
    params.set('center', `${center.lat},${center.lng}`);
  }
  if (typeof zoom === 'number') {
    params.set('zoom', String(zoom));
  }
  for (const m of markerList) {
    const hasPlace = typeof m.place === 'string' && m.place.trim();
    if (!hasPlace && (typeof m.lat !== 'number' || typeof m.lng !== 'number')) fail('map: each marker needs numeric lat/lng or a place name');
    let val = 'color:0x7a1f1f';
    if (m.label) {
      if (!/^[A-Z]$/.test(m.label)) fail(`map: marker label must be a single uppercase letter A-Z, got: ${m.label}`);
      val += `|label:${m.label}`;
    }
    val += hasPlace ? `|${m.place.trim()}` : `|${m.lat},${m.lng}`;
    params.append('markers', val);
  }
  if (hasPath) {
    let val = 'color:0x7a1f1fff|weight:4';
    for (const p of pathPoints) {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') fail('map: each path point needs numeric lat/lng');
      val += `|${p.lat},${p.lng}`;
    }
    params.set('path', val);
  }
  params.append('style', 'feature:all|element:geometry|saturation:-55');
  params.append('style', 'feature:water|element:geometry|color:0xcfd8d6');
  params.append('style', 'feature:landscape|element:geometry|color:0xf1e8d6');
  params.append('style', 'feature:poi|visibility:off');
  params.append('style', 'feature:transit|visibility:off');
  params.append('style', 'feature:road|element:labels|visibility:simplified');
  params.set('key', key);

  const url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    fail(`Static Maps request failed: ${e.message}`);
  }
  if (res.status !== 200) {
    const body = await res.text();
    fail(`Static Maps error ${res.status} ${body.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
}

async function main() {
  const specPath = process.argv[2];
  if (!specPath) fail('Usage: node scripts/graphic.mjs <spec.json>');

  let raw;
  try {
    raw = await readFile(specPath, 'utf8');
  } catch (e) {
    fail(`Cannot read spec file: ${specPath}`);
  }

  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON in spec file: ${e.message}`);
  }

  validateCommon(spec);

  const outDir = path.join('src', 'images', spec.date);
  const outPath = path.join(outDir, `${spec.slug}.png`);
  await mkdir(outDir, { recursive: true });

  if (spec.type === 'bars') {
    const svg = renderBarsSvg(spec);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
  } else if (spec.type === 'timeline') {
    const svg = renderTimelineSvg(spec);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
  } else if (spec.type === 'map') {
    await renderMap(spec, outPath);
  }

  const publicPath = `/images/${spec.date}/${spec.slug}.png`;
  const caption =
    spec.type === 'map'
      ? `Map: Google · ${spec.source}`
      : `${spec.type === 'bars' ? 'Chart' : 'Timeline'}: The Austin Bulletin · ${spec.source}`;
  // Wrapped in <figure class="graphic"> so scripts/river.mjs can tell an
  // original graphic apart from a bare photo — only the marked kind
  // satisfies EDITORIAL.md's original-graphic minimum (graphicMin).
  console.log('<figure class="graphic">');
  console.log(`![${spec.alt}](${publicPath})`);
  console.log(`<figcaption>${caption}</figcaption>`);
  console.log('</figure>');
}

await main();
