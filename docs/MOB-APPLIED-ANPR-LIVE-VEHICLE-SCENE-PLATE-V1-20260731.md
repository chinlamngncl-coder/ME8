# MOB APPLIED — ANPR-LIVE-VEHICLE-SCENE-PLATE-V1

**Date:** 2026-07-31  
**APPLY:** `MOB-APPLY ANPR-LIVE-VEHICLE-SCENE-PLATE-V1`  
**Status:** APPLIED — await operator PASS  
**Disc:** `MOB-DISC-ANPR-LIVE-VEHICLE-SCENE-PLATE-FAIL-20260731.md`

---

## What changed

| Before | After |
|--------|--------|
| Plate-box only → empty if miss | **Vehicle detect** (car/moto/bus/truck/bike) → rail still fills |
| Rail = plate scrap only | Rail primary = **vehicle scene**; plate thumb + text secondary |
| Silence with vehicle in lens | Vehicle JPEG even when OCR/plate miss |

**Pipeline:** FLV grab → COCO YOLO ONNX (onnxruntime) → plate on vehicle ROI + full frame (FastALPR) → `vehicleUrl` + `cropUrl` tick.

**Files:** `anpr-sidecar/vehicle_detect.py`, `pipeline.py`, `INSTALL.ps1`, `lib/anprLivePoller.js`, `public/js/anpr-live-watch.js`, `public/index.html` (cache `?v=20260731-anpr-live-vehicle-scene-plate-v1`)

**Weights:** `anpr-sidecar/models/yolov8n-coco.onnx` (downloaded by INSTALL; gitignored).

---

## Operator

1. If vehicle ONNX missing: run `anpr-sidecar\INSTALL.ps1` once (or confirm `models\yolov8n-coco.onnx` exists).  
2. Restart **ANPR** (`START-ANPR.bat`) + **ME8**.  
3. Hard refresh → ANPR Live → Start watch → point at motor / car / bus / lorry.

**PASS:** 8-rail shows **vehicle pictures** you can recognize; plate text/crop when readable.  
**FAIL:** Still empty with vehicle filling the lens, or plate-scrap only with no vehicle.
