# Eclipse Finder — Totality Finder PWA

Installable, bilingual (English/Spanish) PWA for the **total solar eclipse of
Wednesday 12 August 2026** (Iceland → northern Spain → Balearics). Live at
**[eclipsefinders.com](https://eclipsefinders.com)**. Language is
auto-detected from the device, with a manual ES/EN toggle. Answers two questions:

1. **Will I see totality from where I am?** — geolocation (or tap the map /
   search a city) → verdict, totality duration, exact local contact times,
   Sun altitude/azimuth, and if you're outside the path: how far and in which
   direction the totality edge is, plus the nearest good spots.
2. **Where's the best place to watch?** — ranked list of spots in the path,
   ordered by the live Open-Meteo cloud-cover forecast for eclipse hour
   (falls back to typical August cloudiness offline).

## Configuration knobs (top of `app.js`)

- `AFFIL.amazonTagES` / `AFFIL.amazonTagUS` / `AFFIL.bookingAid` — affiliate IDs for the
  eclipse-glasses link (safety card) and the per-spot Booking stay links.
  Links work as plain links until set.
- `CAPTURE_ENDPOINT` — where the "notify me for 2027" form posts. Ships with
  FormSubmit (delivers signups to the owner's inbox; the first submission
  triggers a one-time activation email). Swap for Buttondown/MailerLite/etc.
  later without touching the UI.
- UI strings live in `i18n.js` (`STR.en` / `STR.es`).

The engine is generic: feed it another eclipse's Besselian elements
(`engine.mjs` → `ELEMENTS`) and regenerate the path to cover future events —
2 Aug 2027 (total, southernmost Spain & North Africa) and 26 Jan 2028
(annular over Iberia) are natural next targets.

## How it works

- `engine.mjs` — local-circumstance computation from NASA/GSFC polynomial
  Besselian elements (F. Espenak) with ΔT = 69.2 s. Verified against
  published NASA path tables and city predictions (contact times within
  ~2 s, path edge within ~1 km — run `node dev/verify.mjs`).
- `path-data.js` — pre-generated path of totality (centre line + outline,
  including the sunset/sunrise end caps) — regenerate with
  `node dev/gen-path.mjs`.
- `dev/verify.mjs` — checks the engine against published values
  (Oviedo, Bilbao, Zaragoza, Valencia, Palma, Reykjavík, Madrid…).
- `dev/make-icons.mjs` — regenerates the PWA icons (no dependencies).
- Leaflet is vendored in `vendor/leaflet/` (works offline); map tiles are
  OpenStreetMap and need network.
- `sw.js` precaches the app shell → everything except tiles and the
  forecast works offline. Installable (manifest + icons).

No build step, no dependencies — static files only. `python3 -m http.server`
to run locally. Deploys anywhere; `.github/workflows/pages.yml` auto-deploys
to GitHub Pages on every push to `main`.

⚠️ Educational tool: path-edge accuracy is ≈1–2 km (lunar-limb effects are
not modelled). Don't plan to stand on the edge of the path — move well inside.
