# CCPD YOLOv8-pose (4-point) — Stage 3 plate localize

**MOB:** `ANPR-PLATE-YOLO-NATIVE-WARP-V1`

Champion path (default `FM_ANPR_PLATE_DET=ccpd_pose`):

1. Vehicle YOLO → native high-res macro
2. Letterbox detect with YOLOv8-pose ONNX (4 corners)
3. Map keypoints back to **native** macro pixels
4. 10–15% pad (default `FM_ANPR_BOX_PAD=0.12`)
5. `cv2.warpPerspective` → FastALPR / PP-OCRv4

WPOD is hatch only (`FM_ANPR_PLATE_DET=wpod` to force; `ccpd_only` to disable hatch).

## Lab weights (installed)

| File | Source |
|------|--------|
| `plate_yolov8n_pose_ccpd.onnx` (~101 MB) | Exported from [PrasannaBAImodel/license-plate-keypoint-detection](https://huggingface.co/PrasannaBAImodel/license-plate-keypoint-detection) (`license_plate_keypoint.pt` → ONNX). YOLOv8m-Pose, **4 plate corners** (TL/TR/BR/BL). Roboflow license-plate dataset (CC BY 4.0); model Apache-2.0 / Ultralytics AGPL base. |

Re-fetch / re-export: `python download_ccpd_pose_weights.py` from `anpr-sidecar/`.

## Drop weights here (first match wins)

| File | Notes |
|------|--------|
| `plate_yolov8n_pose_ccpd.onnx` | preferred name (lab file above) |
| `yolov8n-pose-plate-ccpd.onnx` | alt |
| `plate_pose_ccpd.onnx` | alt |
| `ccpd_yolov8n_pose.onnx` | alt |

Or set absolute path: `FM_ANPR_CCPD_POSE_ONNX=C:\path\to\model.onnx`

## Env

| Var | Default | Meaning |
|-----|---------|---------|
| `FM_ANPR_PLATE_DET` | `ccpd_pose` | `ccpd_pose` / `ccpd_only` / `wpod` |
| `FM_ANPR_CCPD_POSE_ONNX` | (auto) | override weights path |
| `FM_ANPR_CCPD_POSE_SIZE` | `640` | letterbox size |
| `FM_ANPR_CCPD_POSE_CONF` | `0.25` | min object conf |
| `FM_ANPR_BOX_PAD` | `0.12` | clamp 0.10–0.15 |

Health: `GET /health` → `platePose`, `platePoseWeights`, `platePoseArchitecture`.

Without ONNX on disk, Stage 3 falls through to WPOD hatch (unless `ccpd_only`).
