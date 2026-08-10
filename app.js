import { localCircumstances } from './engine.mjs';
import { PATH } from './path-data.js';

/* ------------------------------------------------------------------ data --- */
// Candidate viewing spots. Circumstances are COMPUTED at runtime — the list is
// only names/coords. climo = typical August cloudiness (1 good … 3 riskier),
// used to rank when the live forecast is unavailable.
const SPOTS = [
  ['A Coruña', 43.3623, -8.4115, 20, 'Europe/Madrid', 'Galicia — Atlantic coast', 3],
  ['Gijón', 43.5322, -5.6611, 10, 'Europe/Madrid', 'Asturias coast', 3],
  ['Oviedo', 43.3619, -5.8494, 230, 'Europe/Madrid', 'Asturias', 3],
  ['León', 42.5987, -5.5671, 840, 'Europe/Madrid', 'Dry meseta', 2],
  ['Ponferrada', 42.5461, -6.5906, 540, 'Europe/Madrid', 'El Bierzo valley', 2],
  ['Santander', 43.4623, -3.81, 15, 'Europe/Madrid', 'Cantabria coast', 3],
  ['Bilbao', 43.263, -2.935, 20, 'Europe/Madrid', 'Near northern edge — short totality', 3],
  ['Vitoria-Gasteiz', 42.8467, -2.6716, 525, 'Europe/Madrid', 'Basque Country', 2],
  ['Burgos', 42.3439, -3.6969, 860, 'Europe/Madrid', 'Castilla — good odds', 1],
  ['Palencia', 42.0095, -4.5288, 740, 'Europe/Madrid', 'Castilla', 1],
  ['Valladolid', 41.6521, -4.7286, 700, 'Europe/Madrid', 'Castilla', 1],
  ['Logroño', 42.4627, -2.445, 380, 'Europe/Madrid', 'La Rioja — Ebro valley', 1],
  ['Soria', 41.7666, -2.479, 1060, 'Europe/Madrid', 'High meseta', 1],
  ['Tudela', 42.0617, -1.606, 265, 'Europe/Madrid', 'Ribera de Navarra', 1],
  ['Zaragoza', 41.6488, -0.8891, 200, 'Europe/Madrid', 'Ebro valley — usually driest', 1],
  ['Daroca', 41.1146, -1.4155, 780, 'Europe/Madrid', 'Aragón', 1],
  ['Alcañiz', 41.0511, -0.1336, 380, 'Europe/Madrid', 'Bajo Aragón — dry', 1],
  ['Calatayud', 41.3535, -1.643, 530, 'Europe/Madrid', 'Aragón', 1],
  ['Teruel', 40.344, -1.1069, 915, 'Europe/Madrid', 'Aragón highlands', 1],
  ['Cuenca', 40.0704, -2.1374, 950, 'Europe/Madrid', 'Near southern edge', 2],
  ['Castellón', 39.9864, -0.0513, 30, 'Europe/Madrid', 'Med coast — low sun', 2],
  ['Sagunto', 39.6764, -0.2733, 50, 'Europe/Madrid', 'Med coast', 2],
  ['Valencia', 39.4699, -0.3763, 15, 'Europe/Madrid', 'Near southern edge, sun very low', 2],
  ['Peñíscola', 40.3589, 0.4056, 10, 'Europe/Madrid', 'Med coast', 2],
  ['Palma de Mallorca', 39.5696, 2.6502, 10, 'Europe/Madrid', 'Sun ≈2° — needs open sea horizon W', 2],
  ['Alcúdia', 39.8499, 3.124, 10, 'Europe/Madrid', 'Mallorca north coast', 2],
  ['Ibiza', 38.9067, 1.4206, 10, 'Europe/Madrid', 'Southern edge, sun ≈3°', 2],
  ['Maó (Menorca)', 39.8885, 4.2658, 50, 'Europe/Madrid', 'Totality ends at sunset', 2],
  ['Reykjavík', 64.1466, -21.9426, 40, 'Atlantic/Reykjavik', 'Iceland — Sun 25° up', 3],
  ['Ísafjörður', 66.0749, -23.124, 10, 'Atlantic/Reykjavik', 'Westfjords, Iceland', 3],
  ['Keflavík', 63.999, -22.562, 40, 'Atlantic/Reykjavik', 'Iceland', 3],
];
// Extra searchable places (mostly outside the path — the app shows their partial %)
const OTHER = [
  ['Madrid', 40.4168, -3.7038, 650], ['Barcelona', 41.3874, 2.1686, 20],
  ['San Sebastián', 43.3183, -1.9812, 10], ['Pamplona', 42.8125, -1.6458, 450],
  ['Santiago de Compostela', 42.8782, -8.5448, 260], ['Vigo', 42.2406, -8.7207, 20],
  ['Lugo', 43.0121, -7.5559, 460], ['Ourense', 42.3358, -7.8639, 130],
  ['Zamora', 41.5036, -5.7448, 650], ['Salamanca', 40.9701, -5.6635, 800],
  ['Segovia', 40.9429, -4.1088, 1000], ['Ávila', 40.6565, -4.6818, 1130],
  ['Guadalajara', 40.6329, -3.1601, 700], ['Toledo', 39.8628, -4.0273, 530],
  ['Tarragona', 41.1189, 1.2445, 20], ['Lleida', 41.6176, 0.62, 160],
  ['Girona', 41.9794, 2.8214, 70], ['Alicante', 38.3452, -0.481, 10],
  ['Murcia', 37.9922, -1.1307, 40], ['Sevilla', 37.3891, -5.9845, 10],
  ['Málaga', 36.7213, -4.4213, 10], ['Granada', 37.1773, -3.5986, 680],
  ['Lisboa', 38.7223, -9.1393, 50], ['Porto', 41.1579, -8.6291, 80],
  ['Huesca', 42.1401, -0.4089, 490], ['Barbastro', 42.0356, 0.1266, 340],
  ['Toulouse', 43.6047, 1.4442, 140], ['Bordeaux', 44.8378, -0.5792, 20],
  ['Paris', 48.8566, 2.3522, 40], ['London', 51.5072, -0.1276, 20], ['Roma', 41.8967, 12.4822, 20],
];

const ECLIPSE_DEFAULT_MAX_UTC = Date.UTC(2026, 7, 12, 18, 28, 0);
const $ = (id) => document.getElementById(id);

/* ----------------------------------------------------------------- utils --- */
const R = 6371, D2R = Math.PI / 180;
function distKm(a, b) {
  const f1 = a[0] * D2R, f2 = b[0] * D2R;
  const s = Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin((b[1] - a[1]) * D2R / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function bearingDeg(a, b) {
  const f1 = a[0] * D2R, f2 = b[0] * D2R, dl = (b[1] - a[1]) * D2R;
  return (Math.atan2(Math.sin(dl) * Math.cos(f2),
    Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) / D2R + 360) % 360;
}
const WINDS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = (b) => WINDS[Math.round(b / 22.5) % 16];
const fmtDur = (s) => s >= 60 ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s` : `${Math.round(s)}s`;
function fmtTime(ms, tz, withSec = true) {
  if (ms == null) return '–';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', second: withSec ? '2-digit' : undefined,
    hour12: false, timeZone: tz,
  }).format(new Date(ms));
}

// Nearest point on the totality boundary (ring) — vertices + segment projection.
function nearestOnRing(lat, lon) {
  let best = { d: Infinity, lat: 0, lon: 0 };
  const ring = PATH.ring;
  const cosLat = Math.cos(lat * D2R);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    // local equirectangular projection (fine at <500 km scales)
    const ax = (a[1] - lon) * cosLat, ay = a[0] - lat;
    const bx = (b[1] - lon) * cosLat, by = b[0] - lat;
    const dx = bx - ax, dy = by - ay;
    const L2 = dx * dx + dy * dy;
    let t = L2 ? -(ax * dx + ay * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    const d = Math.hypot(px, py) * 111.32;
    if (d < best.d) best = { d, lat: lat + py, lon: lon + px / cosLat };
  }
  return best;
}

/* --------------------------------------------------------------- runtime --- */
const spotData = SPOTS.map(([name, lat, lon, elev, tz, note, climo]) => {
  const c = localCircumstances(lat, lon, elev);
  return { name, lat, lon, elev, tz, note, climo, c, cloud: null };
}).filter((s) => s.c && s.c.type === 'total' && s.c.max.alt > 0);

let map, userMarker, tapMarker;
const spotMarkers = new Map();

function initMap() {
  map = L.map('map', { zoomSnap: 0.5 }).fitBounds([[36.2, -10.2], [44.4, 4.8]]);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© OpenStreetMap',
  }).addTo(map);
  L.polygon(PATH.ring.map((p) => [p[0], p[1]]), {
    color: '#ffb347', weight: 2, opacity: 0.9, fillColor: '#ffb347', fillOpacity: 0.13,
  }).addTo(map).bindTooltip('Path of totality', { sticky: true });
  L.polyline(PATH.center.map((p) => [p[0], p[1]]), {
    color: '#ffb347', weight: 1.5, opacity: 0.85, dashArray: '6 7',
  }).addTo(map);
  for (const s of spotData) {
    const m = L.circleMarker([s.lat, s.lon], markerStyle(s)).addTo(map)
      .bindTooltip(`${s.name} — ${fmtDur(s.c.totalitySec)}`)
      .on('click', () => setPoint(s.lat, s.lon, s.name, s.elev));
    spotMarkers.set(s.name, m);
  }
  map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng, null, 0));
}
const cloudColor = (p) => p == null ? '#5a6b8c' : p < 25 ? '#3ddc84' : p < 50 ? '#ffc857' : p < 75 ? '#ff9f45' : '#ff6b6b';
const markerStyle = (s) => ({
  radius: 7, weight: 2, color: '#0b1220', fillColor: cloudColor(s.cloud), fillOpacity: 0.95,
});

/* ------------------------------------------------------------ status card --- */
function setPoint(lat, lon, label, elev = 0, pan = false) {
  const c = localCircumstances(lat, lon, elev);
  renderCard(lat, lon, label, c);
  const ll = [lat, lon];
  if (!tapMarker) {
    tapMarker = L.marker(ll).addTo(map);
  } else tapMarker.setLatLng(ll);
  const brief = briefHtml(label, c);
  tapMarker.bindPopup(brief).openPopup();
  if (pan) map.setView(ll, Math.max(map.getZoom(), 7));
  try { localStorage.setItem('lastPoint', JSON.stringify({ lat, lon, label, elev })); } catch {}
  fetchPointCloud(lat, lon);
  startCountdown(c);
}

function briefHtml(label, c) {
  const name = label || 'This point';
  if (!c) return `<div class="pop"><b class="n">${name}: no eclipse</b></div>`;
  if (c.type === 'total' && c.max.alt > -0.3) {
    return `<div class="pop"><b class="t">☀️→🌑 TOTALITY — ${fmtDur(c.totalitySec)}</b><br>
      <small>${fmtTime(c.c2.utcMs)}–${fmtTime(c.c3.utcMs)} · Sun ${c.max.alt.toFixed(0)}° ${compass(c.max.az)}</small></div>`;
  }
  if (c.max.alt < -0.8) return `<div class="pop"><b class="n">${name}: below horizon</b></div>`;
  const pct = Math.min(c.obscuration * 100, 99.99);
  return `<div class="pop"><b class="p">Partial — ${pct.toFixed(pct > 99 ? 2 : 1)}% covered</b><br>
    <small>max ${fmtTime(c.max.utcMs)} · Sun ${c.max.alt.toFixed(0)}°</small></div>`;
}

function renderCard(lat, lon, label, c) {
  const el = $('status');
  const name = label || `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
  const controls = `
    <div class="controls">
      <button id="locateBtn" class="btn primary">📍 Use my location</button>
      <input id="citySearch" list="cityList" placeholder="…or type a city" autocomplete="off">
      <datalist id="cityList"></datalist>
    </div>`;
  let cls = 'none', body = '';

  if (!c || (c.max.alt < -0.8 && !(c.type === 'total' && c.c2 && stateAlt(c.c2) > -0.3))) {
    body = `<p class="verdict none">🌍 No eclipse visible here</p>
      <p class="locname">${name}</p>
      <p>On 12 Aug 2026 the total eclipse crosses <b>Iceland</b> and <b>northern Spain</b>. Explore the orange band on the map — or fly! ✈️</p>`;
  } else if (c.type === 'total' && c.max.alt > -0.3) {
    cls = 'total';
    const lowSun = c.max.alt < 12;
    const sunset = c.c4 && stateAlt(c.c4) < -0.8;
    body = `
      <p class="verdict total">🌑 YES — you're in the path of totality!</p>
      <p class="locname">${name} · 100% of the Sun covered</p>
      <div class="bigstat">${fmtDur(c.totalitySec)} of totality</div>
      <div class="timeline">
        <div class="tl"><span>Partial begins</span><b>${fmtTime(c.c1?.utcMs)}</b></div>
        <div class="tl hot"><span>TOTALITY</span><b>${fmtTime(c.c2.utcMs)}</b></div>
        <div class="tl hot"><span>Totality ends</span><b>${fmtTime(c.c3.utcMs)}</b></div>
        <div class="tl"><span>${sunset ? 'Sunset (eclipsed)' : 'Partial ends'}</span><b>${sunset ? '—' : fmtTime(c.c4?.utcMs)}</b></div>
      </div>
      <p class="hint small">Times shown in your device's time zone.</p>
      <div class="advice">☀️ During totality the Sun will be just <b>${c.max.alt.toFixed(1)}° high</b> towards <b>${compass(c.max.az)}</b> (azimuth ${c.max.az.toFixed(0)}°).
      ${lowSun ? 'That is <b>very low</b> — any building, hill or tree will block it. Find a spot with a totally open ' + compass(c.max.az) + ' horizon: shoreline, wide plain, or a west-facing summit.' : ''}
      <span id="ptCloud"></span></div>`;
  } else {
    cls = 'partial';
    const pct = Math.min(c.obscuration * 100, 99.99);
    const near = nearestOnRing(lat, lon);
    const br = bearingDeg([lat, lon], [near.lat, near.lon]);
    const sugg = spotData
      .map((s) => ({ s, d: distKm([lat, lon], [s.lat, s.lon]) }))
      .sort((a, b) => a.d - b.d).slice(0, 2);
    body = `
      <p class="verdict partial">🌗 Partial only here — ${pct.toFixed(pct > 99 ? 2 : 1)}% covered</p>
      <p class="locname">${name}</p>
      <div class="bigstat">${pct.toFixed(pct > 99 ? 2 : 1)}%</div>
      <p>${pct > 98 ? '<b>Painfully close!</b> Even 99.9% is a completely different experience from 100%.' : ''}
        The edge of <b>totality is ${near.d < 999 ? Math.round(near.d) + ' km ' + compass(br) : 'far'}</b> of you
        — go well inside the band, not just over the edge.</p>
      <div class="timeline">
        <div class="tl"><span>Partial begins</span><b>${fmtTime(c.c1?.utcMs)}</b></div>
        <div class="tl hot"><span>Maximum</span><b>${fmtTime(c.max.utcMs)}</b></div>
        <div class="tl"><span>Partial ends</span><b>${c.c4 && stateAlt(c.c4) < -0.8 ? '—' : fmtTime(c.c4?.utcMs)}</b></div>
      </div>
      <div class="advice">🚗 Nearest totality spots:
        ${sugg.map(({ s, d }) => `<b>${s.name}</b> (${Math.round(d)} km ${compass(bearingDeg([lat, lon], [s.lat, s.lon]))}, ${fmtDur(s.c.totalitySec)})`).join(' · ')}
        <span id="ptCloud"></span></div>`;
  }
  el.className = `card status-card ${cls}`;
  el.innerHTML = body + controls + '<p class="hint small">Tap the map to check any other place.</p>';
  wireControls();
}
const stateAlt = (contact) => contact.alt;

/* ------------------------------------------------------------- geolocate --- */
function locate() {
  const btn = $('locateBtn');
  if (btn) { btn.disabled = true; btn.textContent = '📡 Locating…'; }
  if (!navigator.geolocation) return locFail('Geolocation unsupported — tap the map instead.');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setPoint(pos.coords.latitude, pos.coords.longitude, 'Your location',
        pos.coords.altitude || 0, true);
    },
    (err) => locFail(err.code === 1
      ? 'Location permission denied — tap the map or search a city instead.'
      : 'Could not get a fix — tap the map or search a city instead.'),
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
  );
}
function locFail(msg) {
  const btn = $('locateBtn');
  if (btn) { btn.disabled = false; btn.textContent = '📍 Use my location'; }
  const hint = document.createElement('p');
  hint.className = 'hint small'; hint.textContent = msg;
  $('status').appendChild(hint);
}

/* ------------------------------------------------------------------ search --- */
const CITY_INDEX = [
  ...SPOTS.map(([name, lat, lon, elev]) => ({ name, lat, lon, elev })),
  ...OTHER.map(([name, lat, lon, elev]) => ({ name, lat, lon, elev })),
];
function wireControls() {
  const dl = $('cityList');
  if (dl && !dl.children.length) {
    for (const c of CITY_INDEX) {
      const o = document.createElement('option');
      o.value = c.name; dl.appendChild(o);
    }
  }
  $('locateBtn')?.addEventListener('click', locate);
  const inp = $('citySearch');
  const go = () => {
    const q = inp.value.trim().toLowerCase();
    if (!q) return;
    const hit = CITY_INDEX.find((c) => c.name.toLowerCase() === q)
      || CITY_INDEX.find((c) => c.name.toLowerCase().startsWith(q))
      || CITY_INDEX.find((c) => c.name.toLowerCase().includes(q));
    if (hit) { setPoint(hit.lat, hit.lon, hit.name, hit.elev, true); inp.value = hit.name; }
  };
  inp?.addEventListener('change', go);
  inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

/* ----------------------------------------------------------------- spots --- */
let showAllSpots = false;
function renderSpots() {
  const ol = $('spots');
  const ranked = spotData.slice().sort((a, b) => {
    const ka = a.cloud ?? a.climo * 26 + 40, kb = b.cloud ?? b.climo * 26 + 40;
    return ka - kb || b.c.totalitySec - a.c.totalitySec;
  });
  ol.innerHTML = '';
  for (const s of (showAllSpots ? ranked : ranked.slice(0, 12))) {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="cloudpct" style="background:${cloudColor(s.cloud)}22;color:${cloudColor(s.cloud)}">${s.cloud == null ? '—' : s.cloud + '%'}<br><small style="font-weight:400">cloud</small></div>
      <div class="name"><b>${s.name}</b><span>${s.note} · totality ${fmtTime(s.c.c2.utcMs, s.tz, true)} local · Sun ${s.c.max.alt.toFixed(0)}°</span></div>
      <div class="dur"><b>${fmtDur(s.c.totalitySec)}</b><span>totality</span></div>`;
    li.addEventListener('click', () => { setPoint(s.lat, s.lon, s.name, s.elev, true); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    ol.appendChild(li);
  }
  if (!showAllSpots && spotData.length > 12) {
    const li = document.createElement('li');
    li.style.display = 'block';
    li.innerHTML = `<button id="spotsMore" class="btn" style="width:100%">Show all ${spotData.length} spots (incl. Iceland)</button>`;
    li.querySelector('button').addEventListener('click', () => { showAllSpots = true; renderSpots(); });
    ol.appendChild(li);
  }
}

/* --------------------------------------------------------------- weather --- */
async function fetchClouds() {
  const note = $('wxNote');
  if (Date.now() > Date.UTC(2026, 7, 13)) { note.textContent = 'The eclipse has passed — list ranked by typical August weather.'; return; }
  try {
    const lats = spotData.map((s) => s.lat.toFixed(3)).join(',');
    const lons = spotData.map((s) => s.lon.toFixed(3)).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
      `&hourly=cloud_cover&start_date=2026-08-12&end_date=2026-08-12&timezone=UTC`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    let data = await res.json();
    if (!Array.isArray(data)) data = [data];
    data.forEach((d, i) => {
      const cc = d?.hourly?.cloud_cover;
      if (cc && cc[18] != null) spotData[i].cloud = Math.round((cc[18] + (cc[19] ?? cc[18])) / 2);
    });
    for (const s of spotData) spotMarkers.get(s.name)?.setStyle(markerStyle(s));
    note.textContent = `Cloud forecast for eclipse time (12 Aug ≈18:30 UTC / 20:30 CEST) — Open-Meteo, fetched ${fmtTime(Date.now(), undefined, false)}. Lower is better.`;
  } catch {
    note.textContent = 'Live forecast unavailable (offline?) — ranked by typical August cloudiness instead.';
  }
  renderSpots();
}
async function fetchPointCloud(lat, lon) {
  const el = $('ptCloud');
  if (!el || Date.now() > Date.UTC(2026, 7, 13)) return;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
      `&hourly=cloud_cover&start_date=2026-08-12&end_date=2026-08-12&timezone=UTC`;
    const res = await fetch(url);
    const d = await res.json();
    const cc = d?.hourly?.cloud_cover;
    if (cc && cc[18] != null) {
      const pct = Math.round((cc[18] + (cc[19] ?? cc[18])) / 2);
      el.innerHTML = ` ☁️ Cloud forecast here at eclipse time: <b style="color:${cloudColor(pct)}">${pct}%</b>.`;
    }
  } catch { /* offline — fine */ }
}

/* ------------------------------------------------------------- countdown --- */
let cdTarget = ECLIPSE_DEFAULT_MAX_UTC, cdLabel = 'to totality in Spain';
function startCountdown(c) {
  if (c && c.type === 'total' && c.c2) { cdTarget = c.c2.utcMs; cdLabel = 'to YOUR totality'; }
  else if (c && c.max) { cdTarget = c.max.utcMs; cdLabel = 'to YOUR maximum'; }
}
setInterval(() => {
  const el = $('countdown');
  let ms = cdTarget - Date.now();
  if (ms <= 0) { el.textContent = ms > -7200e3 ? '🌑 It\'s happening!' : 'Eclipse finished'; return; }
  const d = Math.floor(ms / 864e5); ms -= d * 864e5;
  const h = Math.floor(ms / 36e5); ms -= h * 36e5;
  const m = Math.floor(ms / 6e4); ms -= m * 6e4;
  const s = Math.floor(ms / 1e3);
  el.textContent = `T− ${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${cdLabel}`;
}, 1000);

/* ------------------------------------------------------------------ boot --- */
initMap();
renderSpots();
wireControls();
fetchClouds();
try {
  const last = JSON.parse(localStorage.getItem('lastPoint'));
  if (last) setPoint(last.lat, last.lon, last.label, last.elev || 0);
} catch {}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
