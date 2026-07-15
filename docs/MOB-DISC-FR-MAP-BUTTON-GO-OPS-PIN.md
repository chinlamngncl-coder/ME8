# MOB DISC — FR Map / Go to map · Ops pin focus · officer live video

**Status:** DISC only — **2026-07-11** (`mob-fr-hit-gps-on-emit` APPLIED; `mob-fr-map-focus-pin` APPLIED)  
**Trigger:** Operator — Map / Go to map click does nothing; should jump Ops and zoom catching BWC pin for live video  
**Search:** Map button, Go to map, showFrSnapOnMap, goOpsOnHit, pin focus, SOS parity  
**Related:** `MOB-DISC-FR-ALERT-GO-OPS-MAP.md`, `MOB-DISC-FR-ALERT-UX-SOP-INDUSTRY-SOS-PARITY.md`

---

## Verdict — you are right

**Map** and **Go to map** are meant to put the dispatcher on **Operations**, centred on the **catching BWC**, so they can open the **map pin popup** and start **live video** (same pin workflow as SOS, different incident type).

Today that story is **broken or invisible** — not because the idea is wrong.

---

## What each control is for (locked)

| Control | Location | Intended behaviour |
|---------|----------|-------------------|
| **Go to map** | Red toast | Switch to Ops → pan/zoom catching pin → pin ready for live |
| **Map** | Alert drawer | Same as Go to map (explicit, when already reviewing drawer) |
| **Auto jump** | On real hit (`goOpsOnHit`) | If not on Ops/CW/VC → auto Ops + pan when GPS known |
| **Open** | HQ bar | **Detail only** (drawer) — **not** map (name is confusing; keep drawer-only) |

**Officer SOP (target):**

```
FR hit → dispatcher on Ops map → catching BWC pin highlighted
      → tap pin → live video (existing map pin popup)
      → optional 500 m circle + nearby units (SOS parity MOB)
```

---

## Why click does nothing today (code truth)

### 1. Hits ship **without GPS**

`lib/frLivePoller.js` → `emitHit()` builds the socket payload **without** `lat` / `lon`.

Crop ticks use `cropTickPayload()` → `gpsFieldsForCam(camId)` — **hits do not**.

```javascript
// emitHit — no gpsFieldsForCam()
const hit = { hitId, camId, displayName, scorePct, cropUrl, ... };
```

So `hitHasGps(hit)` is **always false** on real hits unless something else merges GPS client-side (it doesn’t).

| UI effect |
|-----------|
| Drawer **Map** button → `disabled` |
| `goOpsOnHit` → switches tab only when leaving Analytics; **no pan** |
| On Ops already → **no visible change** |

### 2. Lab preview is explicitly blocked

`buildLabPreviewHit()` sets `lat: null`, `lon: null`, `_labPreview: true`.

`goOpsOnHit()` returns immediately when `_labPreview` — **by design** (no fake dispatch).

Testing with **Preview alert (lab)** → Map will never work until lab uses fleet GPS or we allow “layout-only pan” (not recommended for ship).

### 3. Map path doesn’t open pin popup / live

`focusHitOnMapQuiet()` only:

- `map.setView([lat, lon], zoom)`
- `upsertDeviceMarker(camId, lat, lon, …)`

It does **not**:

- Open the pin popup
- Start live on the pin
- Draw FR incident circle
- Flash / pulse the catching unit

`showFrSnapOnMap()` in `index.html` is the same — pan + marker only.

### 4. Toast Go to map with no `current` hit

`onFrToastGoMap()` falls back to `switchToOpsTab()` only — no pin. Rare edge case.

---

## Gap vs SOS (what “should work” means)

| SOS (works) | FR Map today |
|-------------|----------------|
| Banner + map circle | No circle |
| Pan to alarming unit | Pan only if GPS on payload (never) |
| Nearby summary | None |
| Pin popup → live | Manual find pin after pan |
| Shell never blocked | OK after freeze fix |

---

## Locked product behaviour (after MOBs)

### Step A — always useful (even without hit GPS)

On **Map** / **Go to map** (real hit only):

1. Switch to **Operations** (if not already on ops surface).
2. Resolve pin location **in order**:
   - Hit `lat`/`lon` (once server attaches GPS)
   - Else fleet **last known** pin for `camId` (`deviceMarkers` / `getGps(camId)`)
   - Else toast: “No location for this unit” — still land on Ops map
3. `setView` zoom ≥ 16, animate.
4. **Highlight** catching marker (pulse class — reuse SOS highlight if exists).
5. **Open pin popup** on catching `camId` when pin exists (officer can tap live immediately).

### Step B — SOS parity (separate MOB)

- 500 m circle at catch point
- Nearby units line (`sos-response-summary` style)
- Standby PTT updates map summary

### Lab preview

- Map stays **disabled** or shows hint only — not a ship workflow.

---

## MOB plan

| # | MOB | Delivers | Risk |
|---|-----|----------|------|
| **1** | **`mob-fr-hit-gps-on-emit`** | `emitHit` merges `gpsFieldsForCam(camId)` into hit payload | Low — server only · see `MOB-DISC-FR-BWC-GPS-TRACE-INCIDENT-ACCOUNTABILITY.md` |
| **2** | **`mob-fr-map-focus-pin`** | `showHitOnMapFromCurrent` / `goOpsOnHit` → Ops + fleet pin fallback + open popup; remove `_labPreview` block for map-only explicit clicks | Medium — `fr-alarm.js` + map helpers |
| **3** | **`mob-fr-hit-map-sos-parity`** | Circle + nearby + map summary on hit | Medium |
| **4** | **`mob-fr-hq-open-rename`** | HQ **Open** → **Details** (i18n) — avoid “open map” confusion | Low |

**Order:** **1 → 2** fixes “nothing happens”. **3** is enterprise polish.

**One MOB at a time.** Checkpoint on real hit with BWC on map and GPS reporting.

---

## PASS checkpoint — `mob-fr-map-focus-pin` (with #1)

1. Real watchlist hit (not lab preview) from BWC with known map pin.
2. From Analytics toast → **Go to map** → Ops tab, map zooms to unit, pin visible.
3. Pin popup open or one click to live — officer can start video.
4. From drawer → **Map** — same behaviour.
5. BWC with **no GPS** but pin on map → still focuses last known pin + hint “last known position”.
6. Lab preview → Map disabled or “preview only” toast (no silent no-op).

---

## Apply commands

```
MOB-APPLY mob-fr-hit-gps-on-emit
```

then

```
MOB-APPLY mob-fr-map-focus-pin
```

---

## FAQ

| Question | Answer |
|----------|--------|
| Should auto-jump on hit also zoom pin? | **Yes** — same `focusHitOnMap` helper; auto only when leaving non-ops surfaces |
| Map without GPS? | Focus **last known** fleet pin; never silent no-op |
| Open HQ bar button? | **Details** = drawer only; not map |
| Pin live video? | Reuse existing Ops pin popup — no new player in FR drawer for Act 3 |
