// Verifies engine.mjs against published local circumstances (NASA path tables /
// timeanddate-sourced city values). Run: node eclipse/dev/verify.mjs
import { localCircumstances } from '../engine.mjs';

const fmt = (ms) => ms == null ? '  --  ' : new Date(ms).toISOString().slice(11, 19);
const secs = (ms) => Math.round(ms / 1000);

// [name, lat, lon, elev_m, expected] — expected: total C2/C3 in UT "HH:MM:SS", duration sec
const CITIES = [
  ['Reykjavik', 64.1466, -21.9426, 40, { type: 'total', c2: '17:48:16', dur: 61 }],
  ['Gijon', 43.5322, -5.6611, 10, { type: 'total', c2: '18:26:48', dur: 105 }],
  ['Oviedo', 43.3619, -5.8494, 230, { type: 'total', c2: '18:27:05', dur: 109 }],
  ['Santander', 43.4623, -3.8100, 15, { type: 'total', c2: '18:26:57', dur: 64 }],
  ['Bilbao', 43.2630, -2.9350, 20, { type: 'total', c2: '18:27:23', dur: 31 }],
  ['Burgos', 42.3439, -3.6969, 860, { type: 'total', c2: '18:28:24', dur: 104 }],
  ['Valladolid', 41.6521, -4.7286, 700, { type: 'total', c2: '18:29:53', dur: 87 }],
  ['Zaragoza', 41.6488, -0.8891, 200, { type: 'total', c2: '18:29:02', dur: 85 }],
  ['Valencia', 39.4699, -0.3763, 15, { type: 'total', c2: '18:32:30', dur: 60 }],
  ['Palma', 39.5696, 2.6502, 10, { type: 'total', c2: '18:31:05', dur: 96 }],
  ['Madrid', 40.4168, -3.7038, 650, { type: 'partial', minObsc: 0.997 }],
  ['Barcelona', 41.3874, 2.1686, 20, { type: 'partial', minObsc: 0.95 }],
  // NASA central-line samples (duration + sun altitude check)
  ['CL@18:28', 43.3717, -6.1883, 0, { type: 'total', dur: 109.3, alt: 10 }],
  ['CL@18:30', 41.8167, -3.1850, 0, { type: 'total', dur: 104.6, alt: 8 }],
];

let fail = 0;
for (const [name, lat, lon, elev, exp] of CITIES) {
  const c = localCircumstances(lat, lon, elev);
  if (!c) { console.log(`${name}: NO ECLIPSE — FAIL`); fail++; continue; }
  const line = [`${name.padEnd(11)} ${c.type.padEnd(7)}`,
    `mag=${c.magnitude.toFixed(4)} obsc=${(c.obscuration * 100).toFixed(2)}%`,
    `C2=${fmt(c.c2?.utcMs)} C3=${fmt(c.c3?.utcMs)} dur=${c.totalitySec.toFixed(1)}s`,
    `max@${fmt(c.max.utcMs)} alt=${c.max.alt.toFixed(1)} az=${c.max.az.toFixed(0)}`].join('  ');
  const probs = [];
  if (c.type !== exp.type) probs.push(`type ${c.type}!=${exp.type}`);
  if (exp.c2) {
    const expMs = Date.UTC(2026, 7, 12, ...exp.c2.split(':').map(Number));
    const dt = (c.c2.utcMs - expMs) / 1000;
    if (Math.abs(dt) > 6) probs.push(`C2 off by ${dt.toFixed(1)}s`);
  }
  if (exp.dur != null && Math.abs(c.totalitySec - exp.dur) > 4) probs.push(`dur ${c.totalitySec.toFixed(1)} != ${exp.dur}`);
  if (exp.minObsc != null && c.obscuration < exp.minObsc) probs.push(`obsc too low`);
  if (exp.alt != null && Math.abs(c.max.alt - exp.alt) > 1.5) probs.push(`alt ${c.max.alt.toFixed(1)} != ${exp.alt}`);
  if (probs.length) { fail++; console.log(line, ' FAIL:', probs.join('; ')); }
  else console.log(line, ' OK');
}
console.log(fail ? `\n${fail} FAILURES` : '\nALL CHECKS PASSED');
process.exit(fail ? 1 : 0);
