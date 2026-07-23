# MOB-APPLIED — PIN-MIRROR-USE-WALL-VIDEO-SOURCE-V1

**Date:** 2026-07-21  
**Execute:** `MOB-EXECUTE-PIN-MIRROR-USE-WALL-VIDEO-SOURCE-V1`  
**Disc:** `docs/MOB-DISC-PIN-BLACK-WVP-MIRROR-SCAR-FOR-GOOGLE-20260721.md`  
**File:** `public/js/video-wall.js` only

## What changed

`startMapMirrorFromWall` now uses `wallMirrorSourceForCam(camId)`:

| Source | Paint |
|--------|--------|
| Classic JSMpeg wall canvas | RAF `drawImage` from canvas |
| WVP handoff `video.me8-zlm-primary` | RAF `drawImage` from video (`videoWidth` / `videoHeight`) |

- Removed hard `wallCanvasForCam` / `!srcCanvas` early fail.
- RAF defines `srcKind` (`canvas` | `video`) from the helper.
- Pin remains a **pixel mirror** — no second FLV player.

## Not touched (mandate)

- `index.html` (Leaflet click / dock / Fit pins)
- Docking, resizing, Fit pins
- Second FLV on pin

## Operator check

1. Hard refresh once (Ctrl+Shift+R) so `video-wall.js` reloads.
2. Wall Chin (or kk) Live with **visible picture**.
3. Click that map pin.

| PASS | FAIL |
|------|------|
| Pin popup shows same picture as wall | Still black |

Cache note: `index.html` was not edited (mandate). Hard refresh required.
