# MOB-DISC — Soft PTT one-shot / KK vibe / BWC button (after uplink V1)

**Date:** 2026-07-20  
**Status:** DISC only — **no code** until named APPLY  
**Operator report:** Cold SOS PASS. Soft PTT (group during SOS + Chin alone) ear **once**, not reliably again. KK soft: vibration, no clear ear. BWC hardware PTT: no talk.

---

## Direct answer: are we redoing PTT / SOS / Call?

**No.**

| Product | Still owns it | What VoiceAdapter does |
|---------|---------------|-------------------------|
| **Cold SOS** | Fleet (`raiseDeviceAlarm` / banner / team) via WVP event bus | **Nothing** — SOS path untouched |
| **Live video** | ZLM + invite lobotomy | **Nothing** |
| **Soft PTT / Call / group PTT** | Same Fleet sockets + UI (`ptt-start` / `ptt-stop` / `ptt-audio`, `start-bwc-call` / …) | For **WVP-homed** cams only: translate **media transport** (WVP broadcast + FFmpeg RTMP uplink) because classic **29201** is dead for those cams |
| **Classic 29201 PTT** | Unchanged for non-WVP cams | Skipped for WVP-managed so we do not spam a dead pipe |

We are **not** inventing a second SOS, a second Call product, or a parallel UI. Fleet product stays. Adapter = **transport shim** under existing Fleet voice events after SIP home moved to WVP `:5060`.

---

## Log check (12:42–12:44, `storage/fleet.log`)

### Cold SOS — PASS (matches what you saw)

- `device alarm raised` Chin `…008` `source:wvp_sip_proxy`
- `sos-alarm pushed` / event-bus → fleet handlers  
- SOS team / banner PTT team size 2 (Chin+KK)

### Soft PTT — Fleet path is firing every press

Not “wake only.” Repeated cycles:

1. `wvp audio broadcast start` (Chin and/or KK)  
2. `wvp voice uplink start` + `fleet voice adapter start` **`uplinkStarted:1|2`**  
3. Mic bytes into FFmpeg (`wvp voice uplink stop` with **bytes > 0**, e.g. 24k / 13k / 27k)  
4. `wvp audio broadcast stop` + uplink SIGTERM  

Counts in that window: **adapter start ≈ stop ≈ 16**, **no** `uplink start failed` / **no** `uplink ffmpeg` error lines.

So: **second (and Nth) press still hits Fleet + adapter + uplink.**  
If **ear** only works once, the break is **after** our HTTP/RTMP start — WVP↔cam RTP / device speaker / tear-down race — not “Fleet forgot PTT.”

### Timing smell (one-shot ear)

Many holds are **~1–2 s**, and the next start often lands **~0.8–1.0 s** after stop (example: stop `12:43:22.643` → start `12:43:23.512`).  

Hypothesis (for next APPLY, not doing now):

- Kill FFmpeg + `broadcast/stop` then immediate `broadcast/start` before ZLM/WVP/cam finishes teardown → HTTP 200 again, **RTP to ear dead** until cam/WVP cools.  
- Matches “works first time, not second” even while logs look healthy.

### KK vibration, no ear

- Soft KK alone: uplink **did** run (`…009`, **bytes 27680** then stop).  
- `wvp event-bus ptt-rx` `active:true` after broadcast start = WVP/audio-invite side-effect (cam notified / RX state), **not** proof the speaker played desk audio.  
- Vibration ≈ invite / RX latch; **ear** still needs RTP play-out. Chin may accept first RTP better than KK (device / channel quirk) — logs do **not** show KK adapter failure.

### BWC hardware PTT button — still not on this path

- Soft PTT = **desk → cam ear** (broadcast + uplink).  
- Hardware BWC PTT = **cam mic → desk** (classic was Fleet **29201** / SIP talk RX).  
- Log pack: **no** inbound cam-talk media when you press the BWC button.  
- Alarm MESSAGE ≠ PTT. `ptt-rx` lines in this window align with **our** broadcast start, not a separate cam-button session.

So hardware button **cannot** work yet with only uplink V1 — needs a **named inbound** MOB later (WVP talk/receive or remarry cam audio into Fleet RX). **Do not** confuse with soft PTT.

### Noise still present (not SOS rewrite)

Occasional `group config sent … port:29201` after talk — leftover classic wake; **not** the working soft path (adapter already owns talk).

---

## Architecture lock (so we do not drift)

```
SOS:     BWC Alarm → :5060 proxy → event bus → Fleet raiseDeviceAlarm   [KEEP]
Live:    WVP/ZLM + Fleet invite lobotomy                                 [KEEP]
Soft TX: UI → Fleet sockets → VoiceAdapter → WVP broadcast + RTMP uplink [IN PROGRESS]
Soft RX / BWC button:                                                    [NOT STARTED]
Classic 29201: only non-WVP cams                                         [KEEP]
```

**Forbidden drift:** UI-direct WVP fetch per button; rewriting SOS; lobotomizing Call into a new product; “redo PTT from scratch.”

---

## What “better progress” means

| Item | Status |
|------|--------|
| Cold SOS | PASS |
| Soft path wired on Fleet | PASS (logs) |
| Mic bytes into ZLM uplink | PASS (bytes logged) |
| Cam ear first press (Chin / group) | PARTIAL (you heard once) |
| Repeat press ear | FAIL (you) / Fleet still starts (log) → tear-down / RTP |
| KK ear | FAIL (vibe only) |
| BWC button → desk | FAIL (no inbound path yet) |

---

## Candidate next APPLY (names only — wait for your go)

One at a time; pick when ready:

1. **`MOB-APPLY-FLEET-VOICE-UPLINK-RESTART-STABLE-V1`** — soft TX only: settle tear-down (order/grace before re-start, or keep publisher across presses) so **2nd+ press ear** matches 1st. No SOS/Call product change.  
2. **`MOB-APPLY-FLEET-VOICE-KK-EAR-PROBE-V1`** — prove KK RTP vs Chin (WVP stream / device) after (1) or in parallel only if you name both.  
3. **`MOB-APPLY-FLEET-VOICE-BWC-BUTTON-RX-V1`** — separate: cam hardware PTT → desk (inbound). Do **not** bundle into soft TX.

HTTPS mic on LAN IP remains separate if you open dashboard on `192.168.1.38` and mic flakes.

---

## Operator ask

Confirm which you want first when you APPLY:

- **A** = repeat soft PTT ear (restart-stable)  
- **B** = KK ear probe  
- **C** = BWC button inbound  

**No code in this MOB.** Soft PTT/Call/SOS product stays on Fleet; we only finish the WVP transport shim.
