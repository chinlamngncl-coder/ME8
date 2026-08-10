# MOB DISC — SOS-ALERT-AUDIO-RELIABLE-V1 APPLY (2026-08-09)

**Status:** APPLIED under `CREDIT-LEAN-HARD` (2 JS files + cache-bust tags only).

## Fix

1. Tone plays even if Speak SOS/Fall is off.  
2. Longer SOS/fall attention pattern (~1.2s+).  
3. Short **tail** tone after speech (~2.8s) or sooner if speak fails.  
4. 60s dedupe applies to **speech only**, not the first attention tone.

## Files

- `public/js/voice-alerts.js`  
- `public/js/hq-alert-audio.js`  
- `public/index.html` script `?v=` only  

## Check

Hard refresh → click page once → SOS → hear longer tones; mute still silences; Speak SOS off still beeps.
