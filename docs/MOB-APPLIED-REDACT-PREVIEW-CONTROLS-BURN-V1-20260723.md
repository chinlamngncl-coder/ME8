# MOB APPLIED — REDACT-PREVIEW-CONTROLS-BURN-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY REDACT-PREVIEW-CONTROLS-BURN-V1`  
**Plain disc:** `MOB-DISC-REDACT-PREVIEW-CONTROLS-BURN-PLAIN-20260723.md`

## Choice (one path)

**Exclude-list** (not keep-only): burn still finds faces as today; **deleted** Auto yellow boxes become suppress seeds. No edit → same as before. Safer than “only blur kept preview boxes” (would miss faces never shown in sparse preview).

## What changed

| Layer | Change |
|-------|--------|
| `public/js/evidence-hub.js` | Delete / Undo Auto preview → `excludeRegions`; Save sends them with `faceFollow` |
| `server.js` | Passes `excludeRegions` into face-follow Save |
| `lib/evidenceWorkflow.js` | Writes exclude JSON for sidecar |
| `lib/faceTrackSidecar.js` | `--exclude-json` |
| `redaction-track/detect_faces.py` | Skip detections / tracks overlapping exclude seeds (IoU + nearby center) |

**Cache:** `evidence-hub.js?v=20260723-redact-preview-controls-burn-v1`

## Operator verify (plain)

1. **Restart Fleet.** Ctrl+F5 on Evidence.  
2. Open a clip → **Auto** → yellow boxes appear.  
3. **✕ delete one wrong** yellow box (false face).  
4. **Save** → Finalize → Download.  
5. **PASS:** that wrong area stays mostly **clear**; other faces still blur.  
6. **FAIL:** deleted yellow face still heavily blurred like before this MOB.

No new button — same ✕ on the Auto row.
