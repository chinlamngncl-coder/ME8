# MOB DISC — HQ-ALERT-TONE-PRESETS-HOLD-V1 APPLY (2026-08-10)

**APPLY:** `MOB-APPLY HQ-ALERT-TONE-PRESETS-HOLD-V1`  
**Status:** APPLIED.

## Behavior

1. Settings → Site security → under **Save voice settings**: SOS tone / Analytics tone / Hold (5·8·10s) + Preview.  
2. **Alert tones** title fixed (no more “TITLE”). Enable checkboxes unchanged. **Save alert tones** persists presets.  
3. Sequence: attention burst → speech (if on) → **hold loop** (default **8 s**).  
4. Defaults: SOS = Urgent, Analytics = Classic.  
5. Soft analytics tier = short beep, no hold.  
6. No header mute/repeat. No file upload.

## Files

- `public/js/hq-alert-audio.js`  
- `public/js/voice-alerts.js` (SOS hold wiring)  
- `public/index.html` + `public/locales/en.json`  
- Cache bust `?v=20260810-hq-alert-tone-presets-hold-v1`

## Operator check

1. Hard refresh → Site security → Alerts & voice.  
2. Pick SOS / Analytics presets → **Preview SOS** / **Preview analytics**.  
3. **Save alert tones**.  
4. Trigger SOS: beep → speak → hold ~8s.  
5. Heading reads **Alert tones**.
