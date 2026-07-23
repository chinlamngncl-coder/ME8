# MOB DISC - Enable WVP-ZLM Primary Lab v1

**MOB:** `mob-wvp-live-adapter-enable-zlm-primary-lab-v1`  
**Date:** 2026-07-16  
**Status:** APPLIED - backend primary selection for lab wall soft overlay  
**Code touched:** `lib/livePlaybackBroker.js`  
**Env note:** `.env` comment only (`FM_LAB_WVP=1` already on; `FM_LAB_ZLM` stays `0`)

---

## Goal

Start real WVP-ZLM testing on the ME8 dashboard soft path:

```text
Operator opens one BWC live on Fleet wall
-> FFmpeg/JSMpeg starts first and stays underneath
-> /api/live/playback prefers WVP-ZLM when FM_LAB_WVP=1
-> if WVP startPlay returns FLV, soft overlay uses WVP-ZLM
-> if WVP fails, descriptor falls back to FFmpeg and JSMpeg remains
```

This is **not** the old Gate B `:8080` me8-zlm relay primary. Primary source label is `wvp-zlm`.

---

## What Changed

`lib/livePlaybackBroker.js`:

1. When `FM_LAB_WVP=1`, try `wvpLabClient.startPlay(camId)` first.
2. On success, return `engine: "zlm"` with `source: "wvp-zlm"` and WVP FLV URL (proxy preferred).
3. On WVP failure, keep existing FFmpeg auto-fallback / Gate B relay logic.
4. Do not enable `FM_LAB_ZLM=1` for this MOB.

Wall already soft-attaches when descriptor returns `engine: "zlm"` + `flvUrl`. No `video-wall.js` edit in this MOB.

---

## Operator Test

1. Restart Fleet so the new broker code loads:
   - Admin: `net stop UbitronC2`
   - Then `net start UbitronC2`
   - Or Desktop admin kill/start path if that is the lab habit
2. Open `http://192.168.1.38:3988`
3. Open **one** BWC live wall tile only
4. Expect:
   - JSMpeg appears first
   - Soft overlay may switch to WVP-ZLM if play succeeds
   - If WVP fails, video must remain on FFmpeg/JSMpeg
5. Check logs for:
   - `live broker wvp-zlm primary`
   - or `live broker fallback` with `wvp_startplay_failure`

---

## BWC note

WVP SIP is still `5061`. Camera must be registered / reachable on the WVP platform for `startPlay` to succeed. Fleet SIP `5060` remains the FFmpeg safety path underneath.

---

## Not Changed

- No pin/Firmware Gold player rewrite
- No PTT / missed-alert
- No SIP core rewrite
- No ZLM Docker config
- No Open All multi-cam ZLM force
- `FM_LAB_ZLM` remains `0`

---

## Rollback

Revert `lib/livePlaybackBroker.js` to remove `tryWvpZlmPrimary` preference.  
FFmpeg/JSMpeg wall path remains available either way.
