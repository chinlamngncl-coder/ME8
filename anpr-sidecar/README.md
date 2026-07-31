# Mobility Axiom — ANPR (vehicle scene + FastALPR plate)

**Ship engine:** COCO vehicle ONNX (scene) + FastALPR (plate detect/OCR).  
**Live rail:** vehicle picture primary; tight plate crop secondary.  
**Lab hatch:** `FM_ANPR_ENGINE=paddle` (legacy YOLO+Paddle path).

## Lab / ship start

1. `anpr-sidecar\INSTALL.ps1` (once — also downloads `models/yolov8n-coco.onnx`)  
2. ME8 root: `START-ANPR.bat` — **one window**  
3. Health: `vehicleDetect: ready`, `powerCrop: whole-vehicle-crop-v1`, `fastalpr: ready`

## Env

| Var | Default | Meaning |
|-----|---------|---------|
| `FM_ANPR_ENGINE` | `fastalpr` | Ship default; `paddle` = hatch |
| `FM_ANPR_VEHICLE_DETECT` | `1` | Vehicle scene for Live rail |
| `FM_ANPR_VEHICLE_ONNX` | `models/yolov8n-coco.onnx` | COCO car/moto/bus/truck |
| `FM_ANPR_VEHICLE_CONF` | `0.25` | Vehicle score floor |
| `FM_ANPR_FASTALPR_DET` | `yolo-v9-t-512-license-plate-end2end` | Primary MIT plate ONNX |
| `FM_ANPR_FASTALPR_DET_CONF` | `0.18` | Detector confidence |
| `FM_ANPR_FASTALPR_DET_FALLBACK` | `yolo-v9-t-384-…` | If 512 finds nothing |
| `FM_ANPR_FASTALPR_OCR` | `cct-xs-v2-global-model` | OCR |
| `FM_ANPR_POLL_SEC` | `1` | Live grab cadence |
| `FM_ANPR_CROP_DEDUPE_MS` | `900` | Min gap between rail crops |
| `FM_ANPR_CONF_FLOOR` | `0.80` | OCR publish floor |
| `FM_ANPR_REGION` | `ph` | Regex validator pack (OCR only — not crop) |
| `FM_ANPR_SIDECAR_AUTO` | off | Node auto-spawn |

See `models/README-MIT-PLATE-DET.md` + `models/README-VEHICLE-COCO.md`.

## Field PASS (locked)

Yellow PUV `RP07032017-tuch.jpg` → **WOO 185** @ ~98% (FastALPR eval → ship).

## Ship pack

Include `anpr-sidecar/` + venv install via `INSTALL.ps1` + `START-ANPR.bat`.
