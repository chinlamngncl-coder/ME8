# MOB-APPLIED — TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1`  
**Disc:** `MOB-DISC-TACTICAL-PIN-FULLVIEW-MISSING-20260724.md`  
**Repairs:** `TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1` (FAIL — pins invisible at island zoom)

## What you get

1. **Ops-style pins** on Tactical: name tag + colored team dot (same idea as ops map, ~110×52)  
2. **Larger cluster badge** so stacked units are visible when zoomed out  
3. **Live BWC with GPS** still mirrored (online or offline — offline looks muted)  
4. Status line: `{n} BWC · {m} POI on map` or **No GPS units…** if empty  
5. **Safe fallback** if `markerClusterGroup` throws → plain layer group  
6. Keeps team color, spiderfy, popup fan, video drag  

## Files

- `public/js/tactical-poi.js`  
- `public/css/global.css`  
- `public/index.html` cache  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-pin-fullview-ops-chrome-v1.js`  

**Cache:** `?v=20260724-tactical-pin-fullview-ops-chrome-v1`  
**Verify:** `npm run verify:tactical-pin-fullview`

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. Zoom **out** to full Singapore — expect **named pins** and/or a **big numbered cluster** (not blank tiles)  
3. Status under rail: count of BWC/POI, or “No GPS units…” if lab has no GPS  
4. Zoom in / click cluster → spiderfy; Open grabbed + drag video still work  

Say **PASS** or **FAIL**.

## Next APPLY (ladder)

After **PASS** → `MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`
