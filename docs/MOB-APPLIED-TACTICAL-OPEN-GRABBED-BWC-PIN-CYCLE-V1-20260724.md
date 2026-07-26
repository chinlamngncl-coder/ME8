# MOB-APPLIED — TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1`  
**Disc:** `MOB-DISC-OPEN-GRABBED-BWC-PIN-CYCLE-20260724.md`

## What you get

**Open grabbed** (Tactical):

1. **Online BWC in circle** → ephemeral amber pin + **FLV on the pin** (`/api/live/playback` — independent of wall)  
2. POI fixed / POI-linked BWC → pin video as before  
3. Orphan fixed with GPS → ephemeral pin (not wall)  
4. Cap **8** live pins; if more → **Prev / Next** pages through the grab set  
5. **No** auto `openAllLivePins` / wall dump from Open grabbed  

## Files

- `public/js/tactical-poi.js`  
- `public/index.html`, `public/css/global.css`  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-open-grabbed-bwc-pin-cycle-v1.js`  

**Cache:** `?v=20260724-tactical-open-grabbed-bwc-pin-cycle-v1`  
**Verify:** `npm run verify:tactical-bwc-pin`

## Operator smoke

1. **Ctrl+F5** → **Tactical** (BWC online with GPS; wall may already show it — OK)  
2. **Grab circle** over BWC GPS → **Open grabbed**  
3. Expect: **amber pin + video in pin popup** (not a new wall storm)  
4. If >8 targets: **Prev / Next** cycles pin pages  

Say **PASS** or **FAIL**.

## Next APPLY (ladder)

After **PASS** → `MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`  
Dual-pane stays PARKED.
