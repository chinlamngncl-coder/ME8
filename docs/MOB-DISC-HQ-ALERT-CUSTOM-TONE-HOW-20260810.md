# MOB DISC — Custom SOS / per-action alert tones (how?) — 2026-08-10

**Status:** Discuss only. **No code** until named APPLY.  
**Now shipped:** `HQ-ALERT-TONE-PRESETS-HOLD-V1` = built-in Web Audio presets only (Urgent / Classic / Pulse / Soft). **No file upload yet.**

---

## How it works today

| What | Today |
|------|--------|
| Own `.mp3` / `.wav` | **Not possible** |
| Pick sound | Dropdown presets (generated beeps) |
| Split | **SOS** preset vs **Analytics** preset (Weapon+Face+Plate share analytics) |
| Per action finer | Weapon ≠ Face ≠ Plate ≠ SOS — **not** separate picks yet (only on/off checkboxes) |

So: user **cannot** “put their own SOS tone” in V1. That needs a follow-up APPLY.

---

## What “own tone” usually means (industry)

1. **Upload** short audio (mp3/wav/ogg) per desk or per site.  
2. **Map** file → alarm family (SOS, fall, weapon, FR, ANPR…).  
3. Browser plays that file instead of (or after) the preset beep.  
4. Still: mute / enable flags / hold window apply.

Constraints we must respect:

- Autoplay: user must click the page once (already unlocked).  
- Size: keep clips short (e.g. ≤ 3–5 s, ≤ ~500 KB).  
- Ship/air-gap: prefer **local upload stored on this Fleet server**, not cloud CDN.  
- Brand/OEM: no banned vendor sample packs.

---

## Recommended product shape (one clear path)

### Phase A — `HQ-ALERT-CUSTOM-TONE-FILES-V1` (recommended next)

| Control | Behavior |
|---------|----------|
| **SOS custom file** | Optional upload; if set, SOS uses file; else SOS preset |
| **Analytics custom file** | Optional upload; else analytics preset |
| Preview / clear | Preview clip; Clear → back to preset |
| Storage | Server folder under storage (e.g. `storage/hq-alert-tones/`) + Settings API; or desk-only if you insist browser-only (weaker) |
| Format | `.mp3` / `.wav` / `.ogg` |

**Recommend server-side store** so all Ops desks in the room hear the same site SOP tone after refresh.

### Phase B — `HQ-ALERT-PER-ACTION-TONES-V2` (after A)

Separate pick (preset **or** custom file) per:

| Action | Tone slot |
|--------|-----------|
| SOS | own |
| Fall | own (or share SOS) |
| Weapon | own |
| Face (FR) | own |
| Plate (ANPR) | own |

UI: small table under Alert tones — Action | Preset | Custom file | Preview.  
Do **not** invent 20 slots (geofence / SD record speak stay voice-only unless you ask).

---

## Not recommended first

- Packing dozens of royalty-free sirens into the zip by default (bloat + legal).  
- Endless loop until Ack as the only mode (fatigue) — keep hold 5/8/10; until-Ack = later optional.  
- Per-user different sirens on one shared wall PC without a “this station” profile (confusing).

---

## Plain answer to your questions

1. **How can user put their own SOS tone?**  
   **Not yet.** Next APPLY uploads a short audio for SOS (and optionally analytics). Until then: choose Urgent / Classic / Pulse / Soft.

2. **Different tones for different actions?**  
   **Partially:** SOS vs Analytics today. **Full** Weapon / Face / Plate / SOS(/fall) = Phase B after custom files (or presets-only per action if you want B without upload first).

---

## Next APPLY (pick one)

| APPLY | What you get |
|-------|----------------|
| **`HQ-ALERT-CUSTOM-TONE-FILES-V1`** | Upload own SOS + analytics clips; presets remain fallback |
| `HQ-ALERT-PER-ACTION-PRESETS-V1` | No upload; dropdown per Weapon / FR / ANPR / SOS only |
| Both later | Files first, then per-action mapping |

**Recommendation:** `MOB-APPLY HQ-ALERT-CUSTOM-TONE-FILES-V1` next (site SOP sound), then per-action V2.

No code this turn.
