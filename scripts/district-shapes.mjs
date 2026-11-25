// Simplified SVG outlines of Austin's 10 Council districts for the 311 visual.
// Usage: node scripts/district-shapes.mjs
// Source: City of Austin Council District Boundaries (w3v2-cj58).
// Writes src/_data/councilDistrictShapes.json.
import { writeFile } from "node:fs/promises";

const URL_ = "https://data.austintexas.gov/resource/w3v2-cj58.geojson";
const UA = "TheAustinBulletin/1.0 (+https://theaustinbulletin.com)";
const WIDTH = 600;
const TOLERANCE = 0.9; // px in output space

function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let max = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const dist = bx === ax && by === ay ? Math.hypot(px - ax, py - ay)
        : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (dist > max) { max = dist; at = i; }
    }
    if (max > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

function ringArea(r) {
  let s = 0;
  for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; }
  return s / 2;
}
function ringCentroid(r) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    const f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}

async function main() {
  const res = await fetch(URL_, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`districts query failed: ${res.status}`);
  const geo = await res.json();
  const polys = geo.features.map((f) => ({
    district: f.properties.district_number,
    polys: f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates]
  }));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of polys) for (const p of d.polys) for (const [x, y] of p[0]) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const k = Math.cos(((minY + maxY) / 2) * Math.PI / 180);
  const scale = WIDTH / ((maxX - minX) * k);
  const height = Math.round((maxY - minY) * scale);
  const proj = ([x, y]) => [(x - minX) * k * scale, (maxY - y) * scale];
  const out = polys.map((d) => {
    let path = "", best = null;
    for (const p of d.polys) for (const ring of p) {
      const pts = simplify(ring.map(proj), TOLERANCE);
      if (pts.length < 4) continue;
      path += `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
      const area = Math.abs(ringArea(pts));
      if (!best || area > best.area) best = { area, pts };
    }
    const [lx, ly] = ringCentroid(best.pts);
    return { district: d.district, path, label: [Math.round(lx), Math.round(ly)] };
  }).sort((a, b) => Number(a.district) - Number(b.district));
  await writeFile("src/_data/councilDistrictShapes.json",
    `${JSON.stringify({ source: "https://data.austintexas.gov/d/w3v2-cj58", width: WIDTH, height, districts: out })}\n`);
  console.log(`districts: ${out.length}, ${WIDTH}x${height}, ${out.reduce((s, d) => s + d.path.length, 0)} path chars`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
