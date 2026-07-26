# MOB-APPLIED — TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1`  
**Disc:** `MOB-DISC-TACTICAL-PIN-SPREAD-LIKE-OPS-20260724.md`

## What you get

Near-GPS Tactical pins **split like Ops**:

1. True GPS stored on `marker._gpsLatLng` (+ `host.lat/lng`)  
2. Markers within **25 m** share a ring  
3. Display positions fan L/R/T/B (+ diags) in **screen pixels** from cluster center (~90px+)  
4. Re-spreads on zoom/move  
5. Grab circle / distance still use true GPS  

## Files

- `public/js/tactical-poi.js`  
- `public/index.html` cache  
- `scripts/verify-tactical-pin-marker-spread-ops-coloc-v1.js`  

**Cache:** `?v=20260724-tactical-pin-spread-ops-coloc-v1`  
**Verify:** `npm run verify:tactical-pin-spread`

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. Zoom to the stacked BWCs (e.g. `340200000013` / neighbor)  
3. Expect **two separate** name tags + dots (not one pile)  
4. Zoom / pan — split should hold  

Say **PASS** or **FAIL**.

## Next

After **PASS** → Security genre: `MOB-APPLY SEC-MSGWSS-HMAC-AUTH-V1`
