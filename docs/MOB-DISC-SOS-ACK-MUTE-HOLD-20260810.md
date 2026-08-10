# MOB DISC — SOS Ack: delay auto-mute (listen hold) — 2026-08-10

**Status:** LOCKED intent. **No code this turn.**  
**Read:** `.cursorrules` · zero change without APPLY · DeviceControl untouched (this is **live panel audio mute**, not Record).

---

## Got what you mean?

**Yes.**

| Keep as-is | Change |
|------------|--------|
| SOS → Ack with **short note** so Ops Case / Case File can open | **Do not** slam live BWC audio to mute the instant Ack lands |
| Officer can still **mute themselves** anytime | After a short **hold**, then auto-mute leftovers (unless already muted) |

Goal: clear leftover “Ack just killed the listen” while you are still typing / still watching the cam right after Ack.

---

## What happens today (code fact)

In `dashboard-boot.js`, Ack dismiss calls **`muteAckedCamLiveAudio(camId)`** → `VideoWall.muteLiveAudioForCam` **immediately**.

Same dismiss clears SOS UI / **`VideoWall.clearAlarmStates()`** — so **panel red blink ends on Ack**, not on a separate 20s timer.  
(Recent-ack pin linger today is **`RECENT_ACK_PIN_MS = 8000`** — 8s pin hint, not mute hold.)

So today: **Ack = blink off + mute on** (same beat).

---

## Two shapes you described

| Shape | Behavior |
|-------|----------|
| **A — 1 min hold** | After Ack, stay unmuted ≥ **60s** unless officer mutes |
| **B — Blink-aligned** | While “alarm blink / hold” is still on, **no** auto-mute; when that window ends → **then** mute; officer may unmute after |

---

## Recommendation (one path)

**`SOS-ACK-MUTE-HOLD-V1` — Shape B, timed after Ack (default 20s).**

1. Ack + short note → case flow **unchanged**.  
2. **Do not** mute on Ack immediately.  
3. Start a **listen hold** timer from Ack (**20s** default — matches your “blink window” mental model).  
4. When timer fires → one auto-mute **only if** officer did **not** mute/unmute themselves into mute already.  
5. If officer hits mute during hold → respect that; cancel pending auto-mute.  
6. Optional later knob: Settings or const `60000` if lab wants full 1 min.

**Why not default 60s first:** long open listen after Ack on a busy wall; 20s clears leftovers without sitting unmuted a full minute. Easy bump to 60s if you say so in the APPLY.

**Not in this MOB:** Path B Record / StopRecord / stop-video (separate discs).

---

## Operator PASS (after APPLY)

1. SOS → live listening (unmuted for SOS).  
2. Ack with short note → **still hear** cam for ~20s.  
3. After hold → auto-mute (speaker icon muted).  
4. Unmute still works after.  
5. Mid-hold: press mute yourself → stays muted; no “unmute then remute” fight.

---

## Next step

Say **`MOB-APPLY SOS-ACK-MUTE-HOLD-V1`**  
(add `holdMs=60000` in the same APPLY line if you want 1 min instead of 20s).
