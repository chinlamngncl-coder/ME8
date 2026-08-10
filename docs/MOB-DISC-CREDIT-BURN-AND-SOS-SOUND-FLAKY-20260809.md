# MOB DISC — Credit burn apology + SOS sound flaky (2026-08-09 night)

**Status:** LOCKED. **No code until** a named APPLY for audio.  
**Operator:** Credits burning without “much” work; SOS sound sometimes OK, sometimes silent; ask if SOS should keep sounding after speech.

---

## 1. Credit burn — what went wrong (honest)

You did not invent work. **Agent cost** came from fat turns earlier today, especially:

| Burn | Why it hurt |
|------|-------------|
| Patching **giant** `public/index.html` inline SOS scripts | Huge file in/out of context |
| Multiple MOB DISCs + inventory updates in same arcs | Extra tokens, still “paper” |
| `SOS-CASE-ON-RAISE` + strip APPLY touching server + store + UI | Real work, but not lean enough on reads |

**Standing order (again):** `CREDIT-LEAN-HARD` / `MOB-LEAN-NO-SCAN` / `NO-SCAN-THIS-TURN` — paste any time.  
Agent must: **1–3 named files only**, no repo hunt, short replies. Soft “sorry” without that = fail.

This turn: **3 known SOS-audio files only** — no scan.

---

## 2. SOS sound — check the **3** current paths (read only)

### Path A — Tone (`hq-alert-audio.js`)

- Called from voice-alerts on SOS: `HqAlertAudio.play('sos'|'fall', …)`  
- Pattern today: **two short beeps** (~0.3s total) — not a long alarm.  
- Blocked if: header **session mute**, prefs SOS tone off, AudioContext not unlocked (no page click yet), 900ms dedupe key.

### Path B — Speech (`voice-alerts.js` → TTS)

- Speaks “SOS …” / fall phrase when auto-speak policy allows.  
- Needs: voice enabled, auto-speak, speech unlocked (click), speakSos/speakFall on, not muted.

### Path C — **Early exits that kill A+B together** (bug / design smell)

In `onSosAlarm` **before** `fireSpeak`:

1. `data.replay` → return (no sound)  
2. `data.refresh` (merge) without live-bye flags → return (no sound on merge)  
3. **`if (!policy.speakSos) return`** / speakFall → return  

**#3 is the smoking gun for “sometimes no sound”:**  
Comment said tone should play **even when TTS is off**, but the function **returns before** the tone call if Speak SOS is unchecked. So: Settings → Alerts → speak SOS off ⇒ **silence for both speech and tone**.

Also inside `fireSpeak`: **60s per-cam dedupe** (`SOS_DEDUPE_MS`) — second SOS same cam within a minute → **no tone, no speech**.

| Situation | Likely result |
|-----------|----------------|
| Fresh SOS, page clicked, speak SOS on, not muted | Tone + speech (good) |
| Speak SOS **off** in settings | **Silent** (bug vs intent) |
| No click yet (AudioContext locked) | Often **silent** |
| Header mute | Silent |
| Same cam again &lt; 60s | Silent (dedupe) |
| Refresh/merge alarm | Silent (by design today) |

That matches “sometimes good, sometimes no sound.”

---

## 3. Should SOS keep sounding after speech?

**Yes — recommend.** Crisis desk should not go quiet the moment TTS ends.

| Layer | Today | Locked direction (when APPLY) |
|-------|--------|-------------------------------|
| Attention tone | ~0.3s chirp, same time as speak start | **Longer SOS attention** (e.g. 1.5–3s pattern or 2–3 repeats) |
| After speech | Nothing | **Short tail tone** (or soft loop until Ack / mute / timeout ~8–15s max) |
| Speak SOS off | Kills tone too | Tone **independent** of speakSos checkbox |
| Mute | Silences all | Keep |

Not a forever siren without Ack — cap length so Ops isn’t hell.

---

## 4. Recommended APPLY (when you say go)

`MOB-APPLY SOS-ALERT-AUDIO-RELIABLE-V1`

1. Play tone **even if** speakSos/speakFall is off (only mute / tone prefs / unlock block).  
2. Longer SOS tone (+ optional short after-speech chirp).  
3. Keep refresh/replay quiet (or optional soft tick — default stay quiet).  
4. Dedupe: don’t block tone for 60s if first play failed unlock — or shorten tone dedupe vs speak dedupe.

Touch: `voice-alerts.js` + `hq-alert-audio.js` only.

---

## 5. What you do now

1. Paste `CREDIT-LEAN-HARD` on hard turns.  
2. For sound: say **`MOB-APPLY SOS-ALERT-AUDIO-RELIABLE-V1`** when ready.  
3. Until then: click page once; check header mute; check Settings → Alerts → Speak SOS **and** Alert tones SOS.
