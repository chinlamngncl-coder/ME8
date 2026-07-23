# MOB-APPLIED: mob-zlm-relay-stable-geometry-v1

**Date:** 2026-07-16  
**Status:** APPLIED  
**File:** `lib/zlmLabRelay.js`  
**With:** `mob-wall-soft-zlm-live-chase-v1`

## What

Stop `Invalid frame dimensions 0x0` / resolution flips on Fleet→ZLM relay:

1. **Prime buffer** (~256KB or ~2.8s min 48KB) before spawning ffmpeg  
2. Larger **probesize / analyzeduration**  
3. **Even scale** `trunc(iw/2)*2` for openh264  
4. Keep **libopenh264** (not libx264 / not blind copy)

## Operator

1. Double-click **`RESTART-FLEET.bat`** → Yes if asked (**required** — server file)  
2. Hard refresh once  
3. Play → check resolution stays stable + lag better  

Agent log checks: `zlm relay ffmpeg spawned` … `geometry: stable-v1`, fewer `0x0` warns, still `zlm-relay primary`.
