# MOB-APPLIED — REDACT-FACE-QUALITY-KNOBS-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-REDACT-FACE-QUALITY-MISS-REFINE-20260722.md`  
**Operator constraint (this APPLY):** Do **not** fatten the blur box (covers body). Prefer **shorter clear gaps** on direction / frame changes.

## What changed

| Knob / behaviour | Before | After | Why |
|------------------|--------|-------|-----|
| `--hold-frames` | **4** (~0.13s) | **14** (~0.5s @30fps) | Bridge short detector dropouts when face turns |
| `--iou` from Node | **not passed** (Python default 0.25) | **0.18** wired | Turned face still rematches same track |
| Turn rematch | IoU only | IoU + **nearby-center** fallback | Direction change often kills IoU |
| Box update | Snap to new detect | Light **blend** (35/65) | Smoother without bigger pad |
| `--pad` | 0.12 | **0.12 unchanged** | Operator: bigger box covers body — rejected |

## Files

- `redaction-track/detect_faces.py` — hold default, tracker rematch/blend, report `iou`
- `lib/faceTrackSidecar.js` — pass `--hold-frames` / `--iou`
- `lib/evidenceWorkflow.js` — same defaults on Save face-follow

## Operator verify

1. **Restart** Fleet / server (Python + Node defaults).  
2. Same hard clip → Auto face-follow → Save → Finalize → Download.  
3. Watch **head turns / direction changes** — clear-face flashes should be shorter or gone.  
4. Blur box should **not** look much fatter (no full-torso cover).  
5. If a face is still fully missed (never detected), draw a **manual** box on top and Save again — knobs cannot invent a face the detector never sees.

## Next if still short gaps

`REDACT-HOLD-SMOOTH-V1` — stronger interpolate between detects (only if this PASS is incomplete).
