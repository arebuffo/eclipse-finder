import { localCircumstances } from './engine.mjs';
import { PATH } from './path-data.js';
import { t, getLang, setLang, compass, fmtPct } from './i18n.js';

/* ---------------------------------------------------------- monetisation --- */
// Drop your affiliate IDs here when you have them; links work fine without.
const AFFIL = {
  amazonTag: '',   // e.g. 'eclipsefinder-21' (Amazon.es Associates)
  bookingAid: '',  // e.g. '1234567' (Booking.com affiliate id)
};
function glassesUrl() {
  const base = 'https://www.amazon.es/s?k=' + encodeURIComponent(
    getLang() === 'es' ? 'gafas eclipse solar ISO 12312-2' : 'solar eclipse glasses ISO 12312-2');
  return AFFIL.amazonTag ? `${base}&tag=${AFFIL.amazonTag}` : base;
}
function staysUrl(place) {
  const base = 'https://www.booking.com/searchresults.html?ss=' + encodeURIComponent(place) +
    '&checkin=2026-08-11&checkout=2026-08-13&group_adults=2';
  return AFFIL.bookingAid ? `${base}&aid=${AFFIL.bookingAid}` : base;
}
// Email capture: FormSubmit delivers to the owner's inbox; swap ENDPOINT for a
// newsletter provider later without touching the UI. Address lightly obfuscated.
const CAPTURE_ENDPOINT = 'https://formsubmit.co/ajax/' + atob('YWxleC5yZWJ1ZmZvQGdtYWlsLmNvbQ==');

/* ------------------------------------------------------------------ data --- */
// Candidate viewing spots. Circumstances are COMPUTED at runtime — the list is
// only names/coords. climo = typical August cloudiness (1 good … 3 riskier),
// used to rank when the live forecast is unavailable.
const SPOTS = [
  ['A Coruña', 43.3623, -8.4115, 20, 'Europe/Madrid', 'Galicia — Atlantic coast', 'Galicia — costa atlántica', 3],
  ['Gijón', 43.5322, -5.6611, 10, 'Europe/Madrid', 'Asturias coast', 'Costa asturiana', 3],
  ['Oviedo', 43.3619, -5.8494, 230, 'Europe/Madrid', 'Asturias', 'Asturias', 3],
  ['León', 42.5987, -5.5671, 840, 'Europe/Madrid', 'Dry meseta', 'Meseta seca', 2],
  ['Ponferrada', 42.5461, -6.5906, 540, 'Europe/Madrid', 'El Bierzo valley', 'Valle de El Bierzo', 2],
  ['Santander', 43.4623, -3.81, 15, 'Europe/Madrid', 'Cantabria coast', 'Costa cántabra', 3],
  ['Bilbao', 43.263, -2.935, 20, 'Europe/Madrid', 'Near northern edge — short totality', 'Cerca del borde norte — totalidad corta', 3],
  ['Vitoria-Gasteiz', 42.8467, -2.6716, 525, 'Europe/Madrid', 'Basque Country', 'País Vasco', 2],
  ['Burgos', 42.3439, -3.6969, 860, 'Europe/Madrid', 'Castilla — good odds', 'Castilla — buenas probabilidades', 1],
  ['Palencia', 42.0095, -4.5288, 740, 'Europe/Madrid', 'Castilla', 'Castilla', 1],
  ['Valladolid', 41.6521, -4.7286, 700, 'Europe/Madrid', 'Castilla', 'Castilla', 1],
  ['Logroño', 42.4627, -2.445, 380, 'Europe/Madrid', 'La Rioja — Ebro valley', 'La Rioja — valle del Ebro', 1],
  ['Soria', 41.7666, -2.479, 1060, 'Europe/Madrid', 'High meseta', 'Meseta alta', 1],
  ['Tudela', 42.0617, -1.606, 265, 'Europe/Madrid', 'Ribera de Navarra', 'Ribera de Navarra', 1],
  ['Zaragoza', 41.6488, -0.8891, 200, 'Europe/Madrid', 'Ebro valley — usually driest', 'Valle del Ebro — el más despejado', 1],
  ['Daroca', 41.1146, -1.4155, 780, 'Europe/Madrid', 'Aragón', 'Aragón', 1],
  ['Alcañiz', 41.0511, -0.1336, 380, 'Europe/Madrid', 'Bajo Aragón — dry', 'Bajo Aragón — seco', 1],
  ['Calatayud', 41.3535, -1.643, 530, 'Europe/Madrid', 'Aragón', 'Aragón', 1],
  ['Teruel', 40.344, -1.1069, 915, 'Europe/Madrid', 'Aragón highlands', 'Sierras de Teruel', 1],
  ['Cuenca', 40.0704, -2.1374, 950, 'Europe/Madrid', 'Near southern edge', 'Cerca del borde sur', 2],
  ['Castellón', 39.9864, -0.0513, 30, 'Europe/Madrid', 'Med coast — low sun', 'Costa mediterránea — sol bajo', 2],
  ['Sagunto', 39.6764, -0.2733, 50, 'Europe/Madrid', 'Med coast', 'Costa mediterránea', 2],
  ['Valencia', 39.4699, -0.3763, 15, 'Europe/Madrid', 'Near southern edge, sun very low', 'Cerca del borde sur, sol muy bajo', 2],
  ['Peñíscola', 40.3589, 0.4056, 10, 'Europe/Madrid', 'Med coast', 'Costa mediterránea', 2],
  ['Palma de Mallorca', 39.5696, 2.6502, 10, 'Europe/Madrid', 'Sun ≈2° — needs open sea horizon W', 'Sol ≈2° — necesita horizonte marino al O', 2],
  ['Alcúdia', 39.8499, 3.124, 10, 'Europe/Madrid', 'Mallorca north coast', 'Norte de Mallorca', 2],
  ['Ibiza', 38.9067, 1.4206, 10, 'Europe/Madrid', 'Southern edge, sun ≈3°', 'Borde sur, sol ≈3°', 2],
  ['Maó (Menorca)', 39.8885, 4.2658, 50, 'Europe/Madrid', 'Totality ends at sunset', 'La totalidad acaba al ponerse el sol', 2],
  ['Reykjavík', 64.1466, -21.9426, 40, 'Atlantic/Reykjavik', 'Iceland — Sun 25° up', 'Islandia — Sol a 25°', 3],
  ['Ísafjörður', 66.0749, -23.124, 10, 'Atlantic/Reykjavik', 'Westfjords, Iceland', 'Fiordos del oeste, Islandia', 3],
  ['Keflavík', 63.999, -22.562, 40, 'Atlantic/Reykjavik', 'Iceland', 'Islandia', 3],
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
  ['Huesca', 42.1401, -0.4089, 490], ['Barbastro', 42.0356, 0.1266, 340],
  ['Lisboa', 38.7223, -9.1393, 50], ['Porto', 41.1579, -8.6291, 80],
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
    const ax = (a[1] - lon) * cosLat, ay = a[0] - lat;
    const bx = (b[1] - lon) * cosLat, by = b[0] - lat;
    const dx = bx - ax, dy = by - ay;
    const L2 = dx * dx + dy * dy;
    let tt = L2 ? -(ax * dx + ay * dy) / L2 : 0;
    tt = Math.max(0, Math.min(1, tt));
    const px = ax + tt * dx, py = ay + tt * dy;
    const d = Math.hypot(px, py) * 111.32;
    if (d < best.d) best = { d, lat: lat + py, lon: lon + px / cosLat };
  }
  return best;
}

/* --------------------------------------------------------------- runtime --- */
const spotData = SPOTS.map(([name, lat, lon, elev, tz, noteEn, noteEs, climo]) => {
  const c = localCircumstances(lat, lon, elev);
  return { name, lat, lon, elev, tz, noteEn, noteEs, climo, c, cloud: null };
}).filter((s) => s.c && s.c.type === 'total' && s.c.max.alt > 0);
const spotNote = (s) => getLang() === 'es' ? s.noteEs : s.noteEn;

let map, tapMarker;
const spotMarkers = new Map();
let current = null; // last examined point {lat, lon, label, elev, c}
let wxState = { status: 'loading', time: null };

function initMap() {
  map = L.map('map', { zoomSnap: 0.5 }).fitBounds([[36.2, -10.2], [44.4, 4.8]]);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© OpenStreetMap',
  }).addTo(map);
  L.polygon(PATH.ring.map((p) => [p[0], p[1]]), {
    color: '#ffb347', weight: 2, opacity: 0.9, fillColor: '#ffb347', fillOpacity: 0.13,
  }).addTo(map).bindTooltip(() => t('map_tip_path'), { sticky: true });
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
  current = { lat, lon, label, elev, c };
  renderCard();
  const ll = [lat, lon];
  if (!tapMarker) tapMarker = L.marker(ll).addTo(map);
  else tapMarker.setLatLng(ll);
  tapMarker.bindPopup(briefHtml(label, c)).openPopup();
  if (pan) map.setView(ll, Math.max(map.getZoom(), 7));
  try { localStorage.setItem('lastPoint', JSON.stringify({ lat, lon, label, elev })); } catch {}
  fetchPointCloud(lat, lon);
  startCountdown(c);
}

function briefHtml(label, c) {
  const name = label || t('tapped');
  if (!c) return `<div class="pop"><b class="n">${t('pop_none', { name })}</b></div>`;
  if (c.type === 'total' && c.max.alt > -0.3) {
    return `<div class="pop"><b class="t">${t('pop_total', { dur: fmtDur(c.totalitySec) })}</b><br>
      <small>${fmtTime(c.c2.utcMs)}–${fmtTime(c.c3.utcMs)} · ${t('pop_sun', { alt: c.max.alt.toFixed(0), dir: compass(c.max.az) })}</small></div>`;
  }
  if (c.max.alt < -0.8) return `<div class="pop"><b class="n">${t('pop_below', { name })}</b></div>`;
  const pct = Math.min(c.obscuration * 100, 99.99);
  return `<div class="pop"><b class="p">${t('pop_partial', { pct: fmtPct(pct, pct > 99 ? 2 : 1) })}</b><br>
    <small>${t('pop_max', { time: fmtTime(c.max.utcMs), alt: c.max.alt.toFixed(0) })}</small></div>`;
}

function renderCard() {
  const el = $('status');
  if (!current) return;
  const { lat, lon, label, c } = current;
  const name = label === 'YOUR_LOC' ? t('your_loc') : (label || `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`);
  const controls = `
    <div class="controls">
      <button id="locateBtn" class="btn primary">${t('btn_locate')}</button>
      <input id="citySearch" list="cityList" placeholder="${t('search_ph')}" autocomplete="off">
      <datalist id="cityList"></datalist>
    </div>`;
  let cls = 'none', body = '';

  if (!c || (c.max.alt < -0.8 && !(c.type === 'total' && c.c2 && c.c2.alt > -0.3))) {
    body = `<p class="verdict none">${t('v_none')}</p>
      <p class="locname">${name}</p>
      <p>${t('n_body')}</p>`;
  } else if (c.type === 'total' && c.max.alt > -0.3) {
    cls = 'total';
    const lowSun = c.max.alt < 12;
    const sunset = c.c4 && c.c4.alt < -0.8;
    body = `
      <p class="verdict total">${t('v_total')}</p>
      <p class="locname">${t('v_total_sub', { name })}</p>
      <div class="bigstat">${t('big_total', { dur: fmtDur(c.totalitySec) })}</div>
      <div class="timeline">
        <div class="tl"><span>${t('tl_p_start')}</span><b>${fmtTime(c.c1?.utcMs)}</b></div>
        <div class="tl hot"><span>${t('tl_totality')}</span><b>${fmtTime(c.c2.utcMs)}</b></div>
        <div class="tl hot"><span>${t('tl_t_end')}</span><b>${fmtTime(c.c3.utcMs)}</b></div>
        <div class="tl"><span>${sunset ? t('tl_sunset') : t('tl_p_end')}</span><b>${sunset ? '—' : fmtTime(c.c4?.utcMs)}</b></div>
      </div>
      <p class="hint small">${t('times_note')}</p>
      <div class="advice">${t('advice_sun', { alt: c.max.alt.toFixed(1), dir: compass(c.max.az), az: c.max.az.toFixed(0) })}${lowSun ? t('advice_low', { dir: compass(c.max.az) }) : ''}<span id="ptCloud"></span></div>`;
  } else {
    cls = 'partial';
    const pct = Math.min(c.obscuration * 100, 99.99);
    const pctS = fmtPct(pct, pct > 99 ? 2 : 1);
    const near = nearestOnRing(lat, lon);
    const br = bearingDeg([lat, lon], [near.lat, near.lon]);
    const sugg = spotData
      .map((s) => ({ s, d: distKm([lat, lon], [s.lat, s.lon]) }))
      .sort((a, b) => a.d - b.d).slice(0, 2);
    body = `
      <p class="verdict partial">${t('v_partial', { pct: pctS })}</p>
      <p class="locname">${name}</p>
      <div class="bigstat">${pctS}%</div>
      <p>${pct > 98 ? t('p_close') : ''}${near.d < 999 ? t('p_edge', { km: Math.round(near.d), dir: compass(br) }) : t('p_far')}</p>
      <div class="timeline">
        <div class="tl"><span>${t('tl_p_start')}</span><b>${fmtTime(c.c1?.utcMs)}</b></div>
        <div class="tl hot"><span>${t('tl_max')}</span><b>${fmtTime(c.max.utcMs)}</b></div>
        <div class="tl"><span>${c.c4 && c.c4.alt < -0.8 ? t('tl_sunset') : t('tl_p_end')}</span><b>${c.c4 && c.c4.alt < -0.8 ? '—' : fmtTime(c.c4?.utcMs)}</b></div>
      </div>
      <div class="advice">${t('p_nearest')}${sugg.map(({ s, d }) =>
        `<b>${s.name}</b> (${Math.round(d)} km ${compass(bearingDeg([lat, lon], [s.lat, s.lon]))}, ${fmtDur(s.c.totalitySec)})`).join(' · ')}
        <span id="ptCloud"></span></div>`;
  }
  el.className = `card status-card ${cls}`;
  el.innerHTML = body + controls + `<p class="hint small">${t('hint_tap2')}</p>`;
  wireControls();
}

/* ------------------------------------------------------------- geolocate --- */
function locate() {
  const btn = $('locateBtn');
  if (btn) { btn.disabled = true; btn.textContent = t('btn_locating'); }
  if (!navigator.geolocation) return locFail(t('geo_unsupported'));
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setPoint(pos.coords.latitude, pos.coords.longitude, 'YOUR_LOC',
        pos.coords.altitude || 0, true);
    },
    (err) => locFail(err.code === 1 ? t('loc_denied') : t('loc_fail')),
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
  );
}
function locFail(msg) {
  const btn = $('locateBtn');
  if (btn) { btn.disabled = false; btn.textContent = t('btn_locate'); }
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
      <div class="cloudpct" style="background:${cloudColor(s.cloud)}22;color:${cloudColor(s.cloud)}">${s.cloud == null ? '—' : s.cloud + '%'}<br><small style="font-weight:400">${t('lbl_cloud')}</small></div>
      <div class="name"><b>${s.name}</b><span>${spotNote(s)} · ${t('spot_sub', { time: fmtTime(s.c.c2.utcMs, s.tz, true), alt: s.c.max.alt.toFixed(0) })} · <a class="stay" href="${staysUrl(s.name)}" target="_blank" rel="sponsored noopener">${t('link_hotels')}</a></span></div>
      <div class="dur"><b>${fmtDur(s.c.totalitySec)}</b><span>${t('lbl_totality')}</span></div>`;
    li.querySelector('a.stay').addEventListener('click', (e) => e.stopPropagation());
    li.addEventListener('click', () => { setPoint(s.lat, s.lon, s.name, s.elev, true); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    ol.appendChild(li);
  }
  if (!showAllSpots && spotData.length > 12) {
    const li = document.createElement('li');
    li.style.display = 'block';
    li.innerHTML = `<button id="spotsMore" class="btn" style="width:100%">${t('spots_more', { n: spotData.length })}</button>`;
    li.querySelector('button').addEventListener('click', () => { showAllSpots = true; renderSpots(); });
    ol.appendChild(li);
  }
}

/* --------------------------------------------------------------- weather --- */
function renderWxNote() {
  const note = $('wxNote');
  if (wxState.status === 'ok') note.textContent = t('wx_ok', { time: wxState.time });
  else if (wxState.status === 'fail') note.textContent = t('wx_fail');
  else if (wxState.status === 'past') note.textContent = t('wx_past');
  else note.textContent = t('wx_loading');
}
async function fetchClouds() {
  if (Date.now() > Date.UTC(2026, 7, 13)) { wxState.status = 'past'; renderWxNote(); return; }
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
    wxState = { status: 'ok', time: fmtTime(Date.now(), undefined, false) };
  } catch {
    wxState.status = 'fail';
  }
  renderWxNote();
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
      el.innerHTML = t('advice_cloud', { pct, color: cloudColor(pct) });
    }
  } catch { /* offline — fine */ }
}

/* --------------------------------------------------------- email capture --- */
function wireEmail() {
  const form = $('emailForm'), input = $('emailInput'), btn = $('emailBtn'), msg = $('emailMsg');
  try {
    if (localStorage.getItem('signed2027')) {
      form.hidden = true; msg.hidden = false; msg.textContent = t('email_ok');
    }
  } catch {}
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/.+@.+\..+/.test(email) || $('honey').value) return;
    btn.disabled = true; btn.textContent = t('email_sending');
    try {
      const res = await fetch(CAPTURE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email,
          _subject: 'Eclipse Finder — 2027 signup',
          message: `2027 eclipse notify request from ${email} (lang=${getLang()})`,
          _template: 'table', _captcha: 'false',
        }),
      });
      if (!res.ok) throw new Error(res.status);
      form.hidden = true; msg.hidden = false; msg.textContent = t('email_ok');
      try { localStorage.setItem('signed2027', email); } catch {}
    } catch {
      msg.hidden = false; msg.textContent = t('email_fail');
      btn.disabled = false; btn.textContent = t('email_btn');
    }
  });
}

/* ------------------------------------------------------------- countdown --- */
let cdTarget = ECLIPSE_DEFAULT_MAX_UTC, cdLabelKey = 'cd_spain';
function startCountdown(c) {
  if (c && c.type === 'total' && c.c2) { cdTarget = c.c2.utcMs; cdLabelKey = 'cd_your_tot'; }
  else if (c && c.max) { cdTarget = c.max.utcMs; cdLabelKey = 'cd_your_max'; }
}
setInterval(() => {
  const el = $('countdown');
  let ms = cdTarget - Date.now();
  if (ms <= 0) { el.textContent = ms > -7200e3 ? t('cd_now') : t('cd_done'); return; }
  const d = Math.floor(ms / 864e5); ms -= d * 864e5;
  const h = Math.floor(ms / 36e5); ms -= h * 36e5;
  const m = Math.floor(ms / 6e4); ms -= m * 6e4;
  const s = Math.floor(ms / 1e3);
  el.textContent = `T− ${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${t(cdLabelKey)}`;
}, 1000);

/* -------------------------------------------------------------- language --- */
function applyStatic() {
  document.documentElement.lang = getLang();
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  const search = $('citySearch');
  if (search) search.placeholder = t('search_ph');
  $('emailInput').placeholder = t('email_ph');
  $('langBtn').textContent = getLang() === 'es' ? 'EN' : 'ES';
  $('glassesLink').href = glassesUrl();
}
function wireLang() {
  $('langBtn').addEventListener('click', () => {
    setLang(getLang() === 'es' ? 'en' : 'es');
    applyStatic();
    renderWxNote();
    renderSpots();
    if (current) renderCard();
  });
}

/* ------------------------------------------------------------------ boot --- */
initMap();
applyStatic();
wireLang();
wireEmail();
renderSpots();
renderWxNote();
wireControls();
fetchClouds();
try {
  const last = JSON.parse(localStorage.getItem('lastPoint'));
  if (last) setPoint(last.lat, last.lon, last.label, last.elev || 0);
} catch {}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
