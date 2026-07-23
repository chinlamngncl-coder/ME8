# MOB APPLIED — WALL-AUDIO-PATH-V1

**Date:** 2026-07-22  
**Status:** PASS — operator confirmed 2026-07-22  
**Disc:** `MOB-DISC-WALL-AUDIO-PATH-V1-20260722.md`  
**Keep:** WVP handoff ON; Call/PTT untouched; map pin layout PASS untouched  
**FLV:** still `hasAudio: false` (no mpegts audio experiment)

---

## Problem

Wall Live picture OK. **Call PASS**, **PTT PASS**. **Unmute listen FAIL** — cannot hear BWC.

Cause: handoff skips Fleet SIP INVITE → classic `mediaSession` G.711 → PCM audio WSS never fed. Client also only opened PCM WS on JSMpeg attach (handoff uses FLV).

---

## Fix

| Layer | Change |
|-------|--------|
| **Server** | New `lib/wvpWallListenAudio.js` — on `audio-focus` (unmute), ffmpeg pulls ZLM FLV audio → `pcm_s16le` 8 kHz → same audio WSS |
| **Server** | `audio-focus` works under handoff (was gated on Fleet pool streaming only) |
| **Server** | `hardStopOne` stops listen pull |
| **Client** | Unmute → `startPcmAudio()` + `audio-focus`; FLV proven also opens PCM WS |
| **Client** | `isAudioListenAllowed` accepts wall Live player under handoff |

---

## Files

- `lib/wvpWallListenAudio.js` (new)
- `lib/wvpVideoHandoff.js` (`getUpstreamFlv`, stop listen on hard stop)
- `lib/mediaSession.js` (`pushListenPcm`)
- `server.js` (wire push + audio-focus)
- `public/js/video-wall.js`
- Cache: `video-wall.js?v=20260722-wall-audio-path-v1`

---

## Operator verify

1. **Restart Fleet** (server change) + **Ctrl+F5**
2. One cam Live on ops wall → unmute speaker → **hear BWC mic**
3. Mute → silent
4. Picture still Live (no black)
5. **Call** still works
6. **PTT** still works

PASS / FAIL from what you hear.
