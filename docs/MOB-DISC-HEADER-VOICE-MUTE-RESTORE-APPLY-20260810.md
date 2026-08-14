# MOB DISC — HEADER-VOICE-MUTE-RESTORE-V1 APPLY (2026-08-10)

**APPLY:** `MOB-APPLY HEADER-VOICE-MUTE-RESTORE-V1`  
**Status:** APPLIED. **Only** header mute/repeat markup restored.

## Change

`public/index.html` — inside `#header-actions`, before Language:

- `#header-voice-mute` (existing CSS `.header-voice-btn`; JS already in `voice-alerts.js`)
- `#header-voice-repeat` (same; needed for bindHeader)

Same ids/classes as prior working baseline. **No** edits to `voice-alerts.js`, tones, Settings, or other modules.

## Operator check

1. Hard refresh Ops.  
2. Header (near Language): speaker icon + **Repeat**.  
3. Click mute → icon changes / alerts silent; click again → unmute.  
4. Optional: SOS or Test speak → Repeat replays last phrase.
