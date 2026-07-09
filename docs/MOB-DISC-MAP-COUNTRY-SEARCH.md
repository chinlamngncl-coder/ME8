# MOB DISC — Map country presets vs other countries / international use

**Status:** DISC only — code-checked 2026-07-09. **No APPLY** until you approve a fix MOB.

**Trigger:** Map pop-out (Display room Monitor 3 or Operations map) shows a **country dropdown** with a few fast defaults (Singapore, Philippines, Indonesia, etc.). What if the operator needs **another country**, or deploys outside those regions?

---

## Short answer

| Question | Today |
|----------|--------|
| Can I only use those countries? | **No** — the dropdown is a **quick jump**, not a hard limit (online mode). |
| Can I search “Germany” or “Sydney”? | **No** — there is **no place search / geocoder** on the map. |
| Can I see devices in another country? | **Yes** — pan/zoom manually, or click **Fit pins** to zoom to fleet GPS. |
| Pop-out map different from Operations? | **No** — same map, same toolbar (`?popout=map` is mirror/display mode only). |
| Offline / air-gapped install? | **Limited** — only regions covered by the **shipped tile pack**; no worldwide tiles. |

The dropdown is optimised for **lab / APAC trial defaults**, not “every country we support as a product.”

---

## What the country dropdown actually does

**File:** `public/js/mobility-map-gis.js`

| Code | Behaviour |
|------|-----------|
| `COUNTRY_PRESETS` | Hardcoded **7** regions: `sg`, `ph`, `id`, `th`, `kr`, `cn`, `za` — each jumps map centre to a **capital / ops city** at zoom ~10–11 |
| `#map-country-select` | Dropdown built from presets; changing it calls `leafletMap.setView(pos, zoom)` |
| `LANG_DEFAULT` | UI language picks **default** country on first visit (e.g. English → Singapore, Filipino → Philippines, Chinese → China) |
| `LANG_OPTIONS` | Order of countries in dropdown **per language** (Chinese UI only lists **China + South Africa**) |
| `localStorage fm_map_country_v1` | Remembers last preset |

**It does not:**

- Block panning outside that country
- Filter which devices appear
- Change tile server region
- Search by city, address, or arbitrary country name

---

## Online vs offline — this is the real split

### Online (default when no offline-only flag)

| Layer | Source |
|-------|--------|
| Basemap | OpenStreetMap tiles **or** OpenFreeMap (MapLibre) — **worldwide** |
| Pins | Fleet GPS from `/api/map-positions` — **any coordinates** |
| Country dropdown | Convenience only |

**International operator with internet:** Can drag/zoom to Europe, Americas, Africa, etc. Basemap loads. Pins show if devices report GPS there. **Missing piece is search**, not map coverage.

### Offline / air-gapped (`fm-map-offline-only=1` or local tile pack)

| Layer | Source |
|-------|--------|
| Basemap | `data/gis/offline/tiles/` or PMTiles — **only shipped bbox** |
| Outside pack | Blank tiles or “offline pack missing” placeholder |
| Country dropdown | Still only APAC+ZA presets — **misleading** if pack is e.g. China-only |

**International customer on offline pack:** Must ship the **correct regional tile pack** at install time. Dropdown alone cannot fix missing tiles.

---

## Server has more presets than the UI shows

**File:** `data/gis/offline/country-presets.json`

Includes **8** entries including **`my` (Malaysia)** — but Malaysia is **not** in the client `COUNTRY_PRESETS` object, so it never appears in the dropdown.

**API:** `GET /api/gis/offline/config` returns `countryPresets` from that JSON — but **`mobility-map-gis.js` does not read it**. Client and server preset lists are **out of sync**.

---

## What works today without the dropdown

| Control | What it does |
|---------|----------------|
| **Fit pins** | Zooms to pinned devices, or all devices with GPS on map — **works anywhere on Earth** |
| **Mouse / touch pan + zoom** | Standard Leaflet navigation — worldwide when online |
| **First load auto-fit** | If fleet has GPS, map can fit bounds to devices (scope-dependent) |
| **Pop-out map** | Same toolbar; syncs view with console (`MapPopoutSync`) — country select shared |

**Practical workflow for “other country” today (online):**

1. Open map (Operations or Monitor 3 pop-out).
2. Click **Fit pins** if fleet is there — **fastest**.
3. Or manually pan/zoom to the region (no search box).

---

## Gaps (why it feels wrong for international use)

| Gap | Severity | Notes |
|-----|----------|-------|
| No **place / city / country search** | **High** | Genetec/Milestone have geocoding or address search; we have none |
| Dropdown looks like **complete country list** | **High** | Operators assume US/UK/AU/JP “aren’t supported” |
| Label **“Map region”** implies boundary | **Medium** | Keep **“Map region”** or **“Region”** — do **not** use “Quick jump” (rejected — see `MOB-DISC-MAP-REGION-NAMING.md`) |
| **Chinese UI** only offers CN + ZA in dropdown | **Medium** | Other presets hidden by `LANG_OPTIONS.zh` |
| **Malaysia** in server JSON, not in UI | **Low** | Sync bug |
| Offline pack not tied to dropdown choice | **Medium** | Selecting Thailand doesn’t load Thailand offline layer on client (server JSON has `offlineLayer` per country — unused in JS) |
| No **lat/lon** or **MGRS** jump field | **Low** | Enterprise ops sometimes need coordinate entry |

---

## Pop-out map (Display room Monitor 3)

Same as Operations map:

```
window.open('index.html?popout=map')
```

- Same `#map-country-select` toolbar
- Same presets, same lack of search
- **Display-only** mirror (control stays on main console) — does not change map region behaviour

Opening map on a second monitor does **not** add countries or search — it only moves the same map surface.

---

## DISC verdict

| Stance | Detail |
|--------|--------|
| **Product intent** | Dropdown = **fast defaults for trial regions** (APAC + ZA + CN), not global country picker |
| **Online international** | **Supported via pan/zoom + Fit pins**; UX is poor without search |
| **Offline international** | **Requires correct tile pack** at deploy — not a map-settings problem alone |
| **Wrong fix** | Adding 50 countries to a dropdown without search — still unusable for “find Frankfurt” |
| **Right fix direction** | Place search (online) when approved — **leave region dropdown as-is**; optional server-driven region list |

---

## ~~Recommended MOBs~~ — superseded for labels

**Label MOB withdrawn.** See `docs/MOB-DISC-MAP-REGION-NAMING.md`.

### B — `mob-map-place-search` (risk 2, only if approved)

- Add search box on map toolbar (online installs only).
- Geocode via **Nominatim** or **Photon** (self-host or rate-limited public) → `MobilityMapGis.flyTo(lat, lon)`.
- Offline-only: hide search or show “Connect to geocode service” message.
- Privacy: log search in audit only if required; prefer self-hosted geocoder for gov customers.

### C — `mob-map-presets-from-server` (risk 1)

- Build dropdown from `GET /api/gis/offline/config` → `countryPresets` (merge with client fallbacks).
- Add missing **`my`**; allow installer to extend `country-presets.json` without JS edit.
- Optional: when offline layer exists for preset, load matching geojson (wire `offlineLayer` — today unused on client).

### D — Deploy / packaging (not a UI MOB)

- Customer in Australia → ship AU tile pack + add `au` to `country-presets.json`.
- Document in Site readiness: **Map coverage = installed GIS pack**, not UI language.

**Suggested order:** **B** (search) only when customer needs it → **C** (preset sync) per deploy pack.

---

## Apply when ready

Examples:

- `MOB-APPLY mob-map-place-search`
- `MOB-APPLY mob-map-presets-from-server`

Related: `docs/MOB-DISC-MAP-REGION-NAMING.md`, `docs/MOB-DISC-DISPLAY-ROOM-POPOUT-VS-TAB.md` (Monitor 3 pop-out), `docs/LAB-8BWC-README.md` (offline map packs).
