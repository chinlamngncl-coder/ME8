#!/usr/bin/env python3
"""
Face-track detection sidecar for evidence redaction.

Legal-free stack:
  - OpenCV (Apache-2.0) for video decode + DNN inference + drawing
  - YuNet face detector ONNX model (MIT, OpenCV Zoo)

This process is spawned on demand by the Node server ONLY when the
analyticsFace ("fr") entitlement is enabled. It never runs on the live
video path. Output is a JSON timeline of face boxes per sampled frame;
the operator reviews/edits before any blur is burned in.

Modes
  selfcheck
      Print JSON describing runtime readiness (cv2 / numpy present,
      model file found). Exit 0 always so the caller can read the report.

  detect --input <video> --out <json> [--model <onnx>]
         [--max-seconds N] [--stride N] [--score N]
      Sample frames, run YuNet, write a JSON track timeline.

No network access. No writes outside the given --out path.
"""

import argparse
import json
import os
import sys

DEFAULT_MODEL = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "models",
    "face_detection_yunet.onnx",
)


def _emit(obj):
    sys.stdout.write(json.dumps(obj))
    sys.stdout.flush()


def run_selfcheck(model_path):
    report = {
        "ok": False,
        "python": sys.version.split()[0],
        "cv2": None,
        "numpy": None,
        "model": model_path,
        "modelPresent": os.path.isfile(model_path),
        "missing": [],
    }
    try:
        import cv2  # noqa: F401
        report["cv2"] = getattr(cv2, "__version__", "unknown")
    except Exception as exc:  # pragma: no cover - env dependent
        report["missing"].append("opencv-python (%s)" % exc.__class__.__name__)
    try:
        import numpy  # noqa: F401
        report["numpy"] = getattr(numpy, "__version__", "unknown")
    except Exception as exc:  # pragma: no cover - env dependent
        report["missing"].append("numpy (%s)" % exc.__class__.__name__)
    if not report["modelPresent"]:
        report["missing"].append("YuNet model file")
    report["ok"] = report["cv2"] is not None and report["numpy"] is not None and report["modelPresent"]
    _emit(report)
    return 0


def run_detect(args):
    try:
        import cv2
    except Exception as exc:
        _emit({"ok": False, "error": "opencv-python not installed: %s" % exc})
        return 2

    if not os.path.isfile(args.model):
        _emit({"ok": False, "error": "model file not found", "model": args.model})
        return 2
    if not os.path.isfile(args.input):
        _emit({"ok": False, "error": "input video not found", "input": args.input})
        return 2

    cap = cv2.VideoCapture(args.input)
    if not cap.isOpened():
        _emit({"ok": False, "error": "could not open input video"})
        return 2

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    if fps <= 0:
        fps = 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    detector = cv2.FaceDetectorYN.create(
        args.model, "", (width or 320, height or 240),
        score_threshold=float(args.score),
    )
    if width and height:
        detector.setInputSize((width, height))

    stride = max(1, int(args.stride))
    max_frames = total
    if args.max_seconds and args.max_seconds > 0:
        max_frames = min(total or 10 ** 9, int(args.max_seconds * fps))

    frames = []
    idx = 0
    read = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if max_frames and idx >= max_frames:
            break
        if idx % stride == 0:
            _, faces = detector.detect(frame)
            boxes = []
            if faces is not None:
                for f in faces:
                    x, y, w, h = f[0], f[1], f[2], f[3]
                    score = f[-1] if len(f) > 14 else f[14] if len(f) > 14 else 0
                    boxes.append({
                        "x": int(max(0, round(float(x)))),
                        "y": int(max(0, round(float(y)))),
                        "w": int(round(float(w))),
                        "h": int(round(float(h))),
                        "score": round(float(score), 3),
                    })
            frames.append({"t": round(idx / fps, 3), "boxes": boxes})
            read += 1
        idx += 1
    cap.release()

    _emit({
        "ok": True,
        "fps": round(fps, 3),
        "width": width,
        "height": height,
        "frameCount": total,
        "sampled": read,
        "stride": stride,
        "frames": frames,
    })
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description="Evidence face-track detection sidecar")
    sub = parser.add_subparsers(dest="mode")

    sc = sub.add_parser("selfcheck")
    sc.add_argument("--model", default=DEFAULT_MODEL)

    dt = sub.add_parser("detect")
    dt.add_argument("--input", required=True)
    dt.add_argument("--out", default=None)
    dt.add_argument("--model", default=DEFAULT_MODEL)
    dt.add_argument("--max-seconds", type=float, default=0.0, dest="max_seconds")
    dt.add_argument("--stride", type=int, default=3)
    dt.add_argument("--score", type=float, default=0.6)

    args = parser.parse_args(argv)
    if args.mode == "selfcheck":
        return run_selfcheck(args.model)
    if args.mode == "detect":
        rc = run_detect(args)
        return rc
    parser.print_help(sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
