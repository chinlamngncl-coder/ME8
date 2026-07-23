# MOB-APPLIED: mob-softopen-no-auto-stop-on-player-fail-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Fixes regression from:** `mob-wvp-softopen-stop-bridge-v1` (auto BYE on player fail)

## Bug

Soft Open got FLV URL (`wvp-zlm primary`), then ~0.5–1s later dashboard sent `stop-video` **without** operator Stop → `wvp softopen stop bridge` BYE. No picture + cam auto-off.

**Cause:** `softOpenPlayerFailed` called `emitOpsStopVideo(camId)`.

## Fix

| Piece | Change |
|-------|--------|
| `public/js/video-wall.js` | Removed `emitOpsStopVideo` from `softOpenPlayerFailed` |
| `public/index.html` | Cache bust `video-wall.js?v=20260717-no-auto-stop-fail` |

Stop bridge on **real** Stop live stays (server `stopWvpSoftOpenBridge`). Ghost pin cleanup on fail stays (UI only — no BYE).

## Pass / fail (Chin)

1. Hard refresh once (no Fleet restart required — UI only).
2. Soft Open Chin.

| Pass | Fail |
|------|------|
| No `stop-video` / `wvp softopen stop bridge` unless you press Stop | Auto stop ~1s again |
| Cam may still have no picture (MOB 1 open) but should **not** auto-BYE | |

## One line

**Player fail ≠ Stop — no auto BYE.**
