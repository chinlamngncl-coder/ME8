# ANPR plate detector weights (MIT)

Ship Live / Snapshot detect uses **FastALPR** + **open-image-models** ONNX plate detectors:

| Model | Role |
|-------|------|
| `yolo-v9-t-512-license-plate-end2end` | **Default** (ANPR-LIVE-POWER-CROP-MIT-V1) |
| `yolo-v9-t-384-license-plate-end2end` | Fallback when 512 finds no box |

- **License:** MIT ([ankandrew/open-image-models](https://github.com/ankandrew/open-image-models), FastALPR)
- **Runtime:** onnxruntime only (no Ultralytics AGPL in ship path)
- Models download to the FastALPR / open-image-models cache on first warm (`INSTALL.ps1` / `START-ANPR.bat`)

Do **not** add AGPL Ultralytics or GPL plate demos to this folder for customer ship.
