# MOB-APPLIED — PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1

**Date:** 2026-07-21  
**APPLY:** `MOB-APPLY PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1`  
**Disc:** `docs/MOB-DISC-PIN-CLICK-POPUP-STOP-MINIMIZE-JUMP-20260721.md`

## What changed

File: `public/index.html` only (inline map pin handlers).

1. **Click always opens popup** (unless geofence draw, or real map-TV mirror viewer with `map-popout-mirror` class). Stuck `mapPopoutMirrorActive` alone no longer kills main-dashboard pin click.
2. **Open → expand** if minimized (Stop → minimize → click again shows live popup).
3. **Video sync** on click when wall already has player; else `playMapPinVideoIfPopupOpen` with forceLive.
4. **Dock storm cut:** marker click and marker `popupopen` no longer call `assignColocatedPinPopupDocks` (was immediate + delayed). `afterMarkerPopupReady` also no longer docks. **One dock** remains on map-level `popupopen`.
5. **Stop = minimize only** — unchanged (`stopPinLive` / `minimizeMapPinVideo`); wall not touched.

## Not touched

- Fit pins / Open All / WVP FLV attach / `video-wall.js` graft
- Wall ≥2 prove dock (separate path)

## Operator check

1. Hard refresh dashboard once.
2. Click Chin / kk map pin → **live pin video popup** visible.
3. Stop live on pin → **minimizes**; wall stays Live.
4. Click pin again → popup expands / shows again.
5. Layout must **not** jump/snap to top on each click.

PASS / FAIL from what you see.
