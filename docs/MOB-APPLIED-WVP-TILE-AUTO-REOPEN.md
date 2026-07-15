# MOB — WVP tile auto-reopen

**Status:** APPLIED 2026-07-14 — `mob-wvp-tile-auto-reopen`  
**Scope:** `public/js/wvp-lab-tile.js` only

## Change

When a tile loses FLV (mpegts error or ~22s frozen picture) while Play is still active:

- Silent re-`startPlay` for **that tile only**
- Min **8s** between attempts, max **12** per manual Play
- **Stop** cancels auto-reopen

Latency path unchanged (direct FLV + nomute-stall kept).

## You prove

1. Hard refresh
2. Play A + B (Opera private OK)
3. Leave **> 10 min**
4. Both still picture (may blink on reopen) = **PASS**; Tile B stays dead = **FAIL**
