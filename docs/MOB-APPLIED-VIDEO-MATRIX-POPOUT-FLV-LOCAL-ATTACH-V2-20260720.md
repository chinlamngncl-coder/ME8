# MOB-APPLIED — Video matrix popout FLV local attach V2

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-VIDEO-MATRIX-POPOUT-FLV-LOCAL-ATTACH-V2`  
**Scope:** `public/matrix.html`, `public/js/video-matrix.js`, `public/js/video-wall.js`, `public/js/command-wall.js`, `public/index.html`.  
**Operator test:** **PASS** (2026-07-20).

---

## Problem

V1 matrix MOB mirrored opener `<video>` via `drawImage` in a **separate window** — unreliable under FLV/MSE. Cells showed **`No live video on this panel`** while parent was Live.

---

## Change

| Piece | Change |
|-------|--------|
| `matrix.html` | Own `socket.io` + `mpegts` + `live-player-factory`; **local FLV attach** per cell |
| `VideoMatrix.getSlotFlvUrl` | Reads cached handoff URL from opener (`VideoWall` / `CommandWall`) |
| `VideoWall.getHandoffFlvUrlForCam` | Exposes `wvpHandoffFlvByCam` to matrix |
| `CommandWall.getHandoffFlvUrlForCam` | Same for CW matrix |
| Surface | `ops` or `command-wall` matching matrix source |
| Play / Stop | Still delegate to opener; matrix emits own `start-video` / `stop-video` for viewer refs |
| Classic | JSMpeg fallback when no `flvUrl` |

Cross-window canvas/video mirror removed for handoff path.

---

## Cache bust

- `index.html`: `video-matrix.js?v=20260720-matrix-flv-local-v2`

---

## Operator test

1. Hard refresh ops dashboard (Ctrl+Shift+R).
2. Handoff on. Play 1–2 panels Live on ops wall.
3. Video matrix → pick those panels → Open.
4. **PASS:** Matrix shows picture on each selected panel (not “No live video on this panel”).
5. Stop on matrix → parent + matrix clear for that slot.

---

## Next

| Phase | MOB |
|-------|-----|
| 6 | `PIN-FLV-MIRROR-HARDEN-V1` |
