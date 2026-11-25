// Render a lead bar-chart image pair (1600x1067 desktop, 780x520 phone) as WebP.
// Usage: node scripts/lead-chart.mjs <spec.json>
// spec: { out: "src/images/YYYY-MM-DD/name", kicker, bignum, qualifier, headline,
//         subtitle, bars: [{label, value, n, hi}] }
// Needs a local Chrome (CHROME_PATH, default /usr/bin/google-chrome).
import { readFile, writeFile, unlink } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const spec = JSON.parse(await readFile(process.argv[2], "utf8"));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const max = Math.max(...spec.bars.map((b) => b.n));

function html(w, h, scale) {
  const px = (v) => `${Math.round(v * scale)}px`;
  const bars = spec.bars.map((b) => `
    <div class="col"><span class="v${b.hi ? " hi" : ""}">${esc(b.value)}</span>
    <span class="bar${b.hi ? " hi" : ""}" style="height:${(b.n / max) * 100}%"></span>
    <span class="l${b.hi ? " hi" : ""}">${esc(b.label)}</span></div>`).join("");
  return `<!doctype html><html><head><style>
  *{box-sizing:border-box;margin:0}
  body{width:${w}px;height:${h}px;background:#0f2a47;color:#fff;font-family:Inter,"Helvetica Neue",Arial,sans-serif;padding:${px(80)} ${px(80)};display:flex;flex-direction:column}
  .k{color:#ffc233;font-weight:700;font-size:${px(30)}}
  .n{color:#ffc233;font-weight:800;font-size:${px(150)};line-height:1;margin-top:${px(40)};letter-spacing:-0.02em}
  .q{color:#b9c6d6;font-weight:600;font-size:${px(30)};margin-top:${px(6)}}
  .h{font-weight:700;font-size:${px(40)};margin-top:${px(46)}}
  .s{color:#b9c6d6;font-weight:600;font-size:${px(26)};margin-top:${px(20)}}
  .chart{flex:1;display:flex;align-items:flex-end;justify-content:space-around;padding:${px(30)} ${px(160)} 0}
  .col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;width:${px(120)}}
  .bar{width:100%;background:#5f7898;border-radius:${px(4)}}
  .bar.hi{background:#ffc233}
  .v{font-weight:700;font-size:${px(28)};color:#dfe6ee;margin-bottom:${px(10)}}
  .l{font-weight:700;font-size:${px(26)};color:#dfe6ee;margin-top:${px(14)}}
  .hi.v,.hi.l{color:#ffc233}
  </style></head><body>
  <p class="k">${esc(spec.kicker)}</p><p class="n">${esc(spec.bignum)}</p><p class="q">${esc(spec.qualifier)}</p>
  <p class="h">${esc(spec.headline)}</p><p class="s">${esc(spec.subtitle)}</p>
  <div class="chart">${bars}</div></body></html>`;
}

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
try {
  for (const [w, h, scale, suffix] of [[1600, 1067, 1.25, "desktop-1600"], [780, 520, 0.61, "phone-780"]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    await page.setContent(html(w, h, scale), { waitUntil: "load" });
    const png = `${spec.out}-${suffix}.png`;
    await page.screenshot({ path: png });
    await sharp(png).webp({ quality: 86 }).toFile(`${spec.out}-${suffix}.webp`);
    await unlink(png);
    await page.close();
  }
} finally {
  await browser.close();
}
