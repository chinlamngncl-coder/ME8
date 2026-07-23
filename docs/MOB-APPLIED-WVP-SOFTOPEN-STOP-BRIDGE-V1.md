# MOB-APPLIED: mob-wvp-softopen-stop-bridge-v1

**Date:** 2026-07-17  
**Status:** APPLIED (Soft Open UI / FLV / Stop pack — MOB 3/3)  
**Prior:** MOB 1 FLV player FAIL · MOB 2 ghost pin APPLIED  
**Lab note:** Chin online only; KK offline expected

## Mandate

Soft Open is WVP-only — Fleet `liveStreamPool` stop does **not** send SIP BYE.  
Dashboard **Stop live** must call WVP `GET /api/play/stop/{device}/{channel}` so the camera leaves live.

## What changed

| Piece | Change |
|-------|--------|
| `lib/wvpLabClient.js` | Track `activePlays` on startPlay / soft try; `stopPlay` logs + clears; export `hasActivePlay` |
| `server.js` | `stopWvpSoftOpenBridge(camId)` inside `releaseCamStreamWhenUnwatched` — parallel with Fleet pool stop |
| `public/js/video-wall.js` | Soft Open player fail also `emitOpsStopVideo` (BYE even when picture failed); `wallHasPlayerForCam` counts Soft Open `activeStreams` / ZLM overlay |
| `public/index.html` | Cache bust `video-wall.js?v=20260717-softopen-stop-bridge` |

## When bridge runs

- `FM_LAB_WVP=1` and (`FM_SOFTOPEN_WVP_ONLY` ≠ `0` **or** tracked WVP play for that cam)
- Triggered by dashboard `stop-video` → `releaseCamStreamWhenUnwatched`

## Pass / fail (operator — Chin)

1. **Restart Fleet** (server.js + wvpLabClient).
2. Hard refresh once.
3. Soft Open **Chin** (picture may still fail — OK for this MOB).
4. Press **Stop live** on wall (or pin stop that releases the stream).
5. Check cam: live LED / recording on BWC should **go off**.

| Pass | Fail |
|------|------|
| fleet.log: `wvp softopen stop bridge` + `wvp softopen stop bridge done` / `wvp stopPlay` | No bridge log; cam stays live on device |
| Chin leaves live after Stop | Cam still live until power/timeout |

## One line

**Stop live → WVP play/stop → SIP BYE (Soft Open).**
