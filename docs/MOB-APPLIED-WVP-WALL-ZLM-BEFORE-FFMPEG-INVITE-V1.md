# MOB APPLIED — `mob-wvp-wall-zlm-before-ffmpeg-invite-v1`

**Date:** 2026-07-16  
**Status:** APPLIED  
**Operator lock:** Fleet SIP **5060 unchanged** — `docs/MOB-DISC-NO-DICTATE-CHANGE-5060.md`  
**Parent diagnose:** `docs/MOB-DISC-WVP-STARTPLAY-TIMEOUT-NOT-ZLM.md`

---

## Problem

Wall started Fleet JSMpeg → pool **INVITE on 5060** first, then soft-asked WVP `startPlay`.  
WVP play timed out (`消息超时未回复`) while cam was busy → silent FFmpeg. Looked live, not ZLM.

---

## Fix

1. **Wall** (`video-wall.js`): before Fleet INVITE/JSMpeg, probe `/api/live/playback?noFfmpegStart=1` → if `engine:zlm`, soft-attach WVP-ZLM **without** starting pool invite. On miss/fail → existing FFmpeg path.  
2. **Broker** (`livePlaybackBroker.js`): `noFfmpegStart` skips `startFfmpegFallback` (probe only).  
3. **Route** (`server.js`): honors `noFfmpegStart=1` / `probe=zlm`.  
4. **Factory** (`live-player-factory.js`): passes `noFfmpegStart` on prefer-ZLM fetch.  
5. Cache: `video-wall.js` + `live-player-factory.js` `?v=20260716-zlm-before-invite`

**Not changed:** operator BWC SIP 5060, pin/PTT/SIP cores rewrite, WVP Docker SIP port.

---

## Pass proof

Log must show **`live broker wvp-zlm primary`** when wall goes live on ZLM.  
If still only `wvp_startplay_failure` / FFmpeg invite — say so (WVP play still broken), **without** ordering a 5060 change.

---

## Operator

1. Fleet process must load new `server.js` (service restart if needed).  
2. Hard refresh dashboard (new `?v=`).  
3. Open live on Fleet wall.

---

## Rollback

Revert the four code files + cache bust strings above.
