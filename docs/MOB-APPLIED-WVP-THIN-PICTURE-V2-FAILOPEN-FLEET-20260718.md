# MOB APPLIED — wvp-thin-picture-v2-failopen-fleet

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY wvp-thin-picture-v2-failopen-fleet`  
**Disc:** `MOB-DISC-NOT-GIVE-UP-WVP-V2-RISK-NEXT-20260718.md`

---

## Changes

| File | Change |
|------|--------|
| `server.js` | **Removed** thin-cam Fleet INVITE skip (v1 death). Soft Open-only=0 → Fleet always invites |
| `lib/livePlaybackBroker.js` | WVP try only when pool already live; fail → FFmpeg; log `v2:true` |
| `.env` | `FM_LAB_WVP=1` · `FM_WVP_THIN_CAMS=…0008` · Soft Open-only `0` · presence `0` |

---

## You do

1. `RESTART-FLEET.bat`  
2. Chin live on `localhost:3988`  
3. Report: `v2-fleet-ok-zlm-yes` / `v2-fleet-ok-zlm-no` / `v2-live-dead`

**One line:** v2 on — Fleet never skipped; WVP soft try Chin; fail-open FFmpeg.
