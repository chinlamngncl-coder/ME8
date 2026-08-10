# MOB DISC — HQ-ALERT-AUDIO-V1 APPLY (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY HQ-ALERT-AUDIO-V1`

## Locked scope (this APPLY)

| Item | Behavior |
|------|----------|
| Shared module | `public/js/hq-alert-audio.js` — one beep path for desk alerts |
| Weapon | Tone when a hit becomes the on-screen HQ/toast alert |
| Face / Plate | FR chime routes through shared module (ANPR via FR hit kind) |
| SOS / fall | Short tone on SOS alarm (with existing voice speak if enabled) |
| Mute | Header voice mute silences **tones + voice** |
| Settings | Settings → Alerts & voice → **Alert tones** (on/off per type). Stored in browser localStorage |
| Not in V1 | Custom siren files, per-user server, server-synced tone prefs |

## Operator check

1. Restart / hard refresh once.  
2. Click the dashboard once (browser audio unlock).  
3. Settings → Alerts & voice → **Test tone** (hear beep).  
4. Weapon / Face / Plate / SOS → hear type tone; header mute → silence.

## Later (not this APPLY)

Richer tone picker / volume slider server-side → only if you name a follow-up APPLY.
