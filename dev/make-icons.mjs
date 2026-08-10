// Generates the PWA icons (eclipsed-sun corona on dark sky) without any image
// dependencies — minimal PNG encoder over node:zlib. Run: node eclipse/dev/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = ~0;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
};
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a + (b - a) * t;
function render(size, glyphScale) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = size * 0.30 * glyphScale; // moon disc radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.hypot(dx, dy);
      // night-sky background with a soft vignette
      const v = r / (size * 0.7);
      let cr = mix(13, 8, v), cg = mix(20, 12, v), cb = mix(36, 22, v);
      // corona: bright ring around the disc, fading outwards
      const ringD = (r - R) / (size * 0.055);
      if (ringD > -0.4) {
        const glow = Math.exp(-ringD * ringD) + 0.35 * Math.exp(-(((r - R) / (size * 0.16)) ** 2));
        cr = Math.min(255, cr + 255 * glow);
        cg = Math.min(255, cg + 214 * glow);
        cb = Math.min(255, cb + 140 * glow);
      }
      // moon disc on top
      if (r < R) {
        const edge = Math.min(1, (R - r) / (size * 0.01));
        cr = mix(cr, 10, edge); cg = mix(cg, 14, edge); cb = mix(cb, 26, edge);
      }
      const i = (y * size + x) * 4;
      px[i] = cr; px[i + 1] = cg; px[i + 2] = cb; px[i + 3] = 255;
    }
  }
  return png(size, size, px);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'icon-192.png'), render(192, 1));
writeFileSync(join(dir, 'icon-512.png'), render(512, 1));
writeFileSync(join(dir, 'icon-maskable-512.png'), render(512, 0.72));
writeFileSync(join(dir, 'icon-180.png'), render(180, 1));
console.log('icons written to', dir);
