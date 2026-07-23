# MOB-APPLIED — ZLM watch: no unregister on remount

**APPLY:** `MOB-APPLY-ZLM-WATCH-NO-UNREGISTER-ON-REMOUNT`  
**Date:** 2026-07-19  
**Follows:** `MOB-APPLY-ZLM-WATCH-REGISTER-CALL-PTT`

## Change

- `destroyZlmWallOverlay` no longer emits `zlm-watch-unregister` (remount/destroyPlayer races were clearing viewers to 0 while picture stayed).
- Explicit **Stop** still clears via `emitOpsStopVideo` + `emitZlmWatchUnregister` in `stopSlot`.
- Cache: `video-wall.js?v=20260719-zlm-watch-stable`

## Operator

Hard refresh Ops (frontend-only). Play live → Call should keep watch ref.  
**Do not** rekey BWCs for this MOB. Dual 5060/5062 disc: `MOB-DISC-TWO-BWC-TWO-SIP-HOMES-NO-FORCE-5060-20260719.md`.
