# MOB DISC — Which alert audio was done / where to change / no constant alarm — 2026-08-10

**Status:** LOCKED facts. **No code this turn.**  
Also: ledger frame + post-teardown stop-record = **PASS** (operator).

---

## What was done (audio)

| APPLY | What |
|-------|------|
| `HQ-ALERT-AUDIO-V1` | Shared desk beeps: Weapon / Face / Plate / SOS |
| `SOS-ALERT-AUDIO-RELIABLE-V1` | SOS tone even if Speak SOS is off; longer attention + short **tail** after speech |

**Not done:** looping siren / constant alarm after speech. Disc for V1 said: no custom siren files.

---

## Where you change it (operator)

**Settings → Alerts & voice**

1. **Voice** — speak on/off (SOS / fall / …), Test speak, Save voice settings.  
2. **Alert tones** — Enable + per type (Weapon / Face / Plate / SOS), Test tone, Save alert tones.  
3. **Header mute** — silences **tones + voice**.

Prefs for tones: browser `localStorage` key `hq-alert-audio-prefs-v1` (this PC/browser only).

---

## Code (if later APPLY)

| File | Role |
|------|------|
| `public/js/hq-alert-audio.js` | Beeps (Web Audio oscillators — **not** `.mp3` files) |
| `public/js/voice-alerts.js` | Speech + SOS: attention tone → speak → one **tail** beep ~2.8s later |
| Settings UI | `public/index.html` → `#ss-hq-tone-*` under Alerts & voice |

---

## Why no constant alarm after speech

By design today:

1. Short **attention** pattern (~1s of beeps).  
2. Optional **speech**.  
3. One short **tail** (two beeps).  
4. Then **silence** until Ack/mute or next alert.

There is **no** loop / hold siren until Ack.

---

## If you want constant alarm next

Needs a named APPLY, e.g. `SOS-ALERT-TONE-LOOP-UNTIL-ACK-V1` — loop SOS tone until Ack / header mute / dismiss. Recommend that over uploading a custom siren unless you ask for file-based audio.

No APPLY this turn.
