# MOB-APPLIED — PIN-MIRROR-CACHEBUST-AND-PROVE-LOG-V1

**Date:** 2026-07-21  
**Execute:** `MOB-EXECUTE-PIN-MIRROR-CACHEBUST-AND-PROVE-LOG-V1`  
**Disc:** `docs/MOB-DISC-SAME-FAIL-NO-CHANGE-KK-DEAD-JUMP-FOR-GOOGLE-20260721.md`

## What changed

| File | Change |
|------|--------|
| `public/index.html` | `video-wall.js?v=20260721-pin-mirror-wall-video-v1` (cache bust only) |
| `public/js/video-wall.js` | `console.log('[me8-pin-mirror]', camId, srcKind)` at start of successful `startMapMirrorFromWall` |

## Not touched

- Dock / Fit pins / jump storm  
- kk registration / SIP  
- Second FLV on pin  

## Operator check

1. Hard refresh (Ctrl+Shift+R).  
2. DevTools Network: `video-wall.js?v=20260721-pin-mirror-wall-video-v1` loads.  
3. Chin wall Live with picture → click Chin pin.  
4. Console: look for `[me8-pin-mirror] <camId> video` (or `canvas`).

| PASS | FAIL |
|------|------|
| New `?v=` loads + log appears + pin shows wall picture | Say which: no new `?v=` / no log / log but still black |
