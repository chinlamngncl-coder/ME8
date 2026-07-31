"""
ANPR-PLATE-YOLO-PACK-AND-READ-V1 — plate detector via ONNX (preferred) or Ultralytics .pt.
Avoids importing torch by default so Windows PaddleOCR stays healthy.
"""
from __future__ import annotations

import os
from typing import Any, Optional

import cv2
import numpy as np

_engine = None
_engine_error: Optional[str] = None
_engine_kind: Optional[str] = None


def models_dir() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def plate_weights_paths() -> dict[str, Optional[str]]:
    override = (os.environ.get("FM_ANPR_YOLO_WEIGHTS") or "").strip()
    onnx = None
    pt = None
    if override:
        if override.lower().endswith(".onnx") and os.path.isfile(override):
            onnx = override
        elif os.path.isfile(override):
            pt = override
    md = models_dir()
    for name in ("plate_yolo11n.onnx", "license-plate-finetune-v1n.onnx"):
        p = os.path.join(md, name)
        if os.path.isfile(p):
            onnx = onnx or p
            break
    for name in ("plate_yolo11n.pt", "plate_yolo11s.pt", "yolo11n_plate.pt", "license-plate-finetune-v1n.pt"):
        p = os.path.join(md, name)
        if os.path.isfile(p):
            pt = pt or p
            break
    return {"onnx": onnx, "pt": pt}


def _letterbox(img_bgr: np.ndarray, size: int = 640) -> tuple[np.ndarray, float, int, int]:
    h, w = img_bgr.shape[:2]
    r = min(size / float(h), size / float(w))
    nh, nw = int(round(h * r)), int(round(w * r))
    resized = cv2.resize(img_bgr, (nw, nh), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    canvas[:nh, :nw] = resized
    return canvas, r, 0, 0


def _nms_xyxy(boxes: list[list[float]], scores: list[float], iou_thr: float = 0.45) -> list[int]:
    if not boxes:
        return []
    b = np.array(boxes, dtype=np.float32)
    s = np.array(scores, dtype=np.float32)
    x1, y1, x2, y2 = b[:, 0], b[:, 1], b[:, 2], b[:, 3]
    areas = (x2 - x1).clip(min=0) * (y2 - y1).clip(min=0)
    order = s.argsort()[::-1]
    keep: list[int] = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = (xx2 - xx1).clip(min=0) * (yy2 - yy1).clip(min=0)
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        order = order[1:][iou < iou_thr]
    return keep


class OnnxPlateYolo:
    def __init__(self, path: str):
        import onnxruntime as ort

        self.path = path
        self.sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        self.input_name = self.sess.get_inputs()[0].name
        self.size = 640

    def predict_boxes(self, img_bgr: np.ndarray, conf_thr: float = 0.25) -> list[dict[str, Any]]:
        h0, w0 = img_bgr.shape[:2]
        canvas, r, _pad_x, _pad_y = _letterbox(img_bgr, self.size)
        blob = canvas[:, :, ::-1].transpose(2, 0, 1).astype(np.float32) / 255.0
        blob = np.expand_dims(blob, 0)
        out = self.sess.run(None, {self.input_name: blob})[0]
        pred = out[0]  # (5, N) cx,cy,w,h,conf
        if pred.ndim != 2 or pred.shape[0] < 5:
            return []
        confs = pred[4]
        idxs = np.where(confs >= conf_thr)[0]
        boxes: list[list[float]] = []
        scores: list[float] = []
        for i in idxs:
            cx, cy, bw, bh = float(pred[0, i]), float(pred[1, i]), float(pred[2, i]), float(pred[3, i])
            x0 = (cx - bw / 2.0) / r
            y0 = (cy - bh / 2.0) / r
            x1 = (cx + bw / 2.0) / r
            y1 = (cy + bh / 2.0) / r
            boxes.append([x0, y0, x1, y1])
            scores.append(float(confs[i]))
        keep = _nms_xyxy(boxes, scores)
        out_boxes: list[dict[str, Any]] = []
        for i in keep:
            x0, y0, x1, y1 = boxes[i]
            xa = int(max(0, min(w0 - 1, round(x0))))
            ya = int(max(0, min(h0 - 1, round(y0))))
            xb = int(max(0, min(w0, round(x1))))
            yb = int(max(0, min(h0, round(y1))))
            if xb - xa < 8 or yb - ya < 6:
                continue
            out_boxes.append({"x0": xa, "y0": ya, "x1": xb, "y1": yb, "conf": scores[i]})
        out_boxes.sort(key=lambda b: b["conf"], reverse=True)
        return out_boxes


class UltralyticsPlateYolo:
    def __init__(self, path: str):
        from ultralytics import YOLO

        self.path = path
        self.model = YOLO(path)

    def predict_boxes(self, img_bgr: np.ndarray, conf_thr: float = 0.25) -> list[dict[str, Any]]:
        results = self.model.predict(img_bgr, verbose=False, conf=conf_thr)
        if not results:
            return []
        boxes = getattr(results[0], "boxes", None)
        if boxes is None or len(boxes) == 0:
            return []
        h0, w0 = img_bgr.shape[:2]
        out: list[dict[str, Any]] = []
        for i in range(len(boxes)):
            xyxy = boxes.xyxy[i].tolist()
            conf = float(boxes.conf[i].item()) if boxes.conf is not None else 0.5
            x0, y0, x1, y1 = [int(v) for v in xyxy]
            x0, y0 = max(0, x0), max(0, y0)
            x1, y1 = min(w0, x1), min(h0, y1)
            if x1 - x0 < 8 or y1 - y0 < 6:
                continue
            out.append({"x0": x0, "y0": y0, "x1": x1, "y1": y1, "conf": conf})
        out.sort(key=lambda b: b["conf"], reverse=True)
        return out


def get_plate_yolo():
    """Lazy load ONNX first, then Ultralytics .pt."""
    global _engine, _engine_error, _engine_kind
    if _engine is not None:
        return _engine
    if _engine_error and _engine is None and _engine_kind is None:
        # allow retry only if never attempted successfully
        pass
    paths = plate_weights_paths()
    if paths["onnx"]:
        try:
            _engine = OnnxPlateYolo(paths["onnx"])
            _engine_kind = "onnx"
            _engine_error = None
            return _engine
        except Exception as exc:  # noqa: BLE001
            _engine_error = f"onnx:{str(exc)[:160]}"
    if paths["pt"]:
        try:
            _engine = UltralyticsPlateYolo(paths["pt"])
            _engine_kind = "ultralytics"
            _engine_error = None
            return _engine
        except Exception as exc:  # noqa: BLE001
            _engine_error = ((_engine_error or "") + f" | pt:{str(exc)[:120]}").strip(" |")
    if not paths["onnx"] and not paths["pt"]:
        _engine_error = "plate_weights_missing"
    return None


def yolo_engine_status() -> dict[str, Any]:
    eng = get_plate_yolo()
    paths = plate_weights_paths()
    return {
        "ready": eng is not None,
        "kind": _engine_kind,
        "error": _engine_error,
        "onnx": paths["onnx"],
        "pt": paths["pt"],
    }
