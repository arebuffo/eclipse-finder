/*
 * Eclipse engine — local circumstances for the total solar eclipse of 2026 Aug 12,
 * computed from NASA's polynomial Besselian elements (F. Espenak, NASA/GSFC).
 * Standard algorithm per the Explanatory Supplement / Meeus "Elements of Solar Eclipses".
 *
 * All angles in the element set are degrees; internal math uses radians.
 * t = hours of Terrestrial Time (TT) from t0. UTC = TT − ΔT.
 */

export const ELEMENTS = {
  // Reference epoch t0 = 2026 Aug 12, 18:00:00 TT
  t0utcMs: Date.UTC(2026, 7, 12, 18, 0, 0),
  deltaT: 69.2, // seconds, TT−UT1 estimate for mid-2026 (NASA's 2007-era prediction used 71.4)
  x: [0.475593, 0.5189288, -0.0000773, -0.0000088],
  y: [0.771161, -0.2301664, -0.0001245, 0.0000037],
  d: [14.79667, -0.012065, -0.000003, 0.0],
  mu: [88.74776, 15.003093, 0.0, 0.0],
  l1: [0.537954, 0.000094, -0.0000121, 0.0],
  l2: [-0.008142, 0.0000935, -0.0000121, 0.0],
  tanF1: 0.0046141,
  tanF2: 0.0045911,
};

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const FLAT = 0.99664719; // 1 - f  (Earth flattening)
const EARTH_A = 6378137; // metres

function poly(c, t) {
  return c[0] + t * (c[1] + t * (c[2] + t * c[3]));
}
function dpoly(c, t) {
  return c[1] + t * (2 * c[2] + t * 3 * c[3]);
}

/** Besselian elements and derivatives at TT hours-from-t0. */
export function elementsAt(t) {
  const E = ELEMENTS;
  return {
    x: poly(E.x, t),
    y: poly(E.y, t),
    dx: dpoly(E.x, t),
    dy: dpoly(E.y, t),
    d: poly(E.d, t) * D2R,
    dd: dpoly(E.d, t) * D2R, // rad/hour
    mu: poly(E.mu, t), // degrees
    dmu: dpoly(E.mu, t) * D2R, // rad/hour
    l1: poly(E.l1, t),
    dl1: dpoly(E.l1, t),
    l2: poly(E.l2, t),
    dl2: dpoly(E.l2, t),
  };
}

/**
 * Observer geometry on the fundamental plane at TT hours-from-t0.
 * lat, lon in degrees (east positive), height metres.
 */
export function observerState(t, lat, lon, height = 0) {
  const E = elementsAt(t);
  const phi = lat * D2R;
  // Geocentric latitude terms for the WGS ellipsoid
  const u1 = Math.atan(FLAT * Math.tan(phi));
  const rhoSin = FLAT * Math.sin(u1) + (height / EARTH_A) * Math.sin(phi);
  const rhoCos = Math.cos(u1) + (height / EARTH_A) * Math.cos(phi);

  // Local hour angle of the shadow axis; the −0.00417807·ΔT term shifts the
  // ephemeris meridian back to Greenwich for the actual UT of observation.
  const theta = (E.mu + lon - 0.00417807 * ELEMENTS.deltaT) * D2R;

  const sd = Math.sin(E.d), cd = Math.cos(E.d);
  const xi = rhoCos * Math.sin(theta);
  const eta = rhoSin * cd - rhoCos * Math.cos(theta) * sd;
  const zeta = rhoSin * sd + rhoCos * Math.cos(theta) * cd;
  const dxi = E.dmu * rhoCos * Math.cos(theta);
  const deta = E.dmu * xi * sd - zeta * E.dd;

  const u = E.x - xi;
  const v = E.y - eta;
  const a = E.dx - dxi;
  const b = E.dy - deta;
  const L1 = E.l1 - zeta * ELEMENTS.tanF1; // penumbral radius at observer plane
  const L2 = E.l2 - zeta * ELEMENTS.tanF2; // umbral radius (negative => total)

  // Sun altitude/azimuth (spherical approximation — display purposes)
  const rho = Math.sqrt(xi * xi + eta * eta + zeta * zeta);
  const alt = Math.asin(zeta / rho) * R2D;
  const sinAlt = Math.sin(phi) * sd + Math.cos(phi) * cd * Math.cos(theta);
  const azS = Math.atan2(Math.sin(theta), Math.cos(theta) * Math.sin(phi) - Math.tan(E.d) * Math.cos(phi));
  const az = ((azS * R2D + 180) % 360 + 360) % 360; // compass azimuth from north
  void sinAlt;

  return { t, u, v, a, b, L1, L2, alt, az, zeta, n2: a * a + b * b };
}

function refineMax(lat, lon, height, tGuess) {
  let t = tGuess;
  for (let i = 0; i < 12; i++) {
    const s = observerState(t, lat, lon, height);
    const tau = -(s.u * s.a + s.v * s.b) / s.n2;
    t += tau;
    if (Math.abs(tau) < 1e-9) break;
  }
  return t;
}

function refineContact(lat, lon, height, tStart, radiusFn, sign) {
  // Solve |(u,v) + τ(a,b)| = R, taking the root in direction `sign` (−1 early, +1 late).
  let t = tStart;
  for (let i = 0; i < 20; i++) {
    const s = observerState(t, lat, lon, height);
    const R = radiusFn(s);
    const disc = s.n2 * R * R - Math.pow(s.u * s.b - s.v * s.a, 2);
    if (disc < 0) return null;
    const tau = (-(s.u * s.a + s.v * s.b) + sign * Math.sqrt(disc)) / s.n2;
    t += tau;
    if (Math.abs(tau) < 1e-9) return t;
  }
  return t;
}

export function ttHoursToUtcMs(t) {
  return ELEMENTS.t0utcMs + (t * 3600 - ELEMENTS.deltaT) * 1000;
}

/**
 * Full local circumstances for an observer.
 * Returns null if there is no eclipse at all at this location.
 */
export function localCircumstances(lat, lon, height = 0) {
  // Locate maximum eclipse (start near mid-eclipse, then refine)
  let tMax = refineMax(lat, lon, height, -0.2);
  if (!isFinite(tMax) || Math.abs(tMax) > 4) return null;
  // A second pass guards against odd starts far from the event
  tMax = refineMax(lat, lon, height, Math.max(-3, Math.min(3, tMax)));

  const sm = observerState(tMax, lat, lon, height);
  const m = Math.hypot(sm.u, sm.v);
  const magnitude = (sm.L1 - m) / (sm.L1 + sm.L2);
  if (!(magnitude > 0)) return null;

  const ratio = (sm.L1 - sm.L2) / (sm.L1 + sm.L2); // moon/sun apparent size ratio
  const isTotal = sm.L2 < 0 && m < -sm.L2;
  const isAnnular = sm.L2 > 0 && m < sm.L2;

  // Obscuration: overlap area of two disks (sun radius 1, moon radius `ratio`)
  let obscuration;
  if (isTotal) obscuration = 1;
  else if (isAnnular) obscuration = ratio * ratio;
  else if (magnitude <= 0) obscuration = 0;
  else {
    const sep = 1 + ratio - 2 * magnitude;
    const ca = Math.min(1, Math.max(-1, (sep * sep + 1 - ratio * ratio) / (2 * sep)));
    const cb = Math.min(1, Math.max(-1, (sep * sep + ratio * ratio - 1) / (2 * sep * ratio)));
    const A = Math.acos(ca), B = Math.acos(cb);
    obscuration = (A - Math.sin(A) * Math.cos(A) + ratio * ratio * (B - Math.sin(B) * Math.cos(B))) / Math.PI;
  }

  const c1 = refineContact(lat, lon, height, tMax - 1.2, (s) => s.L1, -1);
  const c4 = refineContact(lat, lon, height, tMax + 1.2, (s) => s.L1, +1);
  let c2 = null, c3 = null;
  if (isTotal || isAnnular) {
    c2 = refineContact(lat, lon, height, tMax - 0.03, (s) => Math.abs(s.L2), -1);
    c3 = refineContact(lat, lon, height, tMax + 0.03, (s) => Math.abs(s.L2), +1);
  }

  const mk = (t) => {
    if (t == null) return null;
    const s = observerState(t, lat, lon, height);
    return { utcMs: ttHoursToUtcMs(t), alt: s.alt, az: s.az, tt: t };
  };

  return {
    type: isTotal ? 'total' : isAnnular ? 'annular' : 'partial',
    magnitude,
    obscuration,
    max: mk(tMax),
    c1: mk(c1),
    c2: mk(c2),
    c3: mk(c3),
    c4: mk(c4),
    totalitySec: c2 != null && c3 != null ? (c3 - c2) * 3600 : 0,
    moonSunRatio: ratio,
  };
}
