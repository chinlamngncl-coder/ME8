"""
One-shot: download YOLOv8m-pose 4-corner plate weights + export ONNX
into models/plate_yolov8n_pose_ccpd.onnx (name expected by plate_pose_ccpd.py).

Source: Hugging Face PrasannaBAImodel/license-plate-keypoint-detection
  (YOLOv8m-Pose, 4 plate corners TL/TR/BR/BL — public Apache-2.0 / AGPL base)
"""
from __future__ import annotations

import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(ROOT, "models")
PT_PATH = os.path.join(MODELS, "_tmp_license_plate_keypoint.pt")
ONNX_OUT = os.path.join(MODELS, "plate_yolov8n_pose_ccpd.onnx")

# Direct LFS resolve URL
PT_URL = (
    "https://huggingface.co/PrasannaBAImodel/license-plate-keypoint-detection"
    "/resolve/main/license_plate_keypoint.pt"
)


def main() -> int:
    os.makedirs(MODELS, exist_ok=True)
    if os.path.isfile(ONNX_OUT) and os.path.getsize(ONNX_OUT) > 1_000_000:
        print("OK already present:", ONNX_OUT, os.path.getsize(ONNX_OUT))
        return 0

    if not os.path.isfile(PT_PATH) or os.path.getsize(PT_PATH) < 1_000_000:
        print("Downloading .pt (~101 MB)…")
        print(PT_URL)
        urllib.request.urlretrieve(PT_URL, PT_PATH)
        print("Saved", PT_PATH, os.path.getsize(PT_PATH))
    else:
        print("Using cached", PT_PATH)

    print("Exporting ONNX (ultralytics)…")
    from ultralytics import YOLO

    model = YOLO(PT_PATH)
    # simplify=False avoids broken system onnxruntime/numpy during onnxslim
    exported = model.export(format="onnx", imgsz=640, simplify=False, opset=12)
    exported = str(exported)
    if not os.path.isfile(exported):
        # Ultralytics often writes next to .pt
        cand = PT_PATH.replace(".pt", ".onnx")
        if os.path.isfile(cand):
            exported = cand
        else:
            print("ERROR: export path missing:", exported)
            return 1

    # Move/rename to champion path
    if os.path.abspath(exported) != os.path.abspath(ONNX_OUT):
        if os.path.isfile(ONNX_OUT):
            os.remove(ONNX_OUT)
        os.replace(exported, ONNX_OUT)

    size = os.path.getsize(ONNX_OUT)
    print("WROTE", ONNX_OUT, size, "bytes")

    # Cleanup temp pt to save disk (optional — keep for re-export)
    # os.remove(PT_PATH)

    # Quick session open with sidecar venv if possible
    try:
        import onnxruntime as ort

        sess = ort.InferenceSession(ONNX_OUT, providers=["CPUExecutionProvider"])
        inp = sess.get_inputs()[0]
        print("ONNX OK input:", inp.name, inp.shape)
    except Exception as exc:  # noqa: BLE001
        print("WARN: onnxruntime check skipped/failed:", exc)
        print("(START-ANPR.bat venv will validate on restart)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
