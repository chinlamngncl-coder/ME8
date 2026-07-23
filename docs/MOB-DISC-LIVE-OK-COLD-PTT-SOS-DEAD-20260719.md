# MOB DISC — Live OK · cold PTT / cold SOS / pin-PTT dead (2026-07-19 ~23:56)

**Type:** DISC only — no APPLY / no code  
**Operator confirm:** “only live works as usual. all cold ptt dont work, cold sos dont work. press on pin video ptt dont work. all others i dont want to try.”

Related earlier discs (same night / same split):

- `MOB-DISC-ALL-VOICE-SOS-DEAD-LIVE-ONLY-20260719.md`
- `MOB-DISC-REFRESH-ALARM-ACK-STOP-CHIN08-DEAD-20260719.md`
- `MOB-DISC-SOS-SIGNAL-TRACE-20260719.md`

---

## Operator matrix (accepted)

| Feature | Status |
|---------|--------|
| **Live** (Open / pin picture) | **Works as usual** |
| **Cold PTT** (cam talk, no live) | **Dead** |
| **Cold SOS** (physical button, no live) | **Dead** |
| **Pin video PTT** (PTT while pin/live picture up) | **Dead** |
| Call / other voice | **Not tested** (operator skips — assumed dead) |

---

## Short verdict

**Picture brain ≠ voice/SOS brain.**

| Brain | Port | What you still get |
|-------|------|--------------------|
| **WVP → ZLM** | SIP **:5060** (proxy) + FLV | **Live picture** |
| **Fleet ME8** | SIP **:5062** + PTT **:29201** | Classic cold SOS / cold PTT / pin-PTT PCM — **not married for these cams** |

Cams REGISTER to **WVP via :5060**. Fleet still sends **group config / ptt wake** toward **29201**, and sometimes **Fleet video INVITE → 408**. That is why live can look fine while every PTT/SOS path that needs Fleet (or a finished WVP translation) feels dead.

---

## Evidence (tonight)

1. **Live path alive** — `zlm-watch-active` / `wvp stopPlay` / presence online for …00008 / …00009.  
2. **Fleet video path still bites** — after stop/reopen: `invite failed | 408` (Fleet talking to a WVP-homed cam).  
3. **PTT server is up; marriage is not** — many `group config sent` + `operator fleet ptt wake`, but that ≠ cam TCP online / cold TX/RX working.  
4. **Cold SOS on wire tonight** — proxy tail is **REGISTER only**; no fresh Alarm MESSAGE in the late window. Earlier smoke SOS (~23:07) was adapter POST → dashboard; that is **not** proof physical cold SOS works end-to-end on the cam.  
5. Refresh alarm you saw was **stale open-incident replay**, then ACK — not a new cold SOS proof.

---

## Why each dead item matches the split

| Dead item | Why |
|-----------|-----|
| Cold SOS | Cam Alarm goes to **WVP :5060**. Fleet `sip_alarm` on **:5062** never sees it unless proxy→adapter→Socket.IO fires. Physical press often never appears on proxy as Alarm (prior trace). |
| Cold PTT | Needs cam on **Fleet PTT TCP 29201** (or WVP audio INVITE → `device-ptt-rx` → `ptt-rx-state`). Cams on WVP-only REGISTER usually never join 29201. |
| Pin video PTT | UI talk still needs **PTT online** and/or WVP broadcast fan-out that actually reaches the device. Wake + group config spam without TCP join = button dead even with picture up. |

---

## What is *not* the bug

- Live “broken after stop” from the last session is a **separate** race (stop vs `invite_in_flight` / 408). Operator now says **live works as usual** — treat voice/SOS as the open genre.  
- Global dashboard auth is **not** blocking live. Adapter exists for inbound WVP webhooks; it cannot invent Alarm/PTT if the cam never sends them on :5060.

---

## Parked directions (needs named APPLY later — not tonight)

Pick **one** genre when you want code:

1. **Cold SOS genre** — prove physical Alarm on proxy → adapter → `sos-alarm` (no Fleet video INVITE).  
2. **PTT genre** — either re-home PTT to Fleet 29201 for these cams, or finish WVP audio broadcast / `device-ptt-rx` so pin + cold talk work without Fleet TCP.  
3. **Stop Fleet 408 noise** on WVP-homed live (invite skip) — hygiene, not a substitute for (1)/(2).

**No code in this DISC.**
