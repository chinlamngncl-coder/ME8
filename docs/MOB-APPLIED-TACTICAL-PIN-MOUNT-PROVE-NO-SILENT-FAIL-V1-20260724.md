# MOB-APPLIED — TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1`  
**Disc:** `MOB-DISC-TACTICAL-PIN-MOUNT-STILL-EMPTY-20260724.md`

## How long / why short

This was a **prove/repair**, not a new architecture. Ops already mounts BWC pins from `_gpsLatLng` onto a Leaflet layer. Tactical now does the same idea on its own map with a **plain `L.layerGroup`** (cluster deferred). Smoke should be **under a couple of minutes**.

## What changed

1. **Plain pin layer** (no second-map MarkerCluster) — same GPS copy, ops-style label chrome kept  
2. GPS read matches ops: prefer `marker._gpsLatLng`  
3. **No silent swallow** on Tactical show — error → console + status  
4. After tab visible: `invalidateSize` + remount (rAF + 200ms)  
5. **On-map red banner** if 0 pins; if Ops has GPS but Tactical is empty → mount-fail text  

## Files

- `public/js/tactical-poi.js`, `tactical-shell.js`  
- `public/css/global.css`, `public/index.html`  
- locales en/zh  
- `scripts/verify-tactical-pin-mount-prove-v1.js`  

**Cache:** `?v=20260724-tactical-pin-mount-prove-v1`  
**Verify:** `npm run verify:tactical-pin-mount`

## Operator smoke (~2 min)

1. **Ctrl+F5**  
2. Glance **Ops** — note if named BWC pins exist  
3. Open **Tactical**  
4. Expect either:  
   - **Named pins** on the map, or  
   - **Red banner** explaining empty / Ops-has-pins-but-Tactical-empty  

Say **PASS** or **FAIL**.

## Next

- After **PASS** → Security genre first: `MOB-APPLY SEC-MSGWSS-HMAC-AUTH-V1` (parked Google five; beats Turf)  
- Or finish any remaining Tactical only if you override  
