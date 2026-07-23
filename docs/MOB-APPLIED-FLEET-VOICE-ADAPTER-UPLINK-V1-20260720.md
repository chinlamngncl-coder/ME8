# MOB-APPLIED — Fleet VoiceAdapter uplink V1 (mic → WVP/ZLM)

**APPLY:** `MOB-APPLY-FLEET-VOICE-ADAPTER-UPLINK-V1`  
**Date:** 2026-07-20  
**Depends on:** `MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1`

---

## Boundaries held

- Cold SOS / proxy / event bus — untouched  
- Live ZLM / lobotomy — untouched  
- No UI button surgery  

---

## What landed

After WVP `broadcast` start, Fleet now **publishes** desk G.711 A-law into ZLM:

`rtmp://127.0.0.1:19355/broadcast/{device}_{channel}?sign=md5(pushKey)`

via FFmpeg (`vendor/ffmpeg-lgpl`). WVP then RTP-sends to the BWC (lab proof: `RTP推流成功`).

| File | Role |
|------|------|
| `lib/wvpVoiceUplink.js` | Per-cam FFmpeg RTMP publish + writeAlaw |
| `lib/wvpFleetVoiceAdapter.js` | startTalk → broadcast + uplink; pushAlaw; stopTalk |
| `lib/wvpGb28181Bridge.js` | Returns `wvpMeta` app/stream |
| `lib/wvpLabClient.js` | `getPushKey()` from WVP users API |
| `server.js` | `ptt-audio` / `call-audio` → `pushAlaw` for WVP sessions |
| `.env` | `FM_WVP_ZLM_RTMP=rtmp://127.0.0.1:19355` |

---

## Operator test

1. Hard refresh (mic: prefer `http://localhost:3988` if LAN HTTP blocks mic)  
2. Live OK / cold SOS still OK  
3. Hold **PTT** or **Call** — speak  
4. Log expect: `wvp voice uplink start` + `fleet voice adapter start` `uplinkStarted:1`  
5. Cam ear should hear desk  

If mic denied in browser on `192.168.1.38`, use localhost on the Fleet PC for this smoke (HTTPS LAN = later MOB).
