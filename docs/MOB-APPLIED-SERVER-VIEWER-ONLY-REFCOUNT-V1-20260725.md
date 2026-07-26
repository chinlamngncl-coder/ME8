# MOB-APPLIED — SERVER-VIEWER-ONLY-REFCOUNT-V1

**Date:** 2026-07-25  
**APPLY:** `MOB-APPLY SERVER-VIEWER-ONLY-REFCOUNT-V1`

## Part 1 — Rollback

- Deleted `public/js/live-stream-consumers.js`
- Deleted verify script + prior APPLIED refcount doc
- Removed client `LiveStreamConsumers` from `video-wall.js` / `tactical-poi.js`
- Removed script tag from `index.html`

## Part 2 — Server truth

- `server.js`: `register-viewer-only` / `unregister-viewer-only` (addView/removeView only; no Soft Open)
- `stop-video` log includes `remainingTactical`
- `start-video` `alreadyOwned` treats `tactical` correctly
- `VideoWall.emitRegisterViewerOnly` / `emitUnregisterViewerOnly`
- Tactical BWC: register after FLV attach; unregister on pin close

Cache: `?v=20260725-server-viewer-only-v1`

## Smoke

1. Restart server + Ctrl+F5  
2. Pin only → video; Stop → BYE  
3. Pin + Ops → both live; Ops Stop → pin stays; Pin Stop → Ops stays  
