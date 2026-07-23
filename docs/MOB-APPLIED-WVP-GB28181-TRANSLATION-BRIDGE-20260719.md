# MOB-APPLIED — WVP GB28181 ↔ Socket.IO translation bridge (2026-07-19)

**APPLY:** `MOB-APPLY-WVP-GB28181-TRANSLATION-BRIDGE`

## Boundaries

| Forbidden | Done? |
|-----------|--------|
| Frontend (`video-wall.js`, `live-player-factory.js`) | **Not touched** |
| HTTPS / network port remap | **Not touched** |
| Legacy Fleet **video** SIP INVITE | **Not used** |

## Audit map (acknowledged)

| WVP / GB28181 state | ME8 translation | Socket.IO / HTTP |
|---------------------|-----------------|------------------|
| SIP MESSAGE `CmdType=Alarm` on **:5060** (proxy) | `POST /api/lab/wvp/device-alarm` → `raiseDeviceAlarm` | **`sos-alarm`** `{ cameraId, … }` |
| SIP INVITE audio-only cam→WVP | `POST /api/lab/wvp/device-ptt-rx` | **`ptt-rx-state`** `{ camId, active }` |
| Fleet SIP **:5062** Alarm (unchanged) | existing MESSAGE handler | **`sos-alarm`** |
| Fleet TCP **29201** PTT RX (unchanged) | `pttServer` | **`ptt-rx-state` / `ptt-rx-audio`** |
| Ops `ptt-start` `{ camIds: [...] }` | Fan-out: TCP PTT if online; else WVP **`/api/play/broadcast/{device}/{channel}`** (audio, not video) | **`ptt-talk-state`** active |
| Ops `ptt-stop` | Stop WVP broadcasts for session | **`ptt-talk-state`** inactive |

**Redis:** ME8 has no WVP Redis live/alarm client. Translation = **SIP LAN proxy intercept + WVP REST**, not Redis pub/sub.

## Files (backend only)

| File | Role |
|------|------|
| `lib/wvpGb28181Bridge.js` | **New** — fan-out + Socket.IO event name map |
| `lib/wvpLabClient.js` | `startAudioBroadcast` / `stopAudioBroadcast` |
| `server.js` | Bridge HTTP routes; `ptt-start`/`ptt-stop` WVP fan-out |
| `scripts/wvp-sip-lan-proxy.js` | Alarm + audio INVITE → ME8 HTTP |

## You

1. Restart ME8 (`RESTART-FLEET.bat`) — needs `FM_LAB_WVP=1` for outbound WVP broadcast.
2. Restart **wvp-sip-lan-proxy** (inbound bridge).
3. Hard refresh Ops (frontend unchanged; cache already fine).
4. Prove: Cold SOS on WVP cam → SOS banner; group PTT with cams not on 29201 → server log `wvpBroadcast` (not drop).
