"""
Stage-2 plate localizer — YOLOv8 bounding-box ONNX (no CCPD 4-corner pose).

Letterbox 640 RGB → detect → unpad/÷scale → numpy slice on native BGR vehicle_macro.
Public API kept: localize_plate_native_warp(), plate_pose_status().
"""
from __future__ import annotations

import os
from typing import Any, Optional, Tuple

import cv2
import numpy as np

_INPUT = int(os.environ.get("FM_ANPR_CCPD_POSE_SIZE", "640") or "640")
_CONF = float(
    os.environ.get("FM_ANPR_CCPD_POSE_CONF")
    or os.environ.get("FM_ANPR_STAGE2_CONF")
    or "0.05"
)
_CONF = max(0.01, min(0.45, _CONF))
_PAD = float(os.environ.get("FM_ANPR_BOX_PAD", "0.10") or "0.10")
_PAD = max(0.0, min(0.20, _PAD))
_MIN_W = max(18, int(os.environ.get("FM_ANPR_MIN_MICRO_W", "22") or "22"))
_MIN_H = max(10, int(os.environ.get("FM_ANPR_MIN_MICRO_H", "12") or "12"))
# Aspect gate OFF by default — motorcycle / near-square plates were dropped as square_or_bad_aspect.
# Set FM_ANPR_S2_ASPECT_GATE=1 to re-enable (relaxed motorcycle-friendly range).
_ASPECT_GATE = str(os.environ.get("FM_ANPR_S2_ASPECT_GATE", "0") or "0").strip().lower() in (
    "1", "true", "yes", "on",
)
_MIN_ASPECT = float(os.environ.get("FM_ANPR_S2_MIN_ASPECT", "0.45") or "0.45")
_MIN_ASPECT = max(0.3, min(4.0, _MIN_ASPECT))
_MAX_ASPECT = float(os.environ.get("FM_ANPR_S2_MAX_ASPECT", "12.0") or "12.0")
_MAX_ASPECT = max(_MIN_ASPECT + 0.1, min(16.0, _MAX_ASPECT))
_NMS_IOU = float(os.environ.get("FM_ANPR_PLATE_NMS_IOU", "0.45") or "0.45")
_NMS_IOU = max(0.20, min(0.90, _NMS_IOU))
_DEBUG_CROP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug_ocr_crop.jpg")

_session = None
_session_error: Optional[str] = None
_input_name: Optional[str] = None
_input_size = _INPUT


def models_dir() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def weights_path() -> Optional[str]:
    for env_key in ("FM_ANPR_PLATE_DET_ONNX", "FM_ANPR_CCPD_POSE_ONNX"):
        env = (os.environ.get(env_key) or "").strip()
        if env and os.path.isfile(env):
            return env
    md = models_dir()
    ai_w = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ai_engine", "weights")
    )
    for name in (
        "yolov8n-license-plate.onnx",
        "plate_yolov8n.onnx",
        "ph_id_plates_best.onnx",
        "license-plate-finetune-v1n.onnx",
        "plate_yolo11n.onnx",
        "plate_yolov8n_pose_ccpd.onnx",
        "yolov8n-pose-plate-ccpd.onnx",
        "plate_pose_ccpd.onnx",
        "ccpd_yolov8n_pose.onnx",
    ):
        for root in (md, ai_w):
            p = os.path.join(root, name)
            if os.path.isfile(p):
                return p
    return None


def get_session():
    global _session, _session_error, _input_name, _input_size
    if _session is not None:
        return _session
    if _session_error:
        return None
    path = weights_path()
    if not path:
        _session_error = "plate_det_onnx_missing"
        return None
    try:
        import onnxruntime as ort

        _session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        inp = _session.get_inputs()[0]
        _input_name = inp.name
        shape = inp.shape
        if isinstance(shape, (list, tuple)) and len(shape) >= 4:
            try:
                h = int(shape[2]) if shape[2] not in (None, "height") else _INPUT
                _input_size = h if h > 0 else _INPUT
            except (TypeError, ValueError):
                _input_size = _INPUT
        return _session
    except Exception as exc:  # noqa: BLE001
        _session_error = str(exc)[:180]
        _session = None
        return None


def plate_pose_status() -> dict[str, Any]:
    """Health-safe: do not load ONNX here (that stalled /health → Engine Not available)."""
    path = weights_path()
    return {
        "ready": bool(path and os.path.isfile(path)),
        "error": _session_error if not path else None,
        "weights": path,
        "pad": _PAD,
        "inputSize": _input_size,
        "architecture": "yolov8-plate-bbox-v1",
        "conf": _CONF,
    }


def _letterbox(
    img_bgr: np.ndarray, size: int
) -> Tuple[np.ndarray, float, int, int]:
    h, w = img_bgr.shape[:2]
    scale = min(size / max(1, h), size / max(1, w))
    nh, nw = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(img_bgr, (nw, nh), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    top = (size - nh) // 2
    left = (size - nw) // 2
    canvas[top : top + nh, left : left + nw] = resized
    return canvas, scale, left, top


def _nms_xyxy(boxes: np.ndarray, scores: np.ndarray, iou_thr: float) -> list[int]:
    if boxes.size == 0:
        return []
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = np.maximum(0.0, x2 - x1) * np.maximum(0.0, y2 - y1)
    order = scores.argsort()[::-1]
    keep: list[int] = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        rest = order[1:]
        xx1 = np.maximum(x1[i], x1[rest])
        yy1 = np.maximum(y1[i], y1[rest])
        xx2 = np.minimum(x2[i], x2[rest])
        yy2 = np.minimum(y2[i], y2[rest])
        inter = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)
        iou = inter / (areas[i] + areas[rest] - inter + 1e-6)
        order = rest[iou < iou_thr]
    return keep


def _parse_yolo_det(
    out: np.ndarray,
    *,
    conf_thr: float,
    lb_size: int,
) -> tuple[list[np.ndarray], list[float]]:
    """
    Parse YOLOv8 detect ONNX → letterbox-space xyxy + scores.
    Accepts [1,5,8400], [1,6,8400], [5,N], [6,N], or [N,5]/[N,6] (xywh or xyxy).
    """
    arr = np.asarray(out)
    if arr.ndim == 3:
        arr = arr[0]
    if arr.ndim != 2:
        return [], []

    boxes_lb: list[np.ndarray] = []
    scores: list[float] = []

    # (C, N) — Ultralytics export: rows cx,cy,w,h,conf[,cls…]
    if arr.shape[0] < arr.shape[1] and arr.shape[0] <= 84:
        pred = arr
        n = int(pred.shape[1])
        if pred.shape[0] < 5:
            return [], []
        for i in range(n):
            conf = float(pred[4, i])
            if conf < conf_thr:
                continue
            cx, cy, bw, bh = float(pred[0, i]), float(pred[1, i]), float(pred[2, i]), float(pred[3, i])
            if 0.0 <= cx <= 1.5 and 0.0 <= cy <= 1.5 and 0.0 <= bw <= 1.5:
                cx, cy, bw, bh = cx * lb_size, cy * lb_size, bw * lb_size, bh * lb_size
            x1 = cx - bw / 2.0
            y1 = cy - bh / 2.0
            x2 = cx + bw / 2.0
            y2 = cy + bh / 2.0
            boxes_lb.append(np.array([x1, y1, x2, y2], dtype=np.float32))
            scores.append(conf)
        return boxes_lb, scores

    # (N, C) — end2end xyxy+score[+cls] or xywh+conf
    pred = arr
    if pred.shape[1] < 5:
        return [], []
    n = int(pred.shape[0])
    # Heuristic: xyxy if x2-like col is typically larger than x1-like col
    xyxy_mode = float(np.mean(pred[:, 2])) > float(np.mean(pred[:, 0])) + 1.0
    for i in range(n):
        conf = float(pred[i, 4])
        if conf < conf_thr:
            continue
        a0, a1, a2, a3 = float(pred[i, 0]), float(pred[i, 1]), float(pred[i, 2]), float(pred[i, 3])
        if xyxy_mode:
            x1, y1, x2, y2 = a0, a1, a2, a3
        else:
            if 0.0 <= a0 <= 1.5 and 0.0 <= a1 <= 1.5:
                a0, a1, a2, a3 = a0 * lb_size, a1 * lb_size, a2 * lb_size, a3 * lb_size
            x1 = a0 - a2 / 2.0
            y1 = a1 - a3 / 2.0
            x2 = a0 + a2 / 2.0
            y2 = a1 + a3 / 2.0
        boxes_lb.append(np.array([x1, y1, x2, y2], dtype=np.float32))
        scores.append(conf)
    return boxes_lb, scores


def _unpad_xyxy_to_native(
    x1: float, y1: float, x2: float, y2: float,
    *,
    pad_w: float, pad_h: float, scale: float,
    fw: int, fh: int,
) -> tuple[int, int, int, int]:
    """Letterbox xyxy → native vehicle_macro pixels (subtract pad, divide by scale, clip)."""
    s = max(1e-6, float(scale))
    nx1 = (float(x1) - float(pad_w)) / s
    ny1 = (float(y1) - float(pad_h)) / s
    nx2 = (float(x2) - float(pad_w)) / s
    ny2 = (float(y2) - float(pad_h)) / s
    if _PAD > 0:
        bw = max(1.0, nx2 - nx1)
        bh = max(1.0, ny2 - ny1)
        nx1 -= bw * _PAD
        ny1 -= bh * _PAD
        nx2 += bw * _PAD
        ny2 += bh * _PAD
    xi1 = int(np.clip(round(min(nx1, nx2)), 0, fw - 1))
    yi1 = int(np.clip(round(min(ny1, ny2)), 0, fh - 1))
    xi2 = int(np.clip(round(max(nx1, nx2)), xi1 + 1, fw))
    yi2 = int(np.clip(round(max(ny1, ny2)), yi1 + 1, fh))
    return xi1, yi1, xi2, yi2


def localize_plate_native_warp(
    native_bgr: np.ndarray,
) -> Tuple[Optional[np.ndarray], dict[str, Any]]:
    """
    YOLOv8 plate bbox on letterbox 640 RGB; crop from original BGR vehicle_macro.
    Returns (plate_crop_bgr | None, meta). Same call site as the old pose warp.
    """
    meta: dict[str, Any] = {
        "architecture": "yolov8-plate-bbox-v1",
        "pad": _PAD,
        "source": None,
    }
    if native_bgr is None or getattr(native_bgr, "size", 0) == 0:
        meta["error"] = "bad_native"
        return None, meta
    sess = get_session()
    if sess is None or not _input_name:
        meta["error"] = _session_error or "plate_det_not_ready"
        return None, meta

    I_bgr = np.ascontiguousarray(native_bgr)
    fh, fw = I_bgr.shape[:2]
    size = _input_size

    try:
        rgb = cv2.cvtColor(I_bgr, cv2.COLOR_BGR2RGB)
    except Exception:  # noqa: BLE001
        rgb = I_bgr[:, :, ::-1].copy()
    canvas, scale, pad_w, pad_h = _letterbox(rgb, size)
    blob = canvas.transpose(2, 0, 1).astype(np.float32) / 255.0
    blob = np.expand_dims(blob, 0)
    print(
        "[ANPR-S2-RAW] YOLO-bbox crop "
        f"shape={I_bgr.shape} scale={scale:.4f} pad=({pad_w},{pad_h}) conf_thr={_CONF:.3f}",
        flush=True,
    )
    try:
        outs = sess.run(None, {_input_name: blob})
    except Exception as exc:  # noqa: BLE001
        meta["error"] = "infer:" + str(exc)[:120]
        return None, meta
    if not outs:
        meta["error"] = "empty_output"
        return None, meta

    boxes_lb, scores = _parse_yolo_det(outs[0], conf_thr=_CONF, lb_size=size)
    max_raw = max(scores) if scores else 0.0
    meta["maxConfRaw"] = round(float(max_raw), 4)
    print(
        f"[ANPR-S2-RAW] YOLO-bbox max_conf={max_raw:.4f} n={len(scores)} "
        f"thr={_CONF:.3f} out_shape={getattr(outs[0], 'shape', None)}",
        flush=True,
    )
    if not boxes_lb:
        meta["error"] = "no_plate_box"
        meta["confThr"] = _CONF
        return None, meta

    b = np.stack(boxes_lb, axis=0)
    s = np.asarray(scores, dtype=np.float32)
    keep = _nms_xyxy(b, s, _NMS_IOU)
    if not keep:
        keep = [int(np.argmax(s))]
    best_i = keep[0]
    x1_lb, y1_lb, x2_lb, y2_lb = [float(v) for v in b[best_i]]
    conf = float(s[best_i])

    x1, y1, x2, y2 = _unpad_xyxy_to_native(
        x1_lb, y1_lb, x2_lb, y2_lb,
        pad_w=pad_w, pad_h=pad_h, scale=scale, fw=fw, fh=fh,
    )
    plate_crop = I_bgr[y1:y2, x1:x2]
    if plate_crop is None or getattr(plate_crop, "size", 0) == 0:
        meta["error"] = "empty_slice"
        return None, meta
    plate_crop = np.ascontiguousarray(plate_crop)
    cw, ch = int(plate_crop.shape[1]), int(plate_crop.shape[0])
    if cw < _MIN_W or ch < _MIN_H:
        meta["error"] = "sliver_reject"
        meta["sliverReject"] = {"w": cw, "h": ch}
        print(
            f"[ANPR-S2-RAW] sliver_reject w={cw} h={ch} min={_MIN_W}x{_MIN_H}",
            flush=True,
        )
        return None, meta
    aspect = float(cw) / float(max(1, ch))
    if _ASPECT_GATE and (aspect < _MIN_ASPECT or aspect > _MAX_ASPECT):
        meta["error"] = "square_or_bad_aspect"
        meta["aspectReject"] = {
            "w": cw,
            "h": ch,
            "aspect": round(aspect, 3),
            "minAspect": _MIN_ASPECT,
            "maxAspect": _MAX_ASPECT,
        }
        print(
            f"[ANPR-S2-RAW] aspect_reject shape=({ch},{cw}) aspect={aspect:.2f} "
            f"need={_MIN_ASPECT:.1f}-{_MAX_ASPECT:.1f} (not a plate strip)",
            flush=True,
        )
        return None, meta
    # else: aspect gate off — motorcycle / near-square crops proceed to OCR

    try:
        cv2.imwrite(_DEBUG_CROP, plate_crop)
        print(
            f"[ANPR-S2-RAW] wrote debug_ocr_crop.jpg shape={plate_crop.shape} "
            f"mean={float(np.mean(plate_crop)):.1f} box=({x1},{y1},{x2},{y2})",
            flush=True,
        )
    except Exception as exc:  # noqa: BLE001
        print("[ANPR-S2-RAW] debug_ocr_crop write fail:", str(exc)[:80], flush=True)

    try:
        from anpr_funnel_log import bump

        bump("s2_plates_raw", 1)
    except Exception:  # noqa: BLE001
        pass

    det = {
        "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
        "x1": x1, "y1": y1, "x2": x2, "y2": y2,
        "score": round(conf, 4),
        "source": "yolov8-plate-bbox",
    }
    meta.update({
        "source": "yolov8-plate-bbox",
        "conf": round(conf, 4),
        "outW": cw,
        "outH": ch,
        "det": det,
        "nativeMicro": plate_crop,
        "letterboxScale": float(scale),
        "letterboxPad": [int(pad_w), int(pad_h)],
        "nativeW": int(fw),
        "nativeH": int(fh),
        "warpBypassed": True,
    })
    return plate_crop, meta
