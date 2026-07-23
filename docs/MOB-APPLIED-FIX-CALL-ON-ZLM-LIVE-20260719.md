# MOB-APPLIED: fix call on zlm live (2026-07-19)

**APPLY:** `MOB-APPLY fix call on zlm live`

## Intent

Call works when ZLM picture is on the wall — no Fleet video INVITE required. WVP-first stays.

## What changed

1. **Durable ZLM watch** (`zlmLiveWatchByCam`) — survives remount / `stop-video` viewer races; Cleared only on `zlm-watch-unregister` or socket disconnect.
2. **`isLiveForVoiceCall`** — Fleet streaming **OR** durable ZLM watch **OR** liveViewers.
3. **Call path** — if ZLM watch + PTT online → PTT Call (preserve video); if ZLM watch + PTT down + Fleet SIP contact → SIP voice fallback; else refresh PTT group + wait message.
4. **Client** — before Call, re-emit `zlm-watch-register` when that cam has a ZLM wall overlay.
5. **On register** — schedule PTT group refresh when contact exists.
6. Cache: `video-wall.js?v=20260719-zlm-call-fix`

## Files

- `server.js`
- `public/js/video-wall.js`
- `public/index.html` (cache bust)

## Operator test

1. Restart ME8 server (`RESTART-FLEET.bat`).
2. Hard refresh dashboard.
3. Open ZLM live on a wall slot (picture OK).
4. Press **Call** — must not say “Start live video before calling”.
5. Pass if: Call connects (PTT path) **or** SIP voice path when cam has Fleet contact; fail only if still blocked by live gate with ZLM picture up.

## Out of scope (this MOB)

- Cold SOS / SOS pack
- PTT hold without contact / without 29201
- Forcing both BWCs onto SIP 5060
