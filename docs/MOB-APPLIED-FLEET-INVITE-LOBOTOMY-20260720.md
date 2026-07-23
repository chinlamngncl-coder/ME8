# MOB-APPLIED — Fleet INVITE lobotomy (2026-07-20)

**APPLY:** `MOB-APPLY-FLEET-INVITE-LOBOTOMY`  
**Scope:** backend only (`server.js`, `lib/liveStreamPool.js`) — **no frontend**

## Problem

With `FM_LAB_WVP=1` and `FM_SOFTOPEN_WVP_ONLY=0`, `start-video` / SOS paths still sent **Fleet SIP video INVITE (:5062)**. Cams are on **WVP :5060** → INVITE hangs → **408** → `pool stop deferred invite_in_flight` races operator stop.

## Fix

| Piece | Behavior |
|-------|----------|
| `shouldLobotomizeFleetVideoInvite` | When lab WVP on: **all BWC** skip Fleet video INVITE (including `sosServerPull`). Opt-out: `forceFleetInvite` or `FM_ALLOW_FLEET_INVITE_WITH_WVP=1`. |
| `startMediaFromDashboard` | Lobotomy **before** contact gate; emit `video-stream-ready` (`invite:false`); trust ZLM + `zlm-watch-active`. |
| `startVideoForSosAlarm` | No Fleet pull for lobotomized cams. |
| `releaseCamStreamWhenUnwatched` | WVP lobotomy → **immediate** stop (`clearInviteInFlight` + WVP `stopPlay`); no defer on `invite_in_flight`. |
| Presence | `markCamWvpHomed` on WVP online (audit trail). |

## Verify

After ME8 restart: Open Chin live → log `invite skipped` reason=`wvp_fleet_invite_lobotomy` (not `invite requested` / not 408). Stop → `pool stop immediate` or immediate `wvp stopPlay` without long defer.
