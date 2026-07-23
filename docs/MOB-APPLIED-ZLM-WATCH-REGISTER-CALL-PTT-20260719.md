# MOB-APPLIED — ZLM watch register → Call / PTT / SOS unlock (2026-07-19)

**APPLY:** `MOB-APPLY-ZLM-WATCH-REGISTER-CALL-PTT`

## Boundaries respected

| Forbidden | Done? |
|-----------|--------|
| CSS / wall geometry | **Not touched** |
| HTTPS / SSL / WSS ports | **Not touched** |
| Fleet SIP INVITE for ZLM path | **Not re-enabled** |

## Correction vs Google paste

Emission is **Socket.IO on dashboard HTTP (3988)**, **not** port **3990** (3990 = PCM audio WebSocket). Hardcoding 3990 would be wrong.

## Files modified

| File | Change |
|------|--------|
| `public/js/live-player-factory.js` | `onWatchActive` callback after ZLM attach |
| `public/js/video-wall.js` | Emit `zlm-watch-register` on watch-active; listen `zlm-watch-active` / sync Call+PTT UI |
| `server.js` | Durable ZLM watch + `isLiveForVoiceCall`; ack `video-stream-ready` / `zlm-watch-active`; SOS skip INVITE if already ZLM-watching |
| `public/index.html` | Script cache bust only |

## Behavior

1. ZLM soft-attach → `zlm-watch-register` (no `start-video` / no SIP INVITE).  
2. Server marks cam watching (`zlmLiveWatchByCam` + liveViewers) → Call gate uses `isLiveForVoiceCall`.  
3. Server emits unlock signals; UI syncs Call/PTT.  
4. SOS cold pull: if already ZLM-watching → **no** Fleet INVITE.

## You

Restart ME8 server (`RESTART-FLEET.bat`) + hard refresh → open ZLM live → Call / PTT (when device PTT-online) should not say “Start live video before calling”.
