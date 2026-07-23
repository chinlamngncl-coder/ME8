# MOB-DISC — Native 29201 restored but soft PTT still dead

**Date:** 2026-07-20  
**Status:** DISC only — **no code** until named APPLY  
**After:** `MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT`  
**Operator:** “doesn’t work at all now”

---

## Verdict

**Fleet native path is firing. Cams never join TCP 29201. Soft PTT cannot start.**

This is **not** “restore forgot to emit gtid/29201.”  
It is **not** “UI stopped calling Fleet.”  
SDK is still right: talk media = **HDA_NET_DATA / 29201**.  
What’s broken in this lab: **group config does not produce a PTT TCP login**, so the desk never gets talk-ready.

---

## Log proof (13:14–13:15, after restore)

| Signal | Result |
|--------|--------|
| `operator fleet ptt wake` `path:fleet-native-29201` | **Yes** (many) |
| `group config sent` `gtid:49` `host:192.168.1.38` `port:29201` | **Yes** (flood) |
| Fleet `PTT listening` `:29201` | **Yes** |
| `client connected` / `login ok` on 29201 | **None** after restore |
| `operator talk start` / `talk blocked` | **None** after 13:11 |
| Last `operator talk start` | **12:44** on old `wvp-fleet-voice-adapter` path |

UI waits up to ~8s for `isPttTalkReady` (= 29201 login). Cam never logs in → wake fails / hold never emits `ptt-start` → **ear dead, feels “doesn’t work at all.”**

Cold SOS in same window still ran (banner / response team) — SOS ≠ PTT.

---

## Why this differs from “WVP voice felt better”

| Era | Soft PTT behavior |
|-----|-------------------|
| VoiceAdapter / uplink | `ptt-start` ran without 29201; WVP broadcast + mic uplink; **partial ear** (once) |
| Native restore now | Correct sockets + group MESSAGE; **requires** cam TCP login; **zero** logins → **zero** talk |

So: aborting WVP audio was strategically correct per SDK; **lab topology** still blocks the proprietary path.

---

## Root cause (most likely)

Cams **SIP-home on WVP `:5060`**. Fleet presence marks them online, and Fleet still has *some* contact so MESSAGE is **sent** (`group config sent`).

But after MESSAGE:

- Cam does **not** open TCP to `192.168.1.38:29201`, **or**
- Cam ignores MESSAGE not from its registered SIP server (WVP), **or**
- MESSAGE never reaches a process that triggers HDA login

Without `login ok`, Fleet correctly refuses soft TX (`none_on_ptt` if `ptt-start` ever fired — today UI usually never gets that far).

**Video invite lobotomy + WVP live stay OK.** They do not open 29201.

---

## What we are **not** doing (until you APPLY)

- Re-routing soft PTT/Call through WVP REST / VoiceAdapter (ARCH cancel stays)  
- Claiming “29201 code is missing” — logs show it is emitting  
- Bundling SOS / live changes into a voice fix  

---

## Split problem (locked)

```
SDK truth:     audio = Fleet TCP 29201 (HDA_NET_DATA)
Lab blocker:   cam never becomes ptt-online after Fleet group MESSAGE
WVP role:      video + Alarm SOS only — not talk codec
```

---

## Candidate next APPLYs (pick one)

**A — `MOB-APPLY-PTT-29201-CONTACT-PROOF-V1`**  
Instrument: for each wake, log contact URI used, MESSAGE send result, and whether any TCP accept happens within N seconds. Prove deliver vs ignore. No product rewiring.

**B — `MOB-APPLY-PTT-FLEET-SIP-HOME-OR-DUAL-REG-V1`**  
Make cams accept Fleet group MESSAGE (Fleet `:5062` register and/or dual-home) so firmware opens 29201 to lab host. Biggest real fix if SIP home is the wall.

**C — `MOB-APPLY-PTT-GROUP-VIA-TRUSTED-SIP-PATH-V1`**  
If MESSAGE must leave from the SIP server the cam trusts (WVP), find a **forward-only** way to inject Fleet’s proprietary group XML — **not** WVP `/play/broadcast` audio. Only if A proves Fleet-direct MESSAGE is ignored.

Do **not** re-open VoiceAdapter uplink as the product talk path unless you explicitly cancel the ARCH cancel.

---

## Operator ask

Confirm what you saw on desk (wake failed toast? button grey? hold no TX?).  
Then say **A / B / C** (or named APPLY). **No code in this MOB.**
