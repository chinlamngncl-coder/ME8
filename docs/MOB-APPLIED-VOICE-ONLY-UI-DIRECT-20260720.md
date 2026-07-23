# MOB-APPLIED — Voice-only UI-direct (same-origin WVP broadcast)

**APPLY:** `MOB-APPLY-VOICE-ONLY-UI-DIRECT`  
**Date:** 2026-07-20  
**DISC:** `docs/MOB-DISC-ARCH-VOICE-ONLY-UI-DIRECT-20260720.md`

---

## Boundaries held

| Off-limits | Status |
|------------|--------|
| Cold SOS + `wvp-sip-lan-proxy` | Untouched |
| Live / ZLM / invite lobotomy | Untouched |
| FR / redaction / layout rewrite | Untouched |

---

## What landed

### 1. Same-origin reverse proxy (UbitronC2)

- `POST /api/lab/wvp/broadcast/start` `{ camId }` or `{ camIds: [] }`
- `POST /api/lab/wvp/broadcast/stop`
- Auth: dashboard session; WVP JWT stays in `wvpLabClient` on Node
- Fan-out via existing `wvpGb28181Bridge.fanOutPttStartViaWvp` / `fanOutPttStopViaWvp`

### 2. Dashboard UI (voice only)

- `public/js/video-wall.js` — when `labWvp` capability is on:
  - PTT + Call use `fetch('/api/lab/wvp/broadcast/…')` (same origin)
  - **No** `ptt-wake-device` / **no** `start-bwc-call` / **no** `ptt-start` for WVP path
  - Talk-ready = fleet **online** (not Fleet TCP 29201)
- `public/js/dashboard-boot.js` — SOS PTT team prewake skips legacy wake when `labWvp`
- Cache: `video-wall.js?v=20260720-voice-ui-direct`

### 3. Strip 29201 noise (WVP-managed)

- `pushPttGroupForCamera` / `schedulePttGroupRefreshForCam` / always-on restore / `ptt-wake-device` skip when `shouldLobotomizeFleetVideoInvite` (same WVP-lab gate)
- Log: `group config skipped` / `group refresh skipped` / `operator fleet ptt wake skipped` reason `wvp_managed_voice_ui_direct`

---

## Operator test (after hard refresh)

1. **Cold SOS** — still PASS (untouched)  
2. **Live open/stop** — still PASS  
3. **Hold software PTT** — DevTools Network: `POST /api/lab/wvp/broadcast/start` → 200; fleet.log `lab wvp broadcast start`  
4. **Call** — same start route; stop → `broadcast/stop`  
5. Fleet.log should **not** spam `group config sent … port:29201` for Chin after wake/live

**Note:** This APPLY opens WVP GB **broadcast** (platform audio path). Browser mic still uses existing PTT/Call mic helpers; full duplex PCM-into-WVP may need a follow-up MOB if ear opens but uplink is still wrong.

---

## Files touched

- `server.js`
- `public/js/video-wall.js`
- `public/js/dashboard-boot.js`
- `public/index.html` (cache bust only)
