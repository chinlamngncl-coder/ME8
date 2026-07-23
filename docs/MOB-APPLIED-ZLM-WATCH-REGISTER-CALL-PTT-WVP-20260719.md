# MOB-APPLIED — ZLM watch → Call / PTT / SOS (WVP) (2026-07-19)

**APPLY:** `MOB-APPLY-ZLM-WATCH-REGISTER-CALL-PTT-WVP`

## Boundaries respected

| Forbidden | Done? |
|-----------|--------|
| UI / CSS / wall geometry | **Not touched** |
| HTTPS / SSL / WSS / port remap | **Not touched** |
| Legacy Fleet **video** SIP INVITE for ZLM path | **Not re-enabled**; skipped when ZLM ops-live |

## Architecture facts (lab)

| Port | Role |
|------|------|
| Dashboard Socket.IO (HTTP **3988**) | ZLM watch handshake — **this MOB** |
| **3990** | PCM audio WebSocket only — **not** signaling |
| **5060** | WVP GB / video → ZLM FLV |
| **5062** / **29201** | Fleet SIP voice + PTT TCP (outbound Call/PTT) |

**Redis:** `FM_REDIS_URL` / enterprise Redis is **not** wired into Call/PTT/SOS gates. There is no WVP Redis “live” flag in this repo. ME8 equivalent = durable `zlmLiveWatchByCam` + `dashboardVideo.isDashboardWatchingCam` (pool **or** ZLM watch).

## Files

| File | Change |
|------|--------|
| `server.js` | Ops-live includes ZLM; skip video INVITE if ZLM watching; register + alias `zlm-watch-active`; unlock payload (`opsLive` / `callReady` / gate flags) |
| `lib/deviceAlarm.js` | SOS pull skips when `isLiveForVoiceCall` (ZLM ops-live) |
| `public/js/video-wall.js` | Watch emit + unlock UI sync |
| `public/js/live-player-factory.js` | Comment only (onWatchActive path) |
| `public/index.html` | Cache `?v=20260719-zlm-watch-wvp` |

## Behavior

1. Soft-attach ZLM → Socket.IO `zlm-watch-register` (server also accepts inbound `zlm-watch-active`).
2. Server marks cam ops-live (`zlmLiveWatchByCam` + liveViewers); touches fleet row; refreshes PTT group if Fleet contact exists.
3. Emits `video-stream-ready` + `zlm-watch-active` unlock (no video INVITE).
4. Call gate: `isLiveForVoiceCall` → PTT voice if TCP online, else Fleet **audio** SIP when contact exists.
5. PTT TX: still requires device on **29201** (not a video-INVITE gate).
6. SOS cold pull: no Fleet video INVITE while ZLM ops-live.

## You

1. Restart ME8 (`RESTART-FLEET.bat`).
2. Hard refresh dashboard.
3. Open ZLM live → Call must **not** say “Start live video before calling”.
4. PTT: un-greyed talk when device is PTT-online; audio path is Fleet PTT/SIP, not a second video INVITE.
