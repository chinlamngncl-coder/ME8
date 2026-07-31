# MOB APPLIED — ANPR-LIVE-POWER-CROP-MIT-V1

**Date:** 2026-07-31  
**APPLY:** `MOB-APPLY ANPR-LIVE-POWER-CROP-MIT-V1`  
**Status:** APPLIED — await operator PASS  

**Disc:** `MOB-DISC-ANPR-LIVE-POWER-CROP-MIT-20260731.md`

---

## What changed

| Item | Before | After |
|------|--------|--------|
| Primary plate det | MIT `yolo-v9-t-**384**` | MIT `yolo-v9-t-**512**` (open-image-models) |
| Det conf | 0.25 | **0.18** (small / bike / far) |
| Fallback | none | **384** @ 0.14 if 512 finds no box |
| Live poll | 3s | **1s** (`FM_ANPR_POLL_SEC`) |
| Crop dedupe | 2500ms | **900ms** |
| License | MIT ONNX path | Documented in `anpr-sidecar/models/README-MIT-PLATE-DET.md` |

**Not in this MOB:** vehicle→plate cascade (next if still weak), AGPL Ultralytics, region text packs, map-on-hit.

**Files:** `anpr-sidecar/fastalpr_engine.py`, `pipeline.py`, `README.md`, `INSTALL.ps1`, `models/README-MIT-PLATE-DET.md`, `lib/anprLivePoller.js`, `lib/anprSidecarClient.js`, `START-ANPR.bat`

---

## Operator

1. Stop ANPR window → run **`START-ANPR.bat`** again (downloads 512 ONNX on first warm if needed).  
2. Restart **ME8** (poller 1s).  
3. Hard refresh → ANPR Live → Start watch → moving car / bike with plate in view.

**PASS:** 8-rail fills denser with **tighter** plate crops on moving vehicles; better than 384-only.  
**FAIL:** Still empty/sparse, or still full-frame junk.

If bikes/far plates still fail after PASS attempt → next disc MOB: `ANPR-LIVE-VEHICLE-THEN-PLATE-V1`.
