# MOB DISC — Why `live voice hint probe` keeps flooding the log

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** Fleet log spam every ~3s: `live voice hint probe | {camId, peakRms, threshold, … over:false}` while Chin live.  
**Search:** live voice hint probe, liveVoiceHint, FM_LIVE_VOICE_HINT_PROBE, peakRms  
**Code:** `lib/liveVoiceHint.js`  

---

## What it is (not a bug, not FR)

This is a **lab diagnostic heartbeat** for the **“voice on live”** hint (blue toast: someone talking on the BWC live audio while HQ may be muted).

| Piece | Role |
|-------|------|
| Live G711 PCM | Fed into `liveVoiceHint.feedPcm` while the cam is streaming |
| Heuristic | RMS vs noise floor → sustained voice → `onHint` → UI toast |
| **Probe log** | Every **~3s** dumps peak/threshold so you can tune sensitivity |

It is **not** PTT, **not** SOS, **not** FR crop. It only means: “audio path is alive; here’s the RMS sample.”

---

## Why it keeps coming out

```
FM_LIVE_VOICE_HINT_PROBE  default = ON  (anything except '0')
FM_LIVE_VOICE_HINT_PROBE_MS  default = 3000
```

While that cam has live audio PCM feeding:

1. First packet → `live voice hint probe start`  
2. Every **3 seconds** → `live voice hint probe` at **INFO**  
3. Continues until stream stops / cam cleared  

So one live BWC ≈ **20 lines/minute** in `fleet.log` — by design for tuning, noisy for daily ops.

---

## Reading your paste (21:03)

| Field | Your values | Meaning |
|-------|-------------|---------|
| `peakRms` | ~11–98 | Very quiet samples this window |
| `threshold` | ~6770–6800 | Gate to call it “voice” |
| `floor` | ~3220+ | Learned noise floor |
| `voiceMs` / `voiceFrames` | 0 | No sustained voice |
| `over` | **false** | Correct — not firing the toast |

So the detector is **working** (no false “voice on live”). The log is just saying “still listening, still under threshold” every 3s — **telemetry spam**, not an alarm.

---

## How to silence (ops, no code)

In ME8 `.env`:

```env
FM_LIVE_VOICE_HINT_PROBE=0
```

Restart Fleet. Hint feature still runs; **periodic probe lines stop**.  
(Set back to `1` only when tuning mic thresholds.)

Optional: `FM_LIVE_VOICE_HINT_PROBE_MS=15000` if you want rarer probes instead of off.

---

## Product judgment

| Keep forever at INFO every 3s? | **No** for ship / daily lab |
| Leave probe code behind env flag? | **Yes** — already there |
| Demote to `debug` / log only when `over:true`? | Nice later MOB |

**Parked polish:** `mob-live-voice-hint-probe-quiet` — default probe off in ship packs, or INFO only on `over:true` / cooldown events.

---

## Not related to

- FR crop delay / grab EOF  
- Investigation holds  
- Map Expand side dock  

---

## No code in this DISC

To quiet logs tonight: `FM_LIVE_VOICE_HINT_PROBE=0` + restart.
