# WPOD-NET (hatch only)

**Champion Stage 3** is CCPD YOLOv8-pose — see `README-CCPD-POSE.md`.

WPOD (`wpod_net.py`) runs only when CCPD misses, or when `FM_ANPR_PLATE_DET=wpod`.

## Optional ONNX

Place `wpod.onnx` here (or set `FM_ANPR_WPOD_ONNX`) for neural WPOD decode.

Without ONNX the hatch uses FastALPR plate box + OpenCV un-warp.

Pad default: `FM_ANPR_WPOD_PAD=0.15`
