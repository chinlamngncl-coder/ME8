# MOB-APPLIED — Cancel WVP voice; restore native Fleet PTT 29201

**APPLY / ARCH:** `MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT`  
**Date:** 2026-07-20  
**ARCH:** `docs/MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT-20260720.md`

---

## Confirmed

| Item | Status |
|------|--------|
| WVP audio for PTT/Call (adapter / uplink / UI-direct) | **ABORTED** from product path |
| Fleet `pushPttGroupForCamera` (gtid + **29201**) | **RESTORED** (no WVP skip) |
| Soft PTT sockets → Fleet TCP PCM | **RESTORED** |
| UI wake / talk-ready = 29201 online | **RESTORED** |
| Cold SOS / live video lobotomy | **Untouched** |

---

## Code

| File | Change |
|------|--------|
| `server.js` | Removed VoiceAdapter from Call / PTT / disconnect; restored classic `ptt-start`/`ptt-audio`/`ptt-stop`/`ptt-wake`; restored group push / refresh / always-on |
| `public/js/video-wall.js` | Removed “fleet online = talk-ready” WVP bypass; wake always `ptt-wake-device` |
| `public/index.html` | Cache `?v=20260720-native-ptt-29201` |

Idle libs (`lib/wvpFleetVoiceAdapter.js`, `lib/wvpVoiceUplink.js`) and lab `/api/lab/wvp/broadcast/*` remain on disk but are **not** on the product PTT/Call path.

---

## Operator smoke

1. Hard refresh  
2. Log on wake/PTT: `group config sent` … `port:29201` — **not** `fleet voice adapter` / `wvp audio broadcast`  
3. Soft PTT only when cam shows PTT channel up (29201)  
4. Cold SOS + live still OK  

If wake says `no_contact`: cam has no Fleet SIP contact for group MESSAGE — separate register/contact work; do **not** re-enable WVP audio.
