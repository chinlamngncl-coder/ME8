# MOB-APPLIED — TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1`  
**Disc:** `MOB-DISC-OPEN-GRABBED-PIN-POPUP-LIVE-20260724.md`

## What you get

**Open grabbed** now opens **video on the POI pin** (same path as **Open linked**):

1. POIs inside grab circle with a **linked fixed cam** → pin popup + FLV (up to 8)  
2. Several pin popups can stay open (`autoClose: false`)  
3. BWC / orphan fixed cams → **wall spill** only (no BWC-in-popup yet) + honest toast  
4. Toast: “Opened N on pins” / “pins · wall” / “wall only…” / “link a fixed cam…”

**Concept correction (2026-07-24):** Operator rejected BWC→wall. Success must be **BWC on pin + cycle** — see `MOB-DISC-OPEN-GRABBED-BWC-PIN-CYCLE-20260724.md`. Do not treat wall spill as PASS for BWC.

Success for fixed-linked POIs = **picture in the pin bubble**.

## Files

- `public/js/tactical-poi.js` — multi `liveByPoi`, `openPoiPinLive`, rewritten `openInCircle`  
- `public/index.html` cache  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-open-grabbed-pin-popup-live-v1.js`  

**Cache:** `?v=20260724-tactical-open-grabbed-pin-popup-live-v1`  
**Verify:** `npm run verify:tactical-pin-grab`

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. **PREPARE:** Place 2+ POIs, each **link a fixed cam**  
3. **OPERATE → Grab circle** over those pins → **Open grabbed**  
4. Expect: **pin popups open with live video** (toast “Opened N on pins”)  
5. If only BWC in circle (no POI+fixed): toast explains wall-only  

Say **PASS** or **FAIL**.

## Next APPLY (ladder)

After **PASS** → `MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`  
Dual-pane stays PARKED.
