# Vehicle COCO ONNX (ANPR-LIVE-VEHICLE-SCENE-PLATE-V1)

Place **`yolov8n-coco.onnx`** here (gitignored — downloaded by `INSTALL.ps1`).

| Item | Value |
|------|--------|
| Runtime | onnxruntime only (no Ultralytics pip) |
| Default file | `yolov8n-coco.onnx` |
| Classes used | bicycle, car, motorcycle, bus, truck |
| Env override | `FM_ANPR_VEHICLE_ONNX` |

Lab may use YOLOv10n end2end export saved under that filename (`output0` shape `[1,N,6]`).
