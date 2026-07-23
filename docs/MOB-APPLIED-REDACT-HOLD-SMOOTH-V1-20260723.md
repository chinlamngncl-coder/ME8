# MOB APPLIED — REDACT-HOLD-SMOOTH-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY REDACT-HOLD-SMOOTH-V1`  
**Disc:** `MOB-DISC-REDACT-MOTION-FRAME-GAPS-20260723.md`  
**Parent:** Phase 2 after `REDACT-FACE-QUALITY-KNOBS-V1`

## What changed

| Knob / behaviour | Before | After | Why |
|------------------|--------|-------|-----|
| `--hold-frames` | **14** (~0.5s) | **22** (~0.7s @30fps) | Bridge longer detector dropouts on turns / motion |
| Miss / sparse-detect frames | Freeze last box | **Velocity coast** (damped) | Blur follows walking face; fewer clear flashes |
| Auto preview `--stride` | **3** | **2** | Denser yellow preview (closer to burn) |
| `--pad` | 0.12 | **0.12 unchanged** | No fat body box |

## Files

- `redaction-track/detect_faces.py` — hold default, `_coast_track` / velocity EMA, coast between detect samples
- `lib/faceTrackSidecar.js` — burn default hold **22**
- `lib/evidenceWorkflow.js` — Save face-follow hold **22**
- `server.js` — autoface preview stride **2**

## Operator verify

1. **Restart** Fleet (Python + Node pick up new defaults).  
2. Same hard walking/turning clip → **Auto** → Save → Finalize → Download.  
3. Scrub: clear-face **flashes during motion** should be fewer/shorter.  
4. Blur box should **not** suddenly cover half the torso (pad unchanged).  
5. Slightly longer blur trail after face leaves frame is OK (expected trade-off).

## Next if still weak

`REDACT-PREVIEW-CONTROLS-BURN-V1` — then tracker upgrade. Or Stage B security: `mob-sec-evidence-upload-safe-name`.
