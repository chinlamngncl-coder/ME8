"""
Vehicle detect + whole-vehicle hull crop (ANPR-LIVE-WHOLE-VEHICLE-CROP-V1).

Weights: COCO YOLO end2end ONNX under models/ (default yolov8n-coco.onnx naming;
ship file may be YOLOv10n export — output [1,N,6] xyxy+score+cls).
Classes used: car, motorcycle, bus, truck (+ bicycle for mopeds in frame).
No Ultralytics Python package — onnxruntime only.
"""
from __future__ import annotations

import os
from typing import Any, Optional

import cv2
import numpy as np

_session = None
_session_error: Optional[str] = None

# COCO class ids
VEHICLE_CLASS_IDS = {1, 2, 3, 5, 7}  # bicycle, car, motorcycle, bus, truck
CLASS_NAMES = {1: "bicycle", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

INPUT_SIZE = int(os.environ.get("FM_ANPR_VEHICLE_IMGSZ", "640") or "640")
VEHICLE_CONF = float(os.environ.get("FM_ANPR_VEHICLE_CONF", "0.22") or "0.22")
# ANPR-LIVE-WHOLE-VEHICLE-CROP-V1 — generous pad so rail shows whole moto/car/bus (was 0.08 = scrap)
VEHICLE_PAD = float(os.environ.get("FM_ANPR_VEHICLE_PAD", "0.42") or "0.42")
VEHICLE_MIN_FRAC = float(os.environ.get("FM_ANPR_VEHICLE_MIN_FRAC", "0.40") or "0.40")
VEHICLE_MAX_FRAC = float(os.environ.get("FM_ANPR_VEHICLE_MAX_FRAC", "0.92") or "0.92")
MAX_VEHICLES = max(1, min(8, int(os.environ.get("FM_ANPR_VEHICLE_MAX", "4") or "4")))
ENABLE = (os.environ.get("FM_ANPR_VEHICLE_DETECT") or "1").strip().lower() not in (
    "0", "false", "no", "off",
)


def _default_weights_path() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    env = (os.environ.get("FM_ANPR_VEHICLE_ONNX") or "").strip()
    if env:
        return env
    return os.path.join(here, "models", "yolov8n-coco.onnx")


def get_vehicle_session():
    global _session, _session_error
    if not ENABLE:
        return None
    if _session is not None:
        return _session
    if _session_error:
        return None
    path = _default_weights_path()
    if not os.path.isfile(path):
        _session_error = "vehicle_onnx_missing:" + path
        return None
    try:
        import onnxruntime as ort

        _session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        return _session
    except Exception as exc:  # noqa: BLE001
        _session_error = str(exc)[:220]
        return None


def vehicle_status() -> dict[str, Any]:
    sess = get_vehicle_session()
    return {
        "enabled": ENABLE,
        "ready": sess is not None,
        "error": _session_error,
        "weights": _default_weights_path() if ENABLE else None,
        "conf": VEHICLE_CONF,
        "classes": sorted(VEHICLE_CLASS_IDS),
        "license": "onnxruntime + COCO YOLO ONNX (no Ultralytics pip)",
        "powerCrop": "whole-vehicle-crop-v1",
        "pad": VEHICLE_PAD,
        "minFrac": VEHICLE_MIN_FRAC,
        "maxFrac": VEHICLE_MAX_FRAC,
    }


def _letterbox(img_bgr: np.ndarray, size: int = INPUT_SIZE) -> tuple[np.ndarray, float, int, int]:
    h, w = img_bgr.shape[:2]
    scale = min(size / max(1, h), size / max(1, w))
    nh, nw = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(img_bgr, (nw, nh), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    top = (size - nh) // 2
    left = (size - nw) // 2
    canvas[top : top + nh, left : left + nw] = resized
    return canvas, scale, left, top


def _parse_detections(out: np.ndarray, scale: float, pad_x: int, pad_y: int, fw: int, fh: int) -> list[dict[str, Any]]:
    """Parse YOLO end2end [1,N,6] or [N,6] → vehicle boxes in original image coords."""
    arr = np.asarray(out)
    if arr.ndim == 3:
        arr = arr[0]
    if arr.ndim != 2 or arr.shape[1] < 6:
        return []
    hits: list[dict[str, Any]] = []
    for row in arr:
        score = float(row[4])
        if score < VEHICLE_CONF:
            continue
        cls_id = int(row[5])
        if cls_id not in VEHICLE_CLASS_IDS:
            continue
        x1 = (float(row[0]) - pad_x) / scale
        y1 = (float(row[1]) - pad_y) / scale
        x2 = (float(row[2]) - pad_x) / scale
        y2 = (float(row[3]) - pad_y) / scale
        x1 = max(0, min(fw - 1, int(round(x1))))
        y1 = max(0, min(fh - 1, int(round(y1))))
        x2 = max(0, min(fw, int(round(x2))))
        y2 = max(0, min(fh, int(round(y2))))
        bw = x2 - x1
        bh = y2 - y1
        if bw < 24 or bh < 24:
            continue
        hits.append({
            "x": x1,
            "y": y1,
            "w": bw,
            "h": bh,
            "score": round(score, 4),
            "cls": cls_id,
            "label": CLASS_NAMES.get(cls_id, str(cls_id)),
            "source": "vehicle-coco",
        })
    hits.sort(
        key=lambda d: (
            float(d.get("score") or 0) * 0.55
            + (float(d.get("w") or 0) * float(d.get("h") or 0)) / max(1.0, float(fw * fh)) * 0.45
        ),
        reverse=True,
    )
    return hits[:MAX_VEHICLES]


def detect_vehicles(img_bgr: np.ndarray) -> list[dict[str, Any]]:
    sess = get_vehicle_session()
    if sess is None or img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return []
    fh, fw = img_bgr.shape[:2]
    canvas, scale, left, top = _letterbox(img_bgr, INPUT_SIZE)
    rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
    blob = rgb.astype(np.float32) / 255.0
    blob = np.transpose(blob, (2, 0, 1))[None, ...]
    inp = sess.get_inputs()[0].name
    try:
        outs = sess.run(None, {inp: blob})
    except Exception:  # noqa: BLE001
        return []
    if not outs:
        return []
    return _parse_detections(outs[0], scale, left, top, fw, fh)


def pad_vehicle_box(det: dict[str, Any], fw: int, fh: int, pad_frac: float = VEHICLE_PAD) -> tuple[int, int, int, int]:
    """Whole-vehicle hull: generous pad + min/max fraction of frame (not plate scrap)."""
    x = int(det.get("x") or 0)
    y = int(det.get("y") or 0)
    bw = max(1, int(det.get("w") or 0))
    bh = max(1, int(det.get("h") or 0))
    pad_x = max(8, int(bw * pad_frac))
    pad_y = max(8, int(bh * pad_frac))
    # Motos / cars: bias a bit more bottom (plate often lower) and sides
    pad_y_bot = max(pad_y, int(bh * (pad_frac + 0.12)))
    x0 = x - pad_x
    y0 = y - pad_y
    x1 = x + bw + pad_x
    y1 = y + bh + pad_y_bot

    cx = (x0 + x1) / 2.0
    cy = (y0 + y1) / 2.0
    cur_w = max(1.0, x1 - x0)
    cur_h = max(1.0, y1 - y0)
    min_w = fw * max(0.15, min(0.95, VEHICLE_MIN_FRAC))
    min_h = fh * max(0.15, min(0.95, VEHICLE_MIN_FRAC))
    if cur_w < min_w:
        grow = (min_w - cur_w) / 2.0
        x0 -= grow
        x1 += grow
        cur_w = x1 - x0
    if cur_h < min_h:
        grow = (min_h - cur_h) / 2.0
        y0 -= grow
        y1 += grow
        cur_h = y1 - y0

    max_w = fw * max(0.4, min(1.0, VEHICLE_MAX_FRAC))
    max_h = fh * max(0.4, min(1.0, VEHICLE_MAX_FRAC))
    if cur_w > max_w:
        cx = (x0 + x1) / 2.0
        x0 = cx - max_w / 2.0
        x1 = cx + max_w / 2.0
    if cur_h > max_h:
        cy = (y0 + y1) / 2.0
        y0 = cy - max_h / 2.0
        y1 = cy + max_h / 2.0

    xi0 = max(0, int(round(x0)))
    yi0 = max(0, int(round(y0)))
    xi1 = min(fw, int(round(x1)))
    yi1 = min(fh, int(round(y1)))
    return xi0, yi0, xi1, yi1


def plate_context_box(det: dict[str, Any], fw: int, fh: int) -> tuple[int, int, int, int]:
    """When detector finds plate but no vehicle — expand to a scene hull (never tight plate as rail)."""
    x = int(det.get("x") or 0)
    y = int(det.get("y") or 0)
    bw = max(8, int(det.get("w") or 0))
    bh = max(8, int(det.get("h") or 0))
    # ~4–5× plate → surrounding bumper/vehicle body
    mul = float(os.environ.get("FM_ANPR_PLATE_HULL_MUL", "4.5") or "4.5")
    mul = max(2.5, min(8.0, mul))
    cx = x + bw / 2.0
    cy = y + bh / 2.0
    tw = bw * mul
    th = bh * mul * 1.35
    # Prefer pulling upward (vehicle body above plate)
    x0 = cx - tw / 2.0
    x1 = cx + tw / 2.0
    y1 = cy + th * 0.35
    y0 = y1 - th
    pseudo = {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}
    return pad_vehicle_box(pseudo, fw, fh, pad_frac=0.18)


def crop_vehicle_bgr(img_bgr: np.ndarray, det: dict[str, Any]) -> Optional[np.ndarray]:
    if img_bgr is None or not det:
        return None
    fh, fw = img_bgr.shape[:2]
    x0, y0, x1, y1 = pad_vehicle_box(det, fw, fh)
    if x1 - x0 < 24 or y1 - y0 < 24:
        return None
    crop = img_bgr[y0:y1, x0:x1]
    if crop is None or crop.size == 0:
        return None
    return crop


def crop_plate_context_bgr(img_bgr: np.ndarray, plate_det: dict[str, Any]) -> Optional[np.ndarray]:
    if img_bgr is None or not plate_det:
        return None
    fh, fw = img_bgr.shape[:2]
    x0, y0, x1, y1 = plate_context_box(plate_det, fw, fh)
    if x1 - x0 < 24 or y1 - y0 < 24:
        return None
    crop = img_bgr[y0:y1, x0:x1]
    if crop is None or crop.size == 0:
        return None
    return crop