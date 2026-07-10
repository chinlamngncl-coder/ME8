# MOB DISC — `mob-fr-snap-rail-16-metadata`

**Status:** APPLIED 2026-07-10  
**Date:** 2026-07-10  
**Trigger:** Operator wants **16** snapshot slots (space below grid); **double-click / detail** with **BWC name + location**, **copy coords** for map paste  
**Related:** `MOB-DISC-FR-SNAP-RAIL-PROPORTION-GRID.md`, `MOB-DISC-FR-HALF-FACE-SNAP-LEDGER.md`, `MOB-DISC-FR-SNAP-LEDGER-RETENTION-FTP-ZONES.md`

---

## Is it done today?

| Ask | Today |
|-----|--------|
| **16 slots** | **No** — `cropRailMax = 8`, title “Snapshot (8)” |
| **BWC name on snap detail** | **No** — lightbox = image only |
| **Location (GPS) on detail** | **No** on rail/lightbox |
| **Copy location** | **No** |
| **Double-click** | **No** — single **click** opens image lightbox only |
| **GPS on server** | **Yes** — `frSnapLedger.record` stores `lat`/`lon`/`gpsAt` per crop |
| **GPS to browser on snap** | **No** — `fr-crop-tick` sends `camId`, `deviceLabel`, `at`, `cropUrl` — **not lat/lon** |

**Verdict:** **Can be done** — data half-exists on disk; wire + UI missing.

---

## Locked layout — 16 slots

Use empty space under current 2×4 grid:

```
┌─ SNAPSHOT (16) ────────┐
│ [1][2]  row 1          │
│ [3][4]  row 2          │
│  …                     │
│ [15][16] row 8         │
└────────────────────────┘
```

| Rule | Value |
|------|--------|
| Grid | **2 columns × 8 rows = 16** |
| Cell | Keep **4:3**, `object-fit: contain` |
| Cap | `cropRailMax = 16` |
| Scroll | Rail may scroll on short screens — OK |
| Column width | Keep **240px** `ax-fr-right` unless 16 thumbs too tiny → optional **260px** (disc only if soak FAIL) |

---

## Detail panel (double-click or click — locked)

**Recommendation:** **Click** thumb → lightbox **with metadata strip** (simpler than click vs double-click split). Optional **double-click** = same (no separate behaviour).

### Show on open

| Field | Source |
|-------|--------|
| **BWC name** | `tick.deviceLabel` or `FleetDisplay.friendlyDeviceName(camId)` |
| **Cam ID** | `tick.camId` (short + copy) |
| **Time** | `tick.at` — site timezone format |
| **GPS** | `lat, lon` if known; else “No GPS” |
| **GPS age** | `gpsAt` if stale pin |
| **Match %** | When `mob-fr-rail-per-tile-score` lands; until then score if present |
| **Score / match** | `scorePct`, red border if match |

### Actions (locked)

| Button | Behaviour |
|--------|-----------|
| **Copy location** | Clipboard: `lat,lon` (6 dp) — for paste into map search / external GIS |
| **Copy as Google Maps** | `https://www.google.com/maps?q=lat,lon` (optional second format) |
| **Show on map** | `map.setView([lat,lon], zoom)` + pulse pin if `camId` known — **no** full FR modal trap |
| **Close** | Existing × |

**Map paste:** Today map has **no** coord paste box — **Copy location** is still valuable for external tools; **Show on map** is the in-app path.

---

## Data path (APPLY design)

### Option A — extend socket tick (preferred)

`frLivePoller.js` when emitting `fr-crop-tick`:

```json
{
  "camId": "…",
  "deviceLabel": "…",
  "at": "ISO",
  "cropUrl": "…",
  "lat": 1.234,
  "lon": 103.456,
  "gpsAt": "ISO|null",
  "scorePct": 0,
  "match": false,
  "ledgerId": "frs-…"
}
```

Resolve GPS same as ledger: `deps.getGps(camId)` at emit time.

### Option B — fetch on open

`GET /api/analytics/fr/snaps?camId=&limit=1` — slower, not needed if A.

`fr-alarm.js` `fillCropSlot` stores full tick in `dataset` JSON or `data-cam-id` + `data-lat` + `data-lon`.

---

## APPLY scope (one MOB)

| File | Change |
|------|--------|
| `lib/frLivePoller.js` | Add `lat`/`lon`/`gpsAt` to `fr-crop-tick` (+ offline video parity) |
| `public/js/fr-alarm.js` | `cropRailMax = 16`; slot shift 16; lightbox meta + copy + show on map |
| `public/index.html` | CSS 2×8 grid; lightbox footer styles; title i18n |
| `public/locales/en.json` | `snapshotGrid16`, copy/show labels |

**Not in this MOB:** engine swap, 16 on **ledger retention** cap change (ledger already 50k), map paste search field (follow-on if needed).

---

## Mini test

1. FR watch → **16** slots fill bottom area  
2. Click snap → see **name + time + GPS**  
3. **Copy location** → paste in notepad → valid `lat,lon`  
4. **Show on map** → map pans (Analytics page or switch to Map)  

PASS/FAIL.

---

## APPLY command

```text
MOB-APPLY mob-fr-snap-rail-16-metadata
```

Single MOB — includes 16 grid + metadata; do not split unless user says so.

---

## Bottom line

| Question | Answer |
|----------|--------|
| 16 slots? | **Yes — not built yet** |
| Info on double-click? | **Not built** — GPS on server only |
| Copy location for map? | **Yes — straightforward** |
| Done? | **No** |
| Can it be done? | **Yes** — one focused MOB |
