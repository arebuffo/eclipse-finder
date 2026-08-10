// Generates eclipse/path-data.js: central line + path-of-totality outline,
// computed numerically from the verified engine. Run: node eclipse/dev/gen-path.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { observerState, localCircumstances } from '../engine.mjs';

const D2R = Math.PI / 180, R2D = 180 / Math.PI, RE = 6371;

function dest(lat, lon, bearingDeg, distKm) {
  const f1 = lat * D2R, l1 = lon * D2R, br = bearingDeg * D2R, dr = distKm / RE;
  const f2 = Math.asin(Math.sin(f1) * Math.cos(dr) + Math.cos(f1) * Math.sin(dr) * Math.cos(br));
  const l2 = l1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(f1),
    Math.cos(dr) - Math.sin(f1) * Math.sin(f2));
  return [f2 * R2D, ((l2 * R2D + 540) % 360) - 180];
}
function bearing(a, b) {
  const f1 = a[0] * D2R, f2 = b[0] * D2R, dl = (b[1] - a[1]) * D2R;
  return (Math.atan2(Math.sin(dl) * Math.cos(f2),
    Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) * R2D + 360) % 360;
}
function distKm(a, b) {
  const f1 = a[0] * D2R, f2 = b[0] * D2R;
  const s = Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin((b[1] - a[1]) * D2R / 2) ** 2;
  return 2 * RE * Math.asin(Math.sqrt(s));
}

// Newton solve for the shadow-axis ground intersection (u=v=0) at TT hour t.
function centralPoint(t, guess) {
  let [lat, lon] = guess;
  for (let i = 0; i < 30; i++) {
    const s0 = observerState(t, lat, lon, 0);
    const h = 1e-5;
    const sf = observerState(t, lat + h, lon, 0);
    const sl = observerState(t, lat, lon + h, 0);
    const j11 = (sf.u - s0.u) / h, j12 = (sl.u - s0.u) / h;
    const j21 = (sf.v - s0.v) / h, j22 = (sl.v - s0.v) / h;
    const det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-12) return null;
    const dLat = (-s0.u * j22 + s0.v * j12) / det;
    const dLon = (-s0.v * j11 + s0.u * j21) / det;
    lat += dLat; lon += dLon;
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 89.9) return null;
    if (Math.abs(dLat) < 1e-8 && Math.abs(dLon) < 1e-8) {
      const chk = observerState(t, lat, lon, 0);
      if (Math.hypot(chk.u, chk.v) > 1e-6) return null;
      return [lat, ((lon + 540) % 360) - 180];
    }
  }
  return null;
}

function gridGuess(t) {
  let best = null, bm = Infinity;
  for (let lat = 85; lat >= 0; lat -= 2.5) {
    for (let lon = -180; lon < 180; lon += 2.5) {
      const s = observerState(t, lat, lon, 0);
      if (s.zeta < 0) continue;
      const m = Math.hypot(s.u, s.v);
      if (m < bm) { bm = m; best = [lat, lon]; }
    }
  }
  return best;
}

// Visible totality: geometrically total AND sun above the horizon at maximum.
const isTotalAt = (lat, lon) => {
  const c = localCircumstances(lat, lon, 0);
  return !!(c && c.type === 'total' && c.max.alt > -0.3);
};

// Scan the full perpendicular line through an anchor; return both edges of the
// visible-totality chord (plus = towards perpBr, minus = opposite), or null.
function chordScan(anchor, perpBr) {
  const S = 10, MAX = 460;
  let sMin = null, sMax = null;
  for (let s = -MAX; s <= MAX; s += S) {
    const [la, ln] = dest(anchor[0], anchor[1], perpBr, s);
    if (isTotalAt(la, ln)) { if (sMin == null) sMin = s; sMax = s; }
  }
  if (sMin == null) return null;
  const edge = (inS, dir) => {
    let lo = inS, hi = inS + dir * S;
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2;
      const [la, ln] = dest(anchor[0], anchor[1], perpBr, mid);
      if (isTotalAt(la, ln)) lo = mid; else hi = mid;
    }
    return dest(anchor[0], anchor[1], perpBr, (lo + hi) / 2);
  };
  return { plus: edge(sMax, +1), minus: edge(sMin, -1), widthKm: sMax - sMin };
}

// ---- pass 1: central line ---------------------------------------------------
const STEP = 15 / 3600;
const cps = [], center = [];
let guess = null, started = false;
for (let t = -1.45; t <= 0.72; t += STEP) {
  if (!guess) guess = gridGuess(t);
  const cp = centralPoint(t, guess);
  if (!cp) { if (started && t > 0.4) break; guess = null; continue; }
  started = true; guess = cp;
  const cc = localCircumstances(cp[0], cp[1], 0);
  if (!cc || cc.type !== 'total' || cc.max.alt < -0.3) continue;
  cps.push(cp);
  center.push([cp[0], cp[1], Math.round(cc.max.utcMs / 1000), +cc.totalitySec.toFixed(1), +cc.max.alt.toFixed(1)]);
}
const N = cps.length;

// ---- pass 2: limits at every central cross-section (smoothed track bearing) --
const smoothBr = (i) => bearing(cps[Math.max(0, i - 6)], cps[Math.min(N - 1, i + 6)]);
const sideA = [], sideB = [];
const widthAt = new Map();
for (let i = 0; i < N; i++) {
  const c = chordScan(cps[i], (smoothBr(i) + 90) % 360);
  if (!c) continue;
  sideA.push(c.plus); sideB.push(c.minus);
  widthAt.set(center[i][2], c.widthKm);
}

// ---- pass 3: sunset/sunrise caps via extrapolated cross-sections -------------
const brEnd = bearing(cps[N - 13], cps[N - 1]);
const brStart = bearing(cps[0], cps[12]);
for (let k = 1; k <= 150; k++) {
  const a = dest(cps[N - 1][0], cps[N - 1][1], brEnd, k * 6);
  const c = chordScan(a, (brEnd + 90) % 360);
  if (!c) break;
  sideA.push(c.plus); sideB.push(c.minus);
}
for (let k = 1; k <= 150; k++) {
  const a = dest(cps[0][0], cps[0][1], (brStart + 180) % 360, k * 6);
  const c = chordScan(a, (brStart + 90) % 360);
  if (!c) break;
  sideA.unshift(c.plus); sideB.unshift(c.minus);
}

// ---- verification ------------------------------------------------------------
const nasa = [ // [UT hh:mm, centralLat, centralLon, widthKm, durSec]
  ['17:46', 65.1717, -25.2050, 294, 138.2],
  ['18:26', 44.7133, -8.3983, 311, 113.0],
  ['18:28', 43.3717, -6.1883, 304, 109.3],
  ['18:30', 41.8167, -3.1850, 294, 104.6],
];
console.log('Central-line check vs NASA:');
let maxWidthErr = 0;
for (const [hm, nlat, nlon, nwidth, ndur] of nasa) {
  const [h, m] = hm.split(':').map(Number);
  const utcSec = Date.UTC(2026, 7, 12, h, m, 0) / 1000;
  let best = center[0];
  for (const row of center) if (Math.abs(row[2] - utcSec) < Math.abs(best[2] - utcSec)) best = row;
  const d = distKm([best[0], best[1]], [nlat, nlon]);
  const w = widthAt.get(best[2]);
  if (w) maxWidthErr = Math.max(maxWidthErr, Math.abs(w - nwidth));
  console.log(` ${hm}  offset ${d.toFixed(1)} km, dur ${best[3]}s (NASA ${ndur}s), chord ${w?.toFixed(0)} km (NASA width ${nwidth})`);
}
// Strong check: the computed totality boundary must pass through NASA's own
// published limit coordinates (magnitude 1.0000 there ⇒ edge within ~2 km).
const nasaLimits = [
  [42 + 54.5 / 60, -(2 + 5.1 / 60)], [43 + 36.4 / 60, -(9 + 33.1 / 60)], // 18:28 N/S
  [65 + 35.6 / 60, -(22 + 7.2 / 60)], [64 + 42.6 / 60, -(28 + 6.4 / 60)], // 17:46 N/S
];
for (const [la, lo] of nasaLimits) {
  const c = localCircumstances(la, lo, 0);
  const err = Math.abs(c.magnitude - 1);
  console.log(` limit (${la.toFixed(3)},${lo.toFixed(3)}): mag=${c.magnitude.toFixed(5)}`);
  if (err > 0.0003) { console.error('LIMIT MISMATCH vs NASA'); process.exit(1); }
}

// ---- assemble ring -----------------------------------------------------------
function thinByDist(arr, km) {
  const out = [arr[0]];
  for (let i = 1; i < arr.length - 1; i++) {
    const last = out[out.length - 1];
    if (distKm(last, arr[i]) >= km) out.push(arr[i]);
  }
  out.push(arr[arr.length - 1]);
  return out;
}
function unwrap(ring) {
  let off = 0;
  const out = [ring[0].slice()];
  for (let i = 1; i < ring.length; i++) {
    let lon = ring[i][1] + off;
    const prev = out[i - 1][1];
    while (lon - prev > 180) { off -= 360; lon -= 360; }
    while (lon - prev < -180) { off += 360; lon += 360; }
    out.push([ring[i][0], lon, ...ring[i].slice(2)]);
  }
  return out;
}
const ring = unwrap([...thinByDist(sideA, 22), ...thinByDist(sideB, 22).reverse()]);
let maxSeg = 0, maxIdx = 0;
for (let i = 1; i < ring.length; i++) {
  const d = distKm(ring[i - 1], ring[i]);
  if (d > maxSeg) { maxSeg = d; maxIdx = i; }
}
console.log(`ring ${ring.length} pts; max segment ${maxSeg.toFixed(0)} km @${maxIdx}`,
  maxSeg > 120 ? JSON.stringify([ring[maxIdx - 1], ring[maxIdx]]) : '');
console.log(`path spans UT ${new Date(center[0][2] * 1000).toISOString().slice(11, 19)}` +
  ` → ${new Date(center[N - 1][2] * 1000).toISOString().slice(11, 19)}; ${N} centers`);

const r4 = (p) => [+p[0].toFixed(4), +p[1].toFixed(4), ...p.slice(2)];
const out = {
  generated: 'NASA/GSFC Besselian elements, dT=69.2s',
  center: unwrap(thinByDist(center, 30)).map(r4),
  ring: ring.map(r4),
};
const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'path-data.js');
writeFileSync(file, `// Generated by dev/gen-path.mjs — do not edit by hand.\nexport const PATH = ${JSON.stringify(out)};\n`);
console.log(`wrote ${file} (${JSON.stringify(out).length} bytes)`);
