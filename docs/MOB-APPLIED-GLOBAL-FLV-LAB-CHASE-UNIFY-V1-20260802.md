# MOB-APPLIED: GLOBAL-FLV-LAB-CHASE-UNIFY-V1

**Date:** 2026-08-02  
**APPLY:** User mandate — restore proven lab soft-chase into `AxiomFlvManager` + bind all FLV panels  
**Status:** APPLIED  
**Cache:** `?v=20260802-lab-chase-unify-v1`

---

## What changed

### 1) Proven soft-chase math restored in manager

**File:** `public/js/shared-flv-player.js`

Deleted failing `0.5s / 1.05x / hard 2s` band.

Restored lab math from `wvp-lab-tile.js` / `mob-wvp-lab-mpegts-live-chase`:

| Constant | Value |
|----------|-------|
| Soft trigger | **1.5** s (`buffered.end - currentTime`) |
| Soft rate | **1.12** |
| Hard seek | **10** s (pad **0.25**) |
| Reset rate | **1.0** |

Only this file owns `playbackRate` soft-chase now.

### 2) Global unification

| Surface | Path |
|---------|------|
| Ops wall | `video-wall.js` → `Me8LivePlayerFactory.attachFlvPrimary` → `AxiomFlvManager.attach` |
| FR | `fr-live-watch.js` → factory → manager |
| ANPR | `anpr-live-watch.js` → factory → manager |
| Tactical | `tactical-poi.js` / `tactical-ar.js` → factory → manager |
| Command Wall | `command-wall.js` → factory → manager |
| VC / matrix / live popout | `matrix.html` / `live.html` / `index.html` → factory → manager |
| Lab WVP tiles | `wvp-lab-tile.js` → **direct** `AxiomFlvManager.attach` (local chase loop **removed**) |

Standalone pages now load manager before factory:

- `public/matrix.html`
- `public/live.html`
- `public/command-wall.html`

### 3) Grid memory hygiene

`AxiomFlvManager.detach` order remains:

`pause()` → `unload()` → `detachMediaElement()` → `destroy()`  
then reset `playbackRate = 1`, pause video element, clear `src` / `load()`.

Factory `cleanup` / panel `handle.destroy()` call `AxiomFlvManager.detach(video)`.

### 4) Not touched (scope lock)

- OCR / ANPR sidecar / AI backends  
- CSS design tokens  
- Firmware Gold pin mirror cores in `video-wall.js` (pin still mirrors wall)  
- WVP/ZLM server handoff  
- Hard `liveBufferLatencyChasing` stays **OFF**

---

## Operator check

1. Restart Fleet / hard refresh dashboard (`?v=20260802-lab-chase-unify-v1`).  
2. Open Ops, Command Wall, FR, ANPR, Tactical — picture should track smoothly (lab band, not 0.5s jerk).  
3. Switch tabs / close tiles — no decoder pile-up (detach on destroy).  
4. Pass/fail from what you see.
