# MOB-APPLIED — PIN-CLICK-STARTS-WALL-THEN-MIRROR-V1 (dynamic)

**Date:** 2026-07-21  
**Execute:** `MOB-EXECUTE-PIN-CLICK-STARTS-WALL-THEN-MIRROR-DYNAMIC`  
**Disc:** `docs/MOB-DISC-PIN-FIRST-FAIL-PANEL-THEN-PIN-ROUTE-CHEAT-20260721.md`

## What changed

| File | Change |
|------|--------|
| `server.js` | `server-capabilities.wvpVideoHandoff` from `FM_WVP_VIDEO_HANDOFF` |
| `public/js/video-wall.js` | Pin-first → wall start for **that camId**; wait overlay; no pin JSMpeg under handoff; `onProven` → `syncMapPopupPlayer(camId)` |
| `public/index.html` | Cache `video-wall.js?v=20260721-pin-click-starts-wall-mirror-v1` |

### Dynamic helpers (no hardcoded device IDs)

- `startWallLiveForPinCam(camId)` — same as panel Play (`forceInvite` + `userPlay`) for whatever `camId` the pin click passed
- `enterPinWaitForWallMirror(camId, host)` — "Live streaming…" only; strips pin JSMpeg canvases
- `isWvpVideoHandoffMode()` — from capabilities / sticky `video-stream-ready`

### Paths

1. `attachMapPopupPlayer(camId)` — no mirror source under handoff → start wall for **that** camId → wait  
2. `playOnMapPopup(camId, …)` — under handoff → wall start, **no** `attachCanvasPlayer` on pin  
3. FLV `onProven` → `syncMapPopupPlayer(camId)` at 120ms + 500ms → `startMapMirrorFromWall`

## Hardcode audit

Patch uses only the runtime `camId` argument. **No** Chin / kk / `…008` / `…009` in the new logic.

## Operator check

1. Hard refresh (new `?v=`).  
2. Wall **Idle** (no Live panels).  
3. Click **any** map pin alone (e.g. Chin or kk) — not panel first.

| PASS | FAIL |
|------|------|
| That cam’s wall goes Live, pin mirrors picture | Pin-first still black / needs panel first |
