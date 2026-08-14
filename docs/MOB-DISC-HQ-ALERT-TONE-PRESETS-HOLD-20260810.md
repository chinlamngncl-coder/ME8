# MOB DISC — Header mute/repeat off + selectable alarm tones (2026-08-10)

**Status:** Header mute/repeat **removed** (operator “take it off now”). Tone picker = **disc only** — no tone code until named APPLY.

**Read:** `.cursorrules` · zero-change · no invent beyond this disc.

---

## A) Done now — header

Removed `#header-voice-mute` and `#header-voice-repeat` from Ops header (next to Language).

- **Repeat:** gone (agreed — wrong place).  
- **Speaker mute:** also off the header per your order.  
- `voice-alerts.js` still no-ops if buttons missing (safe).  
- Session mute via Settings checkboxes / uncheck “Enable voice alerts” / “Enable alert tones” still works.  
- CSS `.header-voice-btn` left inert (harmless). Cleanup only if you APPLY a polish MOB later.

---

## B) What you want (tones) — got it

| Need | Meaning |
|------|---------|
| Place | Settings → Site security → **Alerts & voice** (beside / under Save voice settings — your screenshot) |
| Selectable tones | User picks; **defaults** OK |
| Per type | Separate: **SOS** tone vs **Analytics** (Weapon / Face / Plate) — operator knows which alarm family |
| Sequence | Tone starts → **voice speaks** → tone **continues** a few seconds (hold attention) |
| Not V1 | Custom upload of `.mp3` libraries (unless you later APPLY file pack) |

Your second section still shows a broken heading **“TITLE”** (missing i18n for Alert tones). Fix that in the same APPLY as the picker so the block reads **Alert tones**.

---

## C) Industry-ish hold length (recommendation)

Control-room / PSAP style: short attention cue → spoken phrase → **brief repeating cue** until Ack or a max window — not an endless siren (fatigue / lawsuit-adjacent annoyance).

| Option | Hold after speech | Verdict |
|--------|-------------------|---------|
| 5 s | Short desk ping loop | OK for FR/ANPR soft hits |
| **8–10 s** | Common “attention window” | **Recommend default 8 s** for SOS |
| Until Ack | Strongest | Better as **SOS-only** option later; not all analytics |

**Recommend for V1:**

1. Attention pattern (selected tone) ~1–1.5 s  
2. Speech (if enabled)  
3. Same tone **loops gently for 8 s** after speech starts (or after attention if speak off)  
4. Stops early on: Ack / Dismiss / header-less mute via “Enable alert tones” off / new superseding alert  

SOS can use a more urgent preset; analytics a softer one. Same engine, different default preset ids.

---

## D) UI sketch (minimal — do not invent chrome)

Under **Alerts & voice** (same card as Test speak / Save voice settings):

| Control | Purpose |
|---------|---------|
| **SOS tone** `<select>` | Preset A / B / C (+ Default) |
| **Analytics tone** `<select>` | Preset for Weapon+FR+ANPR (or split later) |
| **Hold after speak** | 5 / 8 / 10 s (default **8**) |
| Preview | Reuse **Test tone** / small Preview next to each select |

Keep existing per-type on/off checkboxes (Weapon / Fr / Anpr / Sos). Picker chooses *which sound*; checkboxes choose *whether*.

Store prefs: same browser `localStorage` as today’s tones (`hq-alert-audio-prefs-v1` extended) — or server voice settings if you insist sync across desks (say so in APPLY).

---

## E) Proposed APPLY (one only when ready)

`MOB-APPLY HQ-ALERT-TONE-PRESETS-HOLD-V1`

Scope:

1. Fix Alert tones title (no more “TITLE”).  
2. SOS + Analytics preset selects + default presets (Web Audio patterns — no new asset files in V1).  
3. Sequence: tone → voice → **8 s** hold loop (configurable 5/8/10).  
4. No header mute/repeat return.  
5. No custom file upload.

**Out of scope:** constant alarm until Ack (optional follow-up `…-LOOP-UNTIL-ACK-V1`).

---

## Got it?

Yes. Header chrome off. Tone place = that Settings block. Selectable SOS vs analytics + short post-speech hold (~8 s default).

Say **`MOB-APPLY HQ-ALERT-TONE-PRESETS-HOLD-V1`** when you want code.
