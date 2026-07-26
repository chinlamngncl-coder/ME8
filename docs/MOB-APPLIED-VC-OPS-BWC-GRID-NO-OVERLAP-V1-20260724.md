# MOB-APPLIED — VC-OPS-BWC-GRID-NO-OVERLAP-V1

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY VC-OPS-BWC-GRID-NO-OVERLAP-V1`  
**Disc:** `MOB-DISC-VC-OPS-BWC-GRID-NO-OVERLAP-20260724.md`

## Problem

Operations put multiple share tiles (BWC **and** fixed cams) in `.vc-spotlight-inner`, but Speaker/Focus CSS forced every tile to `position: absolute; inset: 0` → all stacked → overlap.

## Fix

Operations-only CSS after that absolute block:

- `.vc-spotlight-inner` → `display: grid !important`
- each `.vc-tile` → `position: relative !important`, `inset: auto`, cell **16:9** (not full-pane stack)
- media/video still fill **inside** each cell with `object-fit: contain`

Speaker / Focus absolute full-bleed unchanged. No LiveKit / cap / dock changes.

## Files

- `public/index.html` — CSS block `VC-OPS-BWC-GRID-NO-OVERLAP-V1`
- `scripts/verify-vc-ops-bwc-grid-no-overlap-v1.js`

## Operator check

1. VC → **Ctrl+F5** → Join → **Operations**.  
2. Add **2 BWCs** → two separate cells, both visible.  
3. Add fixed camera(s) → each its own cell; no stack with BWC.  
4. Speaker / Focus still one clean main stage.

## Verify

```text
node scripts/verify-vc-ops-bwc-grid-no-overlap-v1.js
```
