# MOB-DISC GEO-OFFLINE-COLOUR-V1 — 2026-09-05

**Status:** paper only. Code after `MOB-APPLY GEO-OFFLINE-COLOUR-V1`.
**Ask:** offline geo must look like the rest of Mobility Axiom (dark desk), not a bright daylight OSM dump on a dark page.
**Park:** field SOS/PTT QA and manuals/locale sweep wait for SDK. This disc is desk-only map look.

## Current (do not rewrite)

| Path | What it is now |
|---|---|
| Vector 3D (`style-offline-vector` in `lib/gisOffline.js`) | Already Axiom slate: bg `#0f172a`, buildings `#1e293b` → `#64748b`, outline `rgba(148,163,184,0.45)`. **Leave.** |
| Raster pack (`style-offline` + `bg-raster`) | Raw OSM PNG on `#0f172a`. Opacity 1.0 (raster-only) / 0.92 (under 3D). **This is the bright clash.** |
| Online OSM | Not this MOB. Stay as the operator chose in Settings (auto / online / local). |

No new tile pack. No runtime recolour of PNG files on disk. No CSS page-wide `filter` on `#map` (that would tint pins, SOS, geofence).

## Locked decisions

| # | Decision | Why |
|---|---|---|
| 1 | Recolour **offline raster layer only** (`bg-raster`) via MapLibre paint. | Pins / SOS / GIS overlays stay true colour. |
| 2 | Palette = existing Axiom slate (same as vector 3D). Not a new theme. | Matches `--bg-surface` / desk. |
| 3 | Paint (locked numbers): `raster-opacity` **0.72**, `raster-saturation` **−0.65**, `raster-contrast` **−0.12**, `raster-brightness-min` **0.04**, `raster-brightness-max` **0.55**. Background stays `#0f172a`. | Dark, readable roads; not inverted neon. |
| 4 | Apply in **both** raster styles that paint `bg-raster` (raster-only + vector+raster). One helper or the same paint object twice. | No half-dark map. |
| 5 | Leaflet fallback (if a page still uses raster tiles without MapLibre): one class on the **tile pane only**, e.g. `.fm-offline-raster-pane { filter: saturate(0.35) brightness(0.55) contrast(0.9); }`. Not on markers. | Same look if a surface is still Leaflet. |
| 6 | Fail-open. Missing pack / online mode → no filter. | Colour is cosmetic. |
| 7 | Super-admin does **not** get a colour picker in this MOB. | One locked look. |

## Not in this MOB

New PMTiles, country pack rebuild, online tile tint, pin/SOS colour, Settings toggle, manuals rewrite, locale strings.

## Files (APPLY later — only these)

- `lib/gisOffline.js` — `bg-raster` paint in both offline styles.
- `public/css/global.css` — Leaflet tile-pane class only if a live Leaflet offline surface still exists at APPLY time.
- Cache bust the map script that attaches the pane class, if one is touched.

## PASS

1. Settings map source **local** (or auto with offline pack). Hard refresh.
2. Ops map: land/roads dark slate, not white OSM. Pins and SOS red stay normal.
3. If vector 3D is on: buildings still slate; raster under them not a bright sheet.
4. Switch source to **online**: OSM looks as today (no dark filter).
5. Disable / missing pack: no crash, empty/blank as today.
