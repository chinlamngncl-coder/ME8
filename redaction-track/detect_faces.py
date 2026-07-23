#!/usr/bin/env python3
"""
Face-track / face-follow sidecar for evidence redaction.

mob-evidence-redact-seeta-detect-v1:
  Default detector = SeetaFace6 (same stack as FR lab).
  YuNet only if --engine yunet / FM_REDACT_FACE_ENGINE=yunet.

Legal-free stack:
  - OpenCV for video decode + Gaussian ROI blur
  - SeetaFace6 face_detector (default Auto)
  - YuNet ONNX (parked / opt-in only)

Spawned on demand by Node when analyticsFace ("fr") is enabled.
Never on the live video path.

Modes
  selfcheck
  detect --input <video> [--engine seeta|yunet] ...
  burn --input <video> --out <video> [--engine seeta|yunet] ...

No network. No writes outside --out / --timeline-out.
"""

from __future__ import print_function

import argparse
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL = os.path.join(_HERE, "models", "face_detection_yunet.onnx")
SEETA_VENDOR = os.path.normpath(
    os.path.join(_HERE, "..", "fr-sidecar-seeta", "vendor", "seetaFace6Python")
)
SEETA_MODEL_DIR = os.path.join(SEETA_VENDOR, "seetaface", "model")
SEETA_DLL = os.path.join(SEETA_VENDOR, "seetaface", "lib", "win", "libFaceAPI.dll")
SEETA_DETECTOR_MODEL = os.path.join(SEETA_MODEL_DIR, "face_detector.csta")
MAX_FACES_PER_FRAME = 6

_seeta_face = None
_seeta_error = None


def _emit(obj):
    sys.stdout.write(json.dumps(obj))
    sys.stdout.flush()


def _normalize_engine(raw):
    e = str(raw or "seeta").strip().lower()
    if e in ("yunet", "opencv", "opencv-yunet"):
        return "yunet"
    return "seeta"


def _load_seeta_detector():
    """Detect-only SeetaFace (FACE_DETECT). Shared with FR lab vendor tree."""
    global _seeta_face, _seeta_error
    if _seeta_face is not None:
        return _seeta_face
    if _seeta_error:
        return None
    if not os.path.isfile(SEETA_DETECTOR_MODEL):
        _seeta_error = "seeta_model_missing:face_detector.csta"
        return None
    if not os.path.isfile(SEETA_DLL):
        _seeta_error = "seeta_dll_missing"
        return None
    try:
        if SEETA_VENDOR not in sys.path:
            sys.path.insert(0, SEETA_VENDOR)
        from seetaface.api import FACE_DETECT, SeetaFace  # type: ignore

        _seeta_face = SeetaFace(FACE_DETECT)
        return _seeta_face
    except Exception as exc:  # pragma: no cover
        _seeta_error = str(exc)[:400]
        _seeta_face = None
        return None


def _reject_absurd_box(w, h, width, height):
    if w < 8 or h < 8:
        return True
    if width > 0 and w > width * 0.55:
        return True
    if height > 0 and h > height * 0.55:
        return True
    if width > 0 and height > 0 and (w * h) > (width * height * 0.28):
        return True
    return False


def _detect_boxes_seeta(sf, frame, width, height):
    """All Seeta faces, largest-first, capped — avoids YuNet-style flood blur."""
    boxes = []
    try:
        detect_result = sf.Detect(frame)
    except Exception:
        return boxes
    if detect_result is None or getattr(detect_result, "size", 0) <= 0:
        return boxes
    raw = []
    for i in range(int(detect_result.size)):
        face = detect_result.data[i].pos
        x = int(getattr(face, "x", 0) or 0)
        y = int(getattr(face, "y", 0) or 0)
        w = int(getattr(face, "width", 0) or 0)
        h = int(getattr(face, "height", 0) or 0)
        if _reject_absurd_box(w, h, width, height):
            continue
        score = 1.0
        try:
            score = float(detect_result.data[i].score)
        except Exception:
            score = 1.0
        raw.append({
            "x": max(0, x),
            "y": max(0, y),
            "w": w,
            "h": h,
            "score": round(score, 3),
            "area": w * h,
        })
    raw.sort(key=lambda b: b["area"], reverse=True)
    for b in raw[:MAX_FACES_PER_FRAME]:
        boxes.append({
            "x": b["x"],
            "y": b["y"],
            "w": b["w"],
            "h": b["h"],
            "score": b["score"],
        })
    return boxes


def run_selfcheck(model_path, engine="seeta"):
    engine = _normalize_engine(engine)
    report = {
        "ok": False,
        "engine": engine,
        "python": sys.version.split()[0],
        "cv2": None,
        "numpy": None,
        "model": model_path if engine == "yunet" else SEETA_DETECTOR_MODEL,
        "modelPresent": False,
        "missing": [],
        "modes": ["selfcheck", "detect", "burn"],
        "detector": "seeta_face_detector" if engine == "seeta" else "yunet",
    }
    try:
        import cv2  # noqa: F401
        report["cv2"] = getattr(cv2, "__version__", "unknown")
    except Exception as exc:  # pragma: no cover
        report["missing"].append("opencv-python (%s)" % exc.__class__.__name__)
    try:
        import numpy  # noqa: F401
        report["numpy"] = getattr(numpy, "__version__", "unknown")
    except Exception as exc:  # pragma: no cover
        report["missing"].append("numpy (%s)" % exc.__class__.__name__)

    if engine == "seeta":
        report["modelPresent"] = os.path.isfile(SEETA_DETECTOR_MODEL)
        report["dllPresent"] = os.path.isfile(SEETA_DLL)
        if not report["modelPresent"]:
            report["missing"].append("Seeta face_detector.csta")
        if not report["dllPresent"]:
            report["missing"].append("Seeta libFaceAPI.dll")
        sf = _load_seeta_detector()
        if sf is None:
            report["missing"].append(_seeta_error or "seeta_load_failed")
            report["hint"] = "Run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1"
        report["ok"] = (
            report["cv2"] is not None
            and report["numpy"] is not None
            and sf is not None
        )
    else:
        report["modelPresent"] = os.path.isfile(model_path)
        if not report["modelPresent"]:
            report["missing"].append("YuNet model file")
        report["ok"] = (
            report["cv2"] is not None
            and report["numpy"] is not None
            and report["modelPresent"]
        )
    _emit(report)
    return 0


def _iou(a, b):
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
    ix = max(a["x"], b["x"])
    iy = max(a["y"], b["y"])
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    iw = max(0, ix2 - ix)
    ih = max(0, iy2 - iy)
    inter = iw * ih
    uni = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return (inter / float(uni)) if uni > 0 else 0.0


def _pad_box(b, pad, width, height):
    px = int(round(b["w"] * pad))
    py = int(round(b["h"] * pad))
    x = max(0, int(b["x"]) - px)
    y = max(0, int(b["y"]) - py)
    x2 = min(width, int(b["x"]) + int(b["w"]) + px)
    y2 = min(height, int(b["y"]) + int(b["h"]) + py)
    w = max(2, x2 - x)
    h = max(2, y2 - y)
    return {"x": x, "y": y, "w": w, "h": h}


def _detect_boxes_yunet(detector, frame, width, height):
    _, faces = detector.detect(frame)
    boxes = []
    if faces is None:
        return boxes
    raw = []
    for f in faces:
        x, y, w, h = float(f[0]), float(f[1]), float(f[2]), float(f[3])
        score = float(f[-1]) if len(f) > 14 else 0.0
        if _reject_absurd_box(w, h, width, height):
            continue
        raw.append({
            "x": int(max(0, round(x))),
            "y": int(max(0, round(y))),
            "w": int(round(w)),
            "h": int(round(h)),
            "score": round(score, 3),
            "area": w * h,
        })
    raw.sort(key=lambda b: b["area"], reverse=True)
    for b in raw[:MAX_FACES_PER_FRAME]:
        boxes.append({
            "x": b["x"],
            "y": b["y"],
            "w": b["w"],
            "h": b["h"],
            "score": b["score"],
        })
    return boxes


def _make_frame_detector(args, width, height):
    """Returns (engine, detect_fn) where detect_fn(frame)->boxes."""
    engine = _normalize_engine(getattr(args, "engine", "seeta"))
    if engine == "seeta":
        sf = _load_seeta_detector()
        if sf is None:
            return engine, None
        return engine, lambda frame: _detect_boxes_seeta(sf, frame, width, height)
    import cv2
    if not os.path.isfile(args.model):
        return engine, None
    detector = cv2.FaceDetectorYN.create(
        args.model, "", (width or 320, height or 240),
        score_threshold=float(args.score),
    )
    if width and height:
        detector.setInputSize((width, height))
    return engine, lambda frame: _detect_boxes_yunet(detector, frame, width, height)


def _center(b):
    return (b["x"] + b["w"] * 0.5, b["y"] + b["h"] * 0.5)


def _center_dist(a, b):
    ax, ay = _center(a)
    bx, by = _center(b)
    return ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5


def _blend_box(old, new, new_w=0.65):
    """Light blend — stable box on turn without growing pad."""
    ow = 1.0 - float(new_w)
    return {
        "x": int(round(old["x"] * ow + new["x"] * new_w)),
        "y": int(round(old["y"] * ow + new["y"] * new_w)),
        "w": int(round(old["w"] * ow + new["w"] * new_w)),
        "h": int(round(old["h"] * ow + new["h"] * new_w)),
    }


def _shift_box(b, dx, dy):
    """Translate box by velocity (px). Size unchanged — no pad growth."""
    return {
        "x": int(round(b["x"] + dx)),
        "y": int(round(b["y"] + dy)),
        "w": int(b["w"]),
        "h": int(b["h"]),
    }


def _coast_track(tr, damp=0.92):
    """REDACT-HOLD-SMOOTH-V1 — coast blur box along estimated motion during misses."""
    vx = float(tr.get("vx", 0.0)) * float(damp)
    vy = float(tr.get("vy", 0.0)) * float(damp)
    tr["vx"] = vx
    tr["vy"] = vy
    if abs(vx) >= 0.05 or abs(vy) >= 0.05:
        tr["box"] = _shift_box(tr["box"], vx, vy)


def _load_exclude_boxes(path):
    """REDACT-PREVIEW-CONTROLS-BURN-V1 — operator-deleted Auto preview seeds."""
    if not path:
        return []
    try:
        with open(path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except Exception:
        return []
    if not isinstance(raw, list):
        return []
    out = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            w = int(round(float(item.get("w", 0))))
            h = int(round(float(item.get("h", 0))))
            x = int(round(float(item.get("x", 0))))
            y = int(round(float(item.get("y", 0))))
        except Exception:
            continue
        if w < 4 or h < 4:
            continue
        out.append({"x": max(0, x), "y": max(0, y), "w": w, "h": h})
    return out


def _box_excluded(box, excludes, iou_thresh=0.22):
    """True if detection/track overlaps a deleted Auto preview seed."""
    if not excludes or not box:
        return False
    for ex in excludes:
        if _iou(box, ex) >= float(iou_thresh):
            return True
        # Nearby center (false-positive wall clock / wrong face near seed)
        dist_lim = max(ex["w"], ex["h"]) * 0.9
        if _center_dist(box, ex) <= dist_lim:
            return True
    return False


def _filter_excluded(boxes, excludes):
    if not excludes:
        return boxes
    return [b for b in boxes if not _box_excluded(b, excludes)]


def _update_tracks(tracks, detections, iou_thresh, hold_frames, frame_idx):
    """IoU + nearby rematch; hold + velocity coast across detector dropouts."""
    assigned = set()
    for tr in tracks:
        best_i = -1
        best = float(iou_thresh)
        for i, det in enumerate(detections):
            if i in assigned:
                continue
            v = _iou(tr["box"], det)
            if v >= best:
                best = v
                best_i = i
        # Face turn: IoU often collapses while the head stays in roughly the same place.
        if best_i < 0 and detections:
            dist_lim = max(tr["box"]["w"], tr["box"]["h"]) * 0.85
            best_d = dist_lim
            for i, det in enumerate(detections):
                if i in assigned:
                    continue
                d = _center_dist(tr["box"], det)
                if d <= best_d:
                    best_d = d
                    best_i = i
        if best_i >= 0:
            det = detections[best_i]
            ox, oy = _center(tr["box"])
            nx, ny = _center(det)
            # EMA velocity so coast follows walking/turning face between hits
            raw_vx = nx - ox
            raw_vy = ny - oy
            tr["vx"] = float(tr.get("vx", 0.0)) * 0.4 + raw_vx * 0.6
            tr["vy"] = float(tr.get("vy", 0.0)) * 0.4 + raw_vy * 0.6
            tr["box"] = _blend_box(tr["box"], det, 0.65)
            tr["last"] = frame_idx
            tr["miss"] = 0
            assigned.add(best_i)
        else:
            tr["miss"] += 1
            _coast_track(tr)
    for i, det in enumerate(detections):
        if i in assigned:
            continue
        tracks.append({"box": det, "last": frame_idx, "miss": 0, "vx": 0.0, "vy": 0.0})
    alive = []
    for tr in tracks:
        if tr["miss"] <= hold_frames:
            alive.append(tr)
    return alive


def _blur_rois(frame, boxes, pad, width, height, sigma):
    import cv2
    out = frame
    for b in boxes:
        pb = _pad_box(b, pad, width, height)
        x, y, w, h = pb["x"], pb["y"], pb["w"], pb["h"]
        if w < 2 or h < 2:
            continue
        roi = out[y:y + h, x:x + w]
        if roi.size == 0:
            continue
        k = max(3, int(round(min(w, h) * 0.35)) | 1)
        blurred = cv2.GaussianBlur(roi, (k, k), float(sigma))
        out[y:y + h, x:x + w] = blurred
    return out


def run_detect(args):
    try:
        import cv2
    except Exception as exc:
        _emit({"ok": False, "error": "opencv-python not installed: %s" % exc})
        return 2

    engine = _normalize_engine(getattr(args, "engine", "seeta"))
    if engine == "yunet" and not os.path.isfile(args.model):
        _emit({"ok": False, "error": "model file not found", "model": args.model, "engine": engine})
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

    engine, detect_fn = _make_frame_detector(args, width, height)
    if detect_fn is None:
        cap.release()
        err = _seeta_error if engine == "seeta" else "yunet_detector_failed"
        _emit({
            "ok": False,
            "error": err or "detector_unavailable",
            "engine": engine,
            "hint": "Run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1" if engine == "seeta" else None,
        })
        return 2

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
            boxes = detect_fn(frame)
            frames.append({"t": round(idx / fps, 3), "boxes": boxes})
            read += 1
        idx += 1
    cap.release()

    payload = {
        "ok": True,
        "fps": round(fps, 3),
        "width": width,
        "height": height,
        "frameCount": total,
        "sampled": read,
        "stride": stride,
        "frames": frames,
        "mode": "detect",
        "engine": engine,
        "detector": "seeta_face_detector" if engine == "seeta" else "yunet",
    }
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
    _emit(payload)
    return 0


def run_burn(args):
    try:
        import cv2
    except Exception as exc:
        _emit({"ok": False, "error": "opencv-python not installed: %s" % exc})
        return 2

    engine = _normalize_engine(getattr(args, "engine", "seeta"))
    if engine == "yunet" and not os.path.isfile(args.model):
        _emit({"ok": False, "error": "model file not found", "model": args.model, "engine": engine})
        return 2
    if not os.path.isfile(args.input):
        _emit({"ok": False, "error": "input video not found", "input": args.input})
        return 2

    out_dir = os.path.dirname(os.path.abspath(args.out)) or "."
    if not os.path.isdir(out_dir):
        try:
            os.makedirs(out_dir)
        except Exception as exc:
            _emit({"ok": False, "error": "cannot create out dir: %s" % exc})
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
    if width < 2 or height < 2:
        cap.release()
        _emit({"ok": False, "error": "invalid video size"})
        return 2

    engine, detect_fn = _make_frame_detector(args, width, height)
    if detect_fn is None:
        cap.release()
        err = _seeta_error if engine == "seeta" else "yunet_detector_failed"
        _emit({
            "ok": False,
            "error": err or "detector_unavailable",
            "engine": engine,
            "hint": "Run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1" if engine == "seeta" else None,
        })
        return 2

    detect_every = max(1, int(args.detect_every))
    hold_frames = max(0, int(args.hold_frames))
    pad = float(args.pad)
    sigma = float(args.sigma)
    excludes = _load_exclude_boxes(getattr(args, "exclude_json", None))
    max_frames = total
    if args.max_seconds and args.max_seconds > 0:
        max_frames = min(total or 10 ** 9, int(args.max_seconds * fps))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(args.out, fourcc, fps, (width, height))
    if not writer.isOpened():
        cap.release()
        _emit({"ok": False, "error": "could not open video writer", "out": args.out})
        return 2

    tracks = []
    idx = 0
    blurred_frames = 0
    face_hits = 0
    excluded_hits = 0
    timeline_frames = []

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if max_frames and idx >= max_frames:
            break

        if idx % detect_every == 0:
            dets = detect_fn(frame)
            before = len(dets)
            dets = _filter_excluded(dets, excludes)
            excluded_hits += max(0, before - len(dets))
            tracks = _update_tracks(tracks, dets, float(args.iou), hold_frames, idx)
            # Drop tracks that coasted into an excluded seed
            if excludes:
                tracks = [tr for tr in tracks if not _box_excluded(tr["box"], excludes)]
            face_hits += len(dets)
            if args.timeline_out:
                timeline_frames.append({
                    "t": round(idx / fps, 3),
                    "boxes": [dict(tr["box"]) for tr in tracks],
                })
        else:
            # REDACT-HOLD-SMOOTH-V1 — coast between sparse detect samples
            for tr in tracks:
                _coast_track(tr)
            if excludes:
                tracks = [tr for tr in tracks if not _box_excluded(tr["box"], excludes)]

        active = [dict(tr["box"]) for tr in tracks]
        if active:
            frame = _blur_rois(frame, active, pad, width, height, sigma)
            blurred_frames += 1

        writer.write(frame)
        idx += 1

    cap.release()
    writer.release()

    if not os.path.isfile(args.out) or os.path.getsize(args.out) < 64:
        _emit({"ok": False, "error": "burn output missing or empty", "out": args.out})
        return 2

    payload = {
        "ok": True,
        "mode": "burn",
        "out": args.out,
        "fps": round(fps, 3),
        "width": width,
        "height": height,
        "frameCount": total,
        "written": idx,
        "blurredFrames": blurred_frames,
        "faceHits": face_hits,
        "pad": pad,
        "score": float(args.score),
        "detectEvery": detect_every,
        "holdFrames": hold_frames,
        "iou": float(args.iou),
        "excludeCount": len(excludes),
        "excludedHits": excluded_hits,
        "engine": engine,
        "detector": "seeta_face_detector" if engine == "seeta" else "yunet",
    }
    if args.timeline_out:
        tl = {
            "ok": True,
            "fps": payload["fps"],
            "width": width,
            "height": height,
            "stride": detect_every,
            "engine": engine,
            "frames": timeline_frames,
        }
        with open(args.timeline_out, "w", encoding="utf-8") as fh:
            json.dump(tl)
        payload["timelineOut"] = args.timeline_out

    _emit(payload)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description="Evidence face-follow sidecar")
    sub = parser.add_subparsers(dest="mode")

    sc = sub.add_parser("selfcheck")
    sc.add_argument("--model", default=DEFAULT_MODEL)
    sc.add_argument("--engine", default="seeta")

    dt = sub.add_parser("detect")
    dt.add_argument("--input", required=True)
    dt.add_argument("--out", default=None)
    dt.add_argument("--model", default=DEFAULT_MODEL)
    dt.add_argument("--engine", default="seeta")
    dt.add_argument("--max-seconds", type=float, default=0.0, dest="max_seconds")
    # REDACT-HOLD-SMOOTH-V1 — denser Auto preview (3 → 2)
    dt.add_argument("--stride", type=int, default=2)
    dt.add_argument("--score", type=float, default=0.72)

    br = sub.add_parser("burn")
    br.add_argument("--input", required=True)
    br.add_argument("--out", required=True)
    br.add_argument("--model", default=DEFAULT_MODEL)
    br.add_argument("--engine", default="seeta")
    br.add_argument("--max-seconds", type=float, default=0.0, dest="max_seconds")
    br.add_argument("--score", type=float, default=0.72)
    br.add_argument("--pad", type=float, default=0.12)
    br.add_argument("--sigma", type=float, default=18.0)
    br.add_argument("--detect-every", type=int, default=1, dest="detect_every")
    # REDACT-HOLD-SMOOTH-V1 — hold 14→22 + velocity coast; pad stays 0.12 (no fat body box)
    br.add_argument("--hold-frames", type=int, default=22, dest="hold_frames")
    br.add_argument("--iou", type=float, default=0.18)
    br.add_argument("--timeline-out", default=None, dest="timeline_out")
    # REDACT-PREVIEW-CONTROLS-BURN-V1 — deleted Auto preview boxes
    br.add_argument("--exclude-json", default=None, dest="exclude_json")

    args = parser.parse_args(argv)
    if args.mode == "selfcheck":
        return run_selfcheck(args.model, getattr(args, "engine", "seeta"))
    if args.mode == "detect":
        return run_detect(args)
    if args.mode == "burn":
        return run_burn(args)
    parser.print_help(sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
