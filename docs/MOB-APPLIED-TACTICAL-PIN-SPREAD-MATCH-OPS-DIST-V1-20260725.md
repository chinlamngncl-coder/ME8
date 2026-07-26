# MOB-APPLIED — TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1

**Date:** 2026-07-25  
**APPLY:** `TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1`  
**Disc:** `MOB-DISC-TACTICAL-PIN-SPREAD-TOO-WIDE-OPS-MATCH-20260725.md`

## What changed

1. **Ops exact** `distPx = Math.max(58, 38 + n * 14)` (wide 90/22 formula removed)  
2. Spread only when **zoom ≥ 16**; below that markers sit on true GPS (no island-wide fling)  
3. Re-spread still on zoomend/moveend  

**Cache:** `?v=20260725-tactical-pin-spread-match-ops-dist-v1`  
**Verify:** `npm run verify:tactical-pin-spread-ops`

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. Zoom **out** (island) — pins should stay together at GPS (not flung apart)  
3. Zoom **in** near the stack (zoom 16+) — tight Ops-style L/R split, readable labels  

Say **PASS** or **FAIL**.

## Next

After **PASS** → `MOB-APPLY SEC-MSGWSS-HMAC-AUTH-V1`
