// Site icons for The Austin Bulletin.
// Usage: node scripts/favicon.mjs
//
// Rasterizes the hand-tuned master at src/favicon.svg into the files the
// browsers ask for:
//
//   src/favicon.ico        16 + 32 + 48 (PNG-compressed entries)
//   src/apple-touch-icon.png   180 (iOS home screen)
//   src/icon-192.png           192 (Android / site.webmanifest)
//   src/icon-512.png           512 (Android splash / manifest)
//
// The master is the oxblood plate from the masthead palette with a
// limestone keyline and a Source Serif 4 Bold "A" — the wordmark's
// blackletter "A" is unreadable below about 32px, so the icon uses the
// text face instead. The glyph is an outline, not a webfont reference,
// so the icon renders the same everywhere. Re-run this script after any
// edit to src/favicon.svg.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTER = path.join(ROOT, 'src', 'favicon.svg');

// Rendered at a high density so the keyline and the serifs resolve before
// they are resampled down to the target size.
const DENSITY = 900;

const ICO_SIZES = [16, 32, 48];
const PNG_FILES = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' }
];

async function render(svg, size) {
  return sharp(svg, { density: DENSITY }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

// A PNG-compressed .ico: a 6-byte ICONDIR, one 16-byte ICONDIRENTRY per
// image, then the PNG payloads. Supported since Windows Vista, and by
// every browser that still reads .ico at all.
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size — 0 for truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const svg = await readFile(MASTER);

const icoImages = await Promise.all(
  ICO_SIZES.map(async (size) => ({ size, data: await render(svg, size) }))
);
const icoPath = path.join(ROOT, 'src', 'favicon.ico');
await writeFile(icoPath, buildIco(icoImages));
console.log(`favicon.ico  ${ICO_SIZES.join(' + ')}`);

for (const { size, name } of PNG_FILES) {
  await writeFile(path.join(ROOT, 'src', name), await render(svg, size));
  console.log(`${name}  ${size}×${size}`);
}
