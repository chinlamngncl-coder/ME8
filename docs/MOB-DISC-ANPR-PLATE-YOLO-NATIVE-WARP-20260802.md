# MOB DISC — ANPR-PLATE-YOLO-NATIVE-WARP-V1 (2026-08-02)

**Status:** APPLIED — await operator PASS  
**UI:** No Node / HTML / frontend.

## Locked

- CCPD YOLOv8-pose **4 keypoints** ONNX
- Letterbox detect → map to **native** high-res → pad **10–15%** (default 0.12) → `cv2.warpPerspective`
- OCR remains FastALPR + PP-OCRv4
- WPOD = hatch only (`FM_ANPR_PLATE_DET=wpod` force; `ccpd_only` disables hatch)

## Files

| File | Role |
|------|------|
| `anpr-sidecar/plate_pose_ccpd.py` | Pose ONNX → native warp |
| `anpr-sidecar/dual_lpr.py` | Cascade: CCPD first, WPOD hatch |
| `anpr-sidecar/pipeline.py` | Health: `platePose*` |
| `anpr-sidecar/models/README-CCPD-POSE.md` | Drop weights here |

## Operator PASS

1. Place CCPD pose ONNX under `anpr-sidecar/models/` (see README) or set `FM_ANPR_CCPD_POSE_ONNX`.
2. Restart `START-ANPR.bat`.
3. Health: `platePoseArchitecture=ccpd-yolov8-pose-native-warp-v1`; `platePose=ready` when weights present.
4. Live/Offline: readable deskewed plate strip; no junk OCR on previously failing skewed BWC.

Without weights: `platePose=missing` → WPOD hatch (same as before until ONNX is dropped).
