# MOB-APPLIED — Tactical pin Stop uses real socket (no Ops merge)

**Date:** 2026-07-25  
**MOB:** `TACTICAL-PIN-STOP-SOCKET-FIX-NO-MERGE-V1`  
**Disc:** `MOB-DISC-TACTICAL-PIN-STOP-SOCKET-FIX-NO-MERGE-20260725.md`

## Cause

`global.socket` was never set → pin Stop emitted nothing.

## Fix

- `VideoWall.emitOperatorStopVideo` / `emitStopVideo` (real internal socket)
- Tactical pin Stop calls that path when Ops is **not** showing real live video
- No wall assign / no Soft Open / no concept merge

## Cache

`video-wall.js` + `tactical-poi.js` `?v=20260725-tactical-pin-stop-socket-fix-v1`
