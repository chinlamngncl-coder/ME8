# MOB-APPLIED — Fleet PTT contact for WVP-homed cams

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-FLEET-PTT-CONTACT-WVP-HOMED-V1`  
**Scope:** Backend only — PTT group MESSAGE path for cams on WVP `:5060`.

---

## Problem

Live wall + pin PASS. Soft PTT / grouping / call dead: Fleet emitted `group config sent` on `:5062`, but WVP-homed cams often **ignore** Fleet-direct SIP MESSAGE and never open TCP **`:29201`**.

---

## Change

| File | Role |
|------|------|
| `lib/fleetPttContact.js` | Resolve contact: **WVP register peer** (from `wvpSipLanMap`) when handoff on; else Fleet cache |
| `lib/wvpPttGroupRelay.js` | Send PTT group XML as SIP **MESSAGE via UDP** to cam NAT peer; **Via :5060** (proxy signal) |
| `server.js` | `getContactUriForCam` uses fleetPttContact; `pushPttGroupForCamera` relays when WVP-homed; wake/refresh/always-on + handoff live → group refresh |
| `lib/sosResponseTeam.js` | SOS team group push uses same WVP relay |

**Not touched:** WVP broadcast / VoiceAdapter (ARCH cancel stays). UI sockets unchanged. Native `ptt-start` / `ptt-audio` on **29201** unchanged.

---

## Log markers

```
group config sent  path:fleet-ptt-contact-wvp-homed-v1  peer:192.168.x.x:port  via:192.168.1.38:5060
operator fleet ptt wake  path:fleet-ptt-contact-wvp-homed-v1
```

Expect after wake/hold: **`login ok`** / **`client connected`** on `:29201` in Fleet log.

---

## Operator test

1. **Restart** ME8 (server.js changed).
2. Hard refresh dashboard.
3. Open live on Chin or kk (handoff).
4. Hold **PTT** on wall or pin — wait up to ~8s for talk-ready.
5. Repeat **Call** if PTT PASS.
6. SOS response team PTT fan-out (if team active).

| Pass | Fail |
|------|------|
| Log `group config sent` with `fleet-ptt-contact-wvp-homed-v1` | Still only old path / `no_contact` |
| `login ok` on 29201 within ~8s | No TCP login; talk blocked |
| Desk ear / cam RX on hold | Dead ear |

---

## One line

WVP-homed cams get PTT group config on the **:5060 register peer** (trusted SIP home), not Fleet `:5062` direct — so firmware can open **29201** without WVP audio.
