# MOB APPLIED — `mob-wvp-pin-zlm-before-ffmpeg-invite-v1`

**Date:** 2026-07-16  
**Status:** APPLIED → **FAIL / REGRESS** (see `docs/MOB-DISC-WVP-ZLM-FIRST-REGRESS-NO-VIDEO.md`)  
**Operator lock:** Fleet SIP **5060 unchanged** — `docs/MOB-DISC-NO-DICTATE-CHANGE-5060.md`  
**Parent diagnose:** `docs/MOB-DISC-PIN-LIVE-NOT-ZLM-OPERA-BLACK.md`

---

## Problem

Pin / map live skipped wall ZLM-first: went straight to Fleet INVITE + JSMpeg.  
Wall path still called `ensureInvite` in `assignCamToSlot` **before** the ZLM probe → cam busy → WVP `startPlay` timeout / SSRC port=-1 → silent FFmpeg.

---

## Fix

1. **`video-wall.js`**
   - Pin open (`playOnMapPopup`): no early `requestStreamForCam`; always `skipInvite` when ZLM helpers exist; wall assign owns ZLM-first; pin mirrors (Firmware Gold).
   - `assignCamToSlot`: defer Fleet INVITE when ZLM soft helpers available (`skipInvite`); FFmpeg fallback calls `inviteAfterZlmMiss`.
   - `tryPinZlmBeforeFfmpegInvite` for pin-only attach paths (no wall stage yet).
   - Wall/pin FFmpeg fallback: invite **after** ZLM miss only.
2. **`livePlaybackBroker.js`**: one `stopPlay` then retry `startPlay` on first failure (clear stale RTP / “stream already exists”).
3. Cache: `video-wall.js` + `live-player-factory.js` `?v=20260716-pin-zlm-before-invite`

**Not changed:** operator BWC SIP 5060, dual pin JSMpeg when wall live, PTT/SIP cores.

---

## Pass proof

Log must show **`live broker wvp-zlm primary`** when pin/wall goes live on ZLM.  
If still only `wvp_startplay_failure` / `zlm probe idle` — say so (WVP play still broken), **without** ordering a 5060 change.

---

## Operator

1. Restart Fleet service so `livePlaybackBroker.js` loads.  
2. Hard refresh dashboard (new `?v=`).  
3. Open live from **pin** (and/or wall) on Fleet `:3988`.  
4. Confirm log line `live broker wvp-zlm primary` — that is the only ZLM pass.

---

## Rollback

Revert `public/js/video-wall.js`, `lib/livePlaybackBroker.js`, cache bust in `public/index.html`.
