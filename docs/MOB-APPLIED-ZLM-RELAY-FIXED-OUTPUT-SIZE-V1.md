# MOB APPLIED — mob-zlm-relay-fixed-output-size-v1

**Date:** 2026-07-17  
**File:** `lib/zlmLabRelay.js`  
**Rule:** `docs/MOB-DISC-NO-HARDCODE-LIVE-RESOLUTION.md`

---

## What changed

1. After prime buffer, **ffprobe** reads this cam’s MPEG-TS `width`×`height`.
2. Even-align only (`trunc` to even) — **no invent** of 720 / 1080 / 4K constants.
3. ffmpeg `-vf scale=W:H` uses **that probed size** for the session (fixed → kills 0x0 flips).
4. If probe fails → retry with more buffer; still fail → stop relay (**no hardcode fallback**).

---

## Operator

1. **`RESTART-FLEET.bat`**
2. Soft ZLM wall again (Open All / live as usual)
3. Log expect: `geometry: fixed-from-probe-v1` + `outWidth` / `outHeight` matching device
4. Fewer / no `Invalid frame dimensions 0x0`

---

## Pass

- Log shows probed out size (e.g. 1920×1080 or 3840×2160 — whatever device sends)
- Wall ZLM still `live broker zlm-relay primary` when Plan B soft path runs
- No hardcoded default resolution in code path
