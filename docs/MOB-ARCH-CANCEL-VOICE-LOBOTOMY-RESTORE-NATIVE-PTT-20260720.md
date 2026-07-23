# MOB-ARCH — Cancel WVP voice lobotomy; restore native Fleet PTT (29201)

**Name:** `MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT`  
**Date:** 2026-07-20  
**Status:** APPLIED (same-day restore)

---

## Strategic correction (SDK)

From **智能执法仪软件协议说明书 V1.2**:

- Cluster intercom / PTT is **not** GB28181 SIP audio.
- Hardware uses proprietary TCP **`HDA_NET_DATA`**, **`dwCMD: 130`**, on **port 29201**.
- **WVP cannot parse this private protocol** → WVP REST `/api/play/broadcast` (and FFmpeg RTMP uplink) is the **wrong** talk path for these BWCs.

---

## Mandates locked

1. **Abort UI-direct / VoiceAdapter WVP audio** for Dashboard PTT and Call.  
2. **Restore Fleet 29201** — emit `gtid` (lab **49**) + `port: 29201` group config again (no WVP skip).  
3. **UI stays on Fleet sockets** — `ptt-wake-device`, `ptt-start`, `ptt-audio`, `ptt-stop`, `start-bwc-call` / `call-audio`.  
4. **Audio bypasses WVP** — Fleet TCP socket ↔ camera only.

## Keep (not voice)

| Keep | Why |
|------|-----|
| Cold SOS event bus (`:5060` Alarm → Fleet) | Alarm ≠ PTT |
| Live ZLM + **video** invite lobotomy | Video path only — do not confuse with voice |

---

## Product path (restored)

```
UI  →  Fleet sockets  →  group config (SIP MESSAGE / gtid+29201)
                     →  TCP :29201 HDA_NET_DATA (dwCMD 130)
                     →  cam ear / desk RX
```

WVP = video (+ SOS Alarm mirror). **Not** talk media.

---

## Lab note

29201 comes up only after the cam receives group config and opens TCP to Fleet. That still needs a **Fleet SIP contact** for the MESSAGE (`getContactUriForCam`). If cam SIP-homes **only** on WVP `:5060` with no Fleet contact, wake logs `no_contact` — that is a **contact/register** follow-up, not a reason to put audio back on WVP.
