# MOB-APPLIED: mob-softopen-pin-stop-spare-wall-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Prior disc:** `docs/MOB-DISC-SOFTOPEN-1H-SOAK-PIN-STOP-PANEL-20260717.md`

## Mandate

Pin **Stop live** must not stop Soft Open panel. Design: pin chrome off + minimize; wall keeps playing; no WVP BYE while wall claims the cam.

## What changed

| Piece | Change |
|-------|--------|
| `cleanupPinLiveChromeOnly` | New — pin mirror/ZLM chrome + optional minimize; **never** `destroyZlmWallOverlay` |
| `cleanupGhostLiveChrome` | Wall fail path only — destroys wall ZLM + then pin-only helper (Soft Open player fail) |
| `stopPinLive` | Uses pin-only cleanup (not ghost/wall teardown) |
| `releaseServerStreamIfIdle` | Also respects `opsWallClaimsCam`; Soft Open `activeStreams` / ZLM overlay already in `wallHasPlayerForCam` |
| Cache | `video-wall.js?v=20260717-pin-stop-spare-wall` |

## Unchanged (next MOB)

- Keepalive reopen → pin fan/popup jump → `mob-softopen-reopen-no-pin-fan-storm-v1` (not this APPLY)

## Pass / fail

1. Hard refresh once.  
2. Soft Open Chin (or Chin+KK). Wall + pin live.  
3. On pin: **Stop live** (not wall Stop).

| Pass | Fail |
|------|------|
| Pin minimizes / shows stopped; **panel keeps Soft Open picture** | Panel goes black / Player error / Reconnecting forever |
| No `stop-video` / `wvp stopPlay` in fleet.log for that click | Log shows `wvp softopen stop bridge` on pin Stop alone |
| Wall **Stop** still stops both (regression check) | Wall Stop leaves cam stuck live with no BYE |

## One line

**Pin Stop = pin chrome + minimize only; Soft Open wall + WVP session spared.**
