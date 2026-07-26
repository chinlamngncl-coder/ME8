# MOB-APPLIED — TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1`  
**Disc:** `MOB-DISC-TACTICAL-PIN-CLUSTER-TEAM-COLOR-20260724.md`

## What you get

1. **Team color** on Tactical BWC / grab pins — same `dispatchGroupLookup` idea as ops (not purple / amber)  
2. **Cluster + spiderfy** on the Tactical map (`L.markerClusterGroup`, ops-like radius / max zoom)  
3. **Live BWC GPS pins** on Tactical so full-map view shows units + cluster badge  
4. Open grabbed reuses live BWC hosts; popup fan + video drag still work  
5. Manual prepare POIs stay **slate** (neutral), not team purple  

## Files

- `public/js/tactical-poi.js` — cluster group, team color, live BWC sync  
- `public/css/global.css` — cluster badge + neutral pin default  
- `public/index.html` — markercluster **before** tactical scripts; cache bust  
- `scripts/verify-tactical-pin-cluster-team-color-v1.js`  

**Cache:** `?v=20260724-tactical-pin-cluster-team-color-v1`  
**Verify:** `npm run verify:tactical-pin-cluster`

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. Zoom **out** (full map): expect a **visible** cluster / pins (not invisible purple)  
3. Zoom in or click cluster → pins **spiderfy** apart; BWC pins match **ops team colors**  
4. Open grabbed still opens pin video; drag title bar still moves bubble only  

Say **PASS** or **FAIL**.

## Next APPLY (ladder)

After **PASS** → `MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`
