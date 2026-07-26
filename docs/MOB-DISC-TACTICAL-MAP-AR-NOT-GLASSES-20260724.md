# MOB DISC — Tactical “AR” (map-layer, not glasses)

**Date:** 2026-07-24  
**Status:** PAPER ONLY — no APPLY · no code  
**Operator ask:** Any ability / possibility for AR? Not hardware glasses — virtual *something* on Tactical: e.g. wide-view cam call + pin/link videos on a building so ops sees BWCs walking in/on the map.

---

## Do we get what you mean?

**Yes.** You mean **ops AR on the map / Tactical surface**, not Hololens:

| You said | Product meaning |
|----------|-----------------|
| Wide-view camera we can call | Fixed / overview cam (street, roof, lobby) → live on wall / Command Wall |
| Virtual something on Tactical | Markers, hotspots, site plan overlays that are **not** a physical BWC GPS ping |
| Pin and link videos | Click a virtual pin → open linked live (fixed cam and/or BWC circle) |
| Building + BWC walking | Site context on map; BWC pins move with GPS; ops correlates overview + body cams |

That is a **Common Operational Picture overlay** — industry often brands it “AR,” but the honest stack name for us is **Map / Tactical Augmentation** (2D Leaflet + existing video).

---

## Verdict (one line)

**Possible — and partly already here.** Full glasses AR = out of scope. **Map-layer AR on Tactical is real and should be a later Tactical genre**, built on fixed cams + Open All / User Circle + Leaflet overlays — **not** a new video engine or AR SDK.

---

## What we already have (foundation)

| Piece | Today | Role in “AR” |
|-------|--------|----------------|
| **Fixed camera registry** | `lib/fixedCamRegistry.js` — lat/lng, zone, icons (`building`, `ptz`, …), ONVIF/RTSP | Real wide-view / building cams on map |
| **Command Wall** | Roster + play fixed cams + PTZ pad | Call / watch overview cams |
| **Ops map pins** | BWC GPS → markers + pin video / Open All ≤8 | Body cams “walking” on map |
| **Tactical tab** | Shell + draw zones (Module 1 path) | Home for site overlays + incident AR |
| **WVP/ZLM handoff** | `startPlay` → wall FLV | Paint pipe for any linked live |

So: **call a wide cam + see BWC on map** is already product-adjacent. What’s missing is the **virtual layer** that ties building context ↔ cams ↔ BWCs in one Tactical gesture.

---

## What we do **not** have (and should not pretend)

| Idea | Reality |
|------|---------|
| Hololens / phone camera AR glasses | **No** — different product, hardware, SDK |
| Paint 3D holograms into the BWC video frame | **No** for V1 — CV + calibration hell |
| Auto “this doorway is Door-12” from pixels | **No** without ML + labeled site model |
| Indoor room-accurate track without beacons / floor Wi‑Fi | GPS alone is **outdoor-ish**; indoor = floor plan + manual/beacon later |

Agent must not sell “full AR” when we mean **map pins + overlays + linked live**.

---

## Feasible product shape (recommended)

### Layer model (Tactical)

```
Tactical map (Leaflet #2)
  ├─ Base map / optional site ImageOverlay (floor plan / building outline)
  ├─ Zone polygons (already planned Turf)
  ├─ Virtual AR pins (POI): Door, Stair, Roof cam, Staging, Exfil
  │     each pin → links: fixedCamId(s) and/or circle of BWC ids
  ├─ Live BWC markers (GPS) moving through the picture
  └─ One-shot: Open linked video(s) via existing Open All / fixed-cam start
```

### Operator story (your building example)

1. IC opens **Tactical** for Incident X.  
2. Site plan (or building outline) sits on the map.  
3. Virtual pins: **Roof overview**, **Lobby**, **Stair B**, **Staging**.  
4. Tap **Roof overview** → wide-view fixed cam goes live (Command Wall / wall slot).  
5. BWCs with GPS appear walking on the same map; IC taps **Open Circle** for the entry team → up to 8 body cams (see User Circle disc).  
6. Ops sees **overview + bodies in one picture** — that is the “AR” win for ops.

---

## Possibility tiers (honest)

| Tier | Name | Effort | When |
|------|------|--------|------|
| **T0** | Fixed cams + BWC pins + Open All (today) | Done / polish | Now |
| **T1 — Map AR Lite** | Virtual POI markers on Tactical; click → play linked fixed cam and/or Open All linked BWCs | Medium | After Tactical Turf shell stable |
| **T2 — Site plan** | Leaflet `ImageOverlay` (floor plan / yard photo) + POIs in image coords | Medium | After T1 |
| **T3 — Incident AR pack** | Save POIs + links per Incident ID; reopen with zone | Medium | With archiver / Incident model |
| **T4 — Video-frame HUD** | Draw labels on the live `<video>` (door names, range rings) | High | Optional; easy to look gimmicky |
| **T5 — Glasses / CV AR** | Headset or pixel ML | Out of ME8 scope | Do not plan |

**Recommendation:** Aim product language at **T1 → T2**. That matches your description without fake Hololens promises.

---

## Where it lives

| Surface | Role |
|---------|------|
| **Tactical** | **Home** for virtual pins, site overlay, incident AR pack |
| **Ops map** | Keep daily dispatch clean — optional “show fixed cams” only; do not dump building blueprints here |
| **Command Wall** | Watch / PTZ the wide-view cams the AR pins call |
| **User Circle** | Batch open BWCs linked to a POI / incident (sister disc) |

Related paper: `MOB-DISC-USER-CIRCLE-BATCH-OPEN-8-10-20260724.md`

---

## Risk → one path

| Risk | Mitigation |
|------|------------|
| Invent “AR engine” / Unity / WebXR | **Forbidden** — Leaflet + existing video only |
| Second player for overview | Use fixed-cam → ZLM/WVP path already in Command Wall |
| Clutter Ops map | AR layers **Tactical-only** |
| Indoor GPS lies | T1 outdoor/site; T2 floor plan; no claim of room-accurate GPS |
| Bundle with Circle + Turf + vault | **No** — separate MOB after Module 1 basics |

**Single next genre order (when you order builds):**

```
… Tactical Turf entry/exit PASS …
USER-CIRCLE-BATCH-OPEN-V1          (ops time-saver)
TACTICAL-MAP-AR-POI-V1             ← virtual pins + link play (T1)
TACTICAL-SITE-IMAGE-OVERLAY-V1     ← building/floor plan (T2)
```

No APPLY until you name one.

---

## Naming (customer face)

Internally: **Tactical Map AR** / **Map Augmentation**.  
Customer-facing: prefer **Tactical overlays** or **Site pins** if “AR” confuses buyers into expecting glasses. Brand stays **Mobility Axiom**.

---

## Out of scope for this disc

- Buying AR glasses or phone AR toolkits  
- Rewriting WVP / pin mirror cores  
- Raising wall to 10 tiles (separate)  
- Claiming indoor meter-accurate track without new sensors  

---

## Operator next step

Paper only. If this matches your meaning:

1. Say **AR DISC OK** (or: want T2 site plan earlier / drop “AR” name / Ops also).  
2. Do **not** build yet — finish current Tactical/video stability; then name e.g. **`MOB-APPLY TACTICAL-MAP-AR-POI-V1`**.
