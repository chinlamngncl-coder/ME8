# MOB DISC — TACTICAL-MAP-AR-POI-V1: open-source stack + ship/license pack

**Date:** 2026-07-24  
**Status:** PAPER ONLY — **no code** (you said Mob disc + “what you gonna use”)  
**Product concept:** `MOB-DISC-TACTICAL-MAP-AR-NOT-GLASSES-20260724.md`  
**Phrase when build (later):** `MOB-APPLY TACTICAL-MAP-AR-POI-V1`  
**Operator ask:** Open source please; engine need not be huge; discuss what we use because we must **pack / sell / license** this module later.

---

## One-screen verdict

| Item | Lock |
|------|------|
| **AR engine?** | **None.** No WebXR, no AR.js, no Cesium, no Unity, no Mapbox proprietary GL token product. |
| **What we use** | **Leaflet we already ship** + built-in overlays/markers + our video path |
| **New npm weight** | **Zero required for V1** (optional tiny MIT helper only if POI count hurts) |
| **Sell / pack** | OK if we keep **MIT/BSD-2** libs, keep **OSM attribution**, and gate the **module** with Axiom license — not with a third-party map SaaS |

You’re right: the engine does not need to be huge. T1 “map AR” is **pins + links**, not a 3D AR runtime.

---

## What V1 actually is (reminder)

**Tactical Map AR POI** = place **virtual markers** on the Tactical map → each POI can **link** to:

- one or more **fixed cams**, and/or  
- a **BWC circle** (≤8 open via Open All path later),  

…then operator clicks POI → call existing live (`startPlay` / Command Wall / Open All).  

**Not** glasses. **Not** drawing holograms into the BWC video frame.

---

## Stack we will use (recommended — locked for discussion)

### Core (already in ME8 — reuse)

| Piece | Role | License (ship notes) |
|-------|------|----------------------|
| **Leaflet** (`public/vendor/leaflet/`) | Map, markers, popups, layers | **BSD-2-Clause** — redistributable; keep copyright notice in ship legal pack |
| **Leaflet.draw** (`public/vendor/leaflet-draw/`) | Already used for zones — **not required** for POI V1 place-click, but same map | **MIT** — redistributable |
| **Fixed cam registry** | Wide-view / building cams to link | Our code |
| **WVP/ZLM + wall Open All** | Paint live when POI opens | Our code |
| **Tactical shell** | Home surface (`#ax-panel-tactical`) | Our code |

### Leaflet APIs for POI (no new library)

| Need | Use |
|------|-----|
| Virtual pin | `L.marker` / `L.divIcon` (custom “AR POI” chrome) |
| Group / show-hide | `L.layerGroup` or `L.featureGroup` |
| Persist shape | GeoJSON `Feature` / `FeatureCollection` (Point) — same family as zones |
| Optional site plan (T2, not this MOB) | `L.imageOverlay(url, bounds)` — still Leaflet core |
| Click → open video | Our JS → existing fixed-cam / `openAllLivePins` |

**V1 needs no Cesium, no Three.js, no AR.js, no MapLibre rewrite.**

### Optional later (only if POIs get crowded)

| Lib | Why | License | When |
|-----|-----|---------|------|
| **Leaflet.markercluster** | Many POIs at one zoom | **MIT** | After V1 if list > ~30 and map clutter |
| **@turf/helpers** (points only) | Already planned for zone entry/exit | **MIT** | Turf genre — not required to *place* POIs |

Do **not** add markercluster in POI V1 unless lab proves clutter.

---

## What we explicitly will **not** use

| Reject | Why |
|--------|-----|
| **AR.js / A-Frame / WebXR** | Wrong product (camera-phone / headset); heavy; poor ops desk fit |
| **Cesium / 3D globe** | Huge; overkill for building pins; pack size + GPU |
| **Mapbox GL JS (paid token tiers)** | Token + commercial terms complicate customer ship; we are not buying a map SaaS for this module |
| **Google Maps / ARCore** | Not open; license hell for OEM pack |
| **Unity / Unreal overlay** | Different runtime; not Fleet |
| **New FLV/JSMpeg player for POI video** | Forbidden — reuse wall / Command Wall / Open All |

---

## Map tiles vs AR module (pack / sell care)

Two different license problems:

### 1) Software (Leaflet etc.) — **OK to pack**

- Leaflet **BSD-2**, Leaflet.draw **MIT**, markercluster **MIT** → fine in customer zip if `legal-notices` / THIRD-PARTY list updated (you already have OSM note in `public/legal-notices.html`).

### 2) Base map imagery — **not “our AR engine”**

Today Tactical uses **OSM raster tiles** (`tile.openstreetmap.org`).  

| Concern | Practice for ship |
|---------|-------------------|
| **ODbL / attribution** | Keep visible © OpenStreetMap — already pattern on Ops |
| **OSMF tile usage** | Heavy production traffic should **not** hammer public OSM tiles forever — ship path should prefer **customer tiles**, **offline pack**, or existing ME8 offline/pmtiles path (`map-offline-*`) |
| **AR POI module** | POIs are **our GeoJSON + links** — independent of who paints the basemap |

**Sell story:** License sells **Tactical Map AR (POI + video link)** as an Axiom module. Basemap is customer-provided or OSM-attributed offline — we do **not** sell Mapbox as the AR engine.

---

## Module / license packing (product, not code today)

When you later want to **sell this module**:

| Layer | Approach |
|-------|----------|
| **Feature flag** | e.g. license entitlement `tacticalMapAr` / `tacticalPoi` (same pattern as other gated modules) |
| **Ship desk** | Optional include: Tactical AR POI UI + docs; omit if license SKU without it |
| **THIRD-PARTY** | Leaflet + draw (+ cluster if added) listed; no proprietary AR SDK line item |
| **Data** | Customer owns site POI GeoJSON / floor images; we don’t claim OSM data as ours |

POI V1 code MOB should stay **additive** under Tactical so license can strip/hide without ripping Ops.

---

## V1 scope when APPLY lands (preview — still not building)

**In**

- Place / edit / delete **POI markers** on Tactical map only  
- Fields: name, lat/lng, optional notes, **links** (`fixedCamId[]`, later `circleId` / cam list)  
- Persist: browser first (like zone list stub) or thin JSON under storage — match Tactical zone stub style  
- Click POI → open linked fixed cam via **existing** path (Command Wall / fixed-cam start)  
- Rail chrome: Add POI · list · Open linked  

**Out of V1**

- Floor-plan `ImageOverlay` (that’s **T2** / `TACTICAL-SITE-IMAGE-OVERLAY-V1`)  
- User Circle batch (sister MOB)  
- Turf auto entry  
- Glasses / video-frame HUD  
- New map engine  
- Raising wall to 10  

---

## Risk → one path

| Risk | Mitigation |
|------|------------|
| Agent pulls a “cool AR SDK” | **Refuse** — Leaflet only |
| OSM tile ToS in customer pack | Entitlement + offline/customer tiles note in ship guide; keep attribution |
| Bundle Circle + Turf + POI | **No** — POI V1 alone when APPLY |
| Touch Firmware Gold pin cores | POI open uses fixed-cam / Open All APIs only |

**Recommendation:** Approve this stack on paper → finish VC restore / Tactical stability as you prioritize → then clean **`MOB-APPLY TACTICAL-MAP-AR-POI-V1`** with **zero new engines**.

---

## Operator checklist

| # | Question | Suggested answer |
|---|----------|------------------|
| 1 | Leaflet-only, no AR.js/Cesium/Mapbox GL? | **YES** |
| 2 | V1 = POI markers + link to fixed cam (Open All circle later)? | **YES** |
| 3 | Site floor image = separate T2 MOB? | **YES** |
| 4 | Ship: list Leaflet/MIT/BSD in legal; gate module by Axiom license? | **YES** |

Say **AR POI STACK OK** (or change: want markercluster day-one / want ImageOverlay in same MOB).  
**No code until** a clean APPLY line without “mob disc.”
