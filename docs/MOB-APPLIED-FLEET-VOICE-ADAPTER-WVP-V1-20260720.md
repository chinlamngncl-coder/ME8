# MOB-APPLIED — Fleet VoiceAdapter WVP V1

**APPLY:** `MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1`  
**Date:** 2026-07-20  
**DISC:** `docs/MOB-DISC-FLEET-VOICE-ADAPTER-WVP-V1-RULES-20260720.md`

---

## Boundaries held

- Cold SOS / SIP proxy / event bus — untouched  
- Live ZLM / invite lobotomy — untouched  
- FR / redaction / layouts — untouched  

---

## What landed

| Piece | Change |
|-------|--------|
| `lib/wvpFleetVoiceAdapter.js` | One gate: `startTalk` / `stopTalk` → WVP broadcast via `wvpGb28181Bridge` |
| `server.js` `ptt-start` / `ptt-stop` | WVP-managed cams via adapter; classic cams keep 29201 |
| `server.js` `start-bwc-call` / `end-bwc-call` | WVP-managed → adapter (no Fleet SIP voice / contact required) |
| `ptt-audio` / `call-audio` | No dead 29201 spam for WVP sessions (PCM→ZLM uplink = later if ear needs it) |
| `public/js/video-wall.js` | Removed UI-direct `fetch` bypass; Fleet sockets again; talk-ready = fleet online when `labWvp` |
| Cache | `video-wall.js?v=20260720-voice-adapter-v1` |

Same-origin `/api/lab/wvp/broadcast/*` routes remain for tools; **product path is sockets → adapter**.

---

## Operator test

1. Hard refresh dashboard  
2. Cold SOS — still OK  
3. Live open/stop — still OK  
4. Hold **PTT** and/or **Call** — log should show `fleet voice adapter start` / `operator talk start` `path:wvp-fleet-voice-adapter` or Call `via:wvp-fleet-voice-adapter`  

If ear silent after adapter start 200: next is mic/PCM→WVP uplink (named later) — not more UI button surgery.
