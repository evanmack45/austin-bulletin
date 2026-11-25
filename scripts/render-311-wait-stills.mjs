// Renders the still images for /austin-311-wait/: the poster shown before the data
// loads, and one image per scene for browsers without WebGL.
// Usage: npx eleventy && (serve _site) && node scripts/render-311-wait-stills.mjs http://localhost:8080
// Needs Chrome (CHROME_PATH, default /usr/bin/google-chrome). Rerun after a data refresh.
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const base = process.argv[2] || "http://localhost:8080";
const out = "src/images/features/311-wait";
const SIZES = [
  { name: "390", width: 390, height: 844, scale: 2, mobile: true },
  { name: "1280", width: 1280, height: 800, scale: 1, mobile: false }
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"]
});
for (const s of SIZES) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.setViewport({ width: s.width, height: s.height, deviceScaleFactor: s.scale, isMobile: s.mobile, hasTouch: s.mobile });
  await page.goto(`${base}/austin-311-wait/`, { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__w3", { timeout: 60000 });
  // Only the graphic: no cards, no clock, no hidden poster.
  await page.addStyleTag({ content: ".w3-steps{visibility:hidden}.w3-hud,.w3-poster,.w3-credit{display:none!important}" });
  const scenes = await page.$$eval(".w3-step", (els) => els.map((e) => e.dataset.scene));
  for (const scene of scenes) {
    // Pin the stage at the top of the screen, then switch scenes directly.
    await page.evaluate((sc) => {
      scrollTo(0, document.getElementById("w3").getBoundingClientRect().top + scrollY + 2);
      document.querySelector(".w3-stage").dataset.scene = sc;
      window.__w3.goTo(sc, true);
    }, scene);
    await sleep(600);
    await page.evaluate(() => window.__w3.setClock(1.2));
    // The "your wait" still can't follow the form, so it shows no district numbers.
    await page.evaluate((sc) => document.querySelector(".w3-labels").classList.toggle("is-bare", sc === "you"), scene);
    await sleep(900);
    const png = await page.screenshot();
    const name = scene === "hero" ? "hero" : scene;
    await sharp(png).webp({ quality: 72, effort: 6 }).toFile(`${out}/still-${s.name}-${name}.webp`);
    console.log(s.name, name);
  }
  await page.close();
}
await browser.close();
