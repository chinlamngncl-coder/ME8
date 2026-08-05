"""
ANPR-PLATE-YOLO-NATIVE-WARP-V1 — CCPD YOLOv8-pose (4 keypoints) ONNX.

Detect on letterbox → map keypoints to NATIVE macro/frame pixels →
10–15% pad → cv2.warpPerspective → OCR strip for FastALPR / PP-OCRv4.

Weights (first found wins):
  FM_ANPR_CCPD_POSE_ONNX
  models/plate_yolov8n_pose_ccpd.onnx
  models/yolov8n-pose-plate-ccpd.onnx
  models/plate_pose_ccpd.onnx
"""
from __future__ import annotations

import os
from typing import Any, Optional, Tuple

import cv2
import numpy as np

_INPUT = int(os.environ.get("FM_ANPR_CCPD_POSE_SIZE", "640") or "640")
_CONF = float(os.environ.get("FM_ANPR_CCPD_POSE_CONF", "0.25") or "0.25")
# ANPR-BEST-PLATE-CROP-TRACK-V1 — ≥10% pad so turning plates are not clipped
_PAD = float(os.environ.get("FM_ANPR_BOX_PAD", "0.10") or "0.10")
_PAD = max(0.10, min(0.15, _PAD))
_OUT_W = int(os.environ.get("FM_ANPR_PLATE_WARP_W", "480") or "480")
_OUT_H = int(os.environ.get("FM_ANPR_PLATE_WARP_H", "160") or "160")
_OUT_W_MAX = int(os.environ.get("FM_ANPR_PLATE_WARP_W_MAX", "1280") or "1280")
_OUT_H_MAX = int(os.environ.get("FM_ANPR_PLATE_WARP_H_MAX", "480") or "480")
_MIN_W = max(30, int(os.environ.get("FM_ANPR_MIN_MICRO_W", "30") or "30"))
_MIN_H = max(15, int(os.environ.get("FM_ANPR_MIN_MICRO_H", "15") or "15"))
# Deskew gate — skip warpPerspective on extreme side-angle / barcode smears
_MIN_WARP_TOP_W = float(os.environ.get("FM_ANPR_DESKEW_MIN_TOP_W", "30") or "30")
_MIN_TRAP_RATIO = float(os.environ.get("FM_ANPR_DESKEW_MIN_TRAP", "0.40") or "0.40")
_MIN_PLATE_ASPECT = float(os.environ.get("FM_ANPR_DESKEW_MIN_ASPECT", "1.15") or "1.15")
_NKPT = 4

_session = None
_session_error: Optional[str] = None
_input_name: Optional[str] = None
_input_size = _INPUT


def models_dir() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def weights_path() -> Optional[str]:
    env = (os.environ.get("FM_ANPR_CCPD_POSE_ONNX") or "").strip()
    if env and os.path.isfile(env):
        return env
    md = models_dir()
    for name in (
        "plate_yolov8n_pose_ccpd.onnx",
        "yolov8n-pose-plate-ccpd.onnx",
        "plate_pose_ccpd.onnx",
        "ccpd_yolov8n_pose.onnx",
    ):
        p = os.path.join(md, name)
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
        _session_error = "ccpd_pose_onnx_missing"
        return None
    try:
        import onnxruntime as ort

        _session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        inp = _session.get_inputs()[0]
        _input_name = inp.name
        shape = inp.shape
        # [1,3,H,W] or dynamic
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
    sess = get_session()
    return {
        "ready": sess is not None,
        "error": _session_error,
        "weights": weights_path(),
        "pad": _PAD,
        "inputSize": _input_size,
        "architecture": "ccpd-yolov8-pose-native-warp-v1",
        "keypoints": _NKPT,
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


def _order_quad(pts: np.ndarray) -> np.ndarray:
    """Order 4 points TL, TR, BR, BL."""
    pts = np.asarray(pts, dtype=np.float32).reshape(4, 2)
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).reshape(4)
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(d)]
    bl = pts[np.argmax(d)]
    return np.stack([tl, tr, br, bl], axis=0).astype(np.float32)


def _pad_quad(pts: np.ndarray, pad_frac: float, fw: int, fh: int) -> np.ndarray:
    c = pts.mean(axis=0)
    out = c + (pts - c) * (1.0 + float(pad_frac))
    out[:, 0] = np.clip(out[:, 0], 0, max(0, fw - 1))
    out[:, 1] = np.clip(out[:, 1], 0, max(0, fh - 1))
    return out.astype(np.float32)


def _warp_size(quad: np.ndarray, I_orig: np.ndarray) -> Tuple[int, int]:
    xs = quad[:, 0]
    ys = quad[:, 1]
    bw = float(np.max(xs) - np.min(xs))
    bh = float(np.max(ys) - np.min(ys))
    fh, fw = I_orig.shape[:2]
    out_w = int(max(_OUT_W, min(bw * 2.0, float(_OUT_W_MAX), float(fw))))
    out_h = int(max(_OUT_H, min(bh * 2.0, float(_OUT_H_MAX), float(fh))))
    out_w = max(64, out_w - (out_w % 2))
    out_h = max(32, out_h - (out_h % 2))
    return out_w, out_h


def _warp_quad(img: np.ndarray, pts: np.ndarray, out_w: int, out_h: int) -> Optional[np.ndarray]:
    try:
        dst = np.array(
            [[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]],
            dtype=np.float32,
        )
        m = cv2.getPerspectiveTransform(pts.astype(np.float32), dst)
        return cv2.warpPerspective(
            img, m, (out_w, out_h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )
    except Exception:  # noqa: BLE001
        return None


def _edge_len(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(np.asarray(a, dtype=np.float32) - np.asarray(b, dtype=np.float32)))


def deskew_gate(quad_tl_tr_br_bl: np.ndarray) -> tuple[bool, dict[str, Any]]:
    """
    True → warpPerspective allowed.
    False → extreme oblique / tiny top edge → use xyxy bbox fallback (no warp).
    """
    q = np.asarray(quad_tl_tr_br_bl, dtype=np.float32).reshape(4, 2)
    tl, tr, br, bl = q[0], q[1], q[2], q[3]
    top_w = _edge_len(tl, tr)
    bot_w = _edge_len(bl, br)
    left_h = _edge_len(tl, bl)
    right_h = _edge_len(tr, br)
    mean_w = 0.5 * (top_w + bot_w)
    mean_h = 0.5 * (left_h + right_h)
    trap = min(top_w, bot_w) / max(top_w, bot_w, 1e-6)
    aspect = mean_w / max(mean_h, 1e-6)

    reasons: list[str] = []
    if top_w < _MIN_WARP_TOP_W:
        reasons.append("top_width_lt_min")
    if bot_w < _MIN_WARP_TOP_W:
        reasons.append("bot_width_lt_min")
    if mean_w < _MIN_WARP_TOP_W:
        reasons.append("mean_width_lt_min")
    if trap < _MIN_TRAP_RATIO:
        reasons.append("trapezoid_skew")
    if aspect < _MIN_PLATE_ASPECT:
        reasons.append("aspect_too_tall")  # side-angle: plate taller than wide in pixels

    ok = len(reasons) == 0
    return ok, {
        "ok": ok,
        "topWidth": round(top_w, 2),
        "botWidth": round(bot_w, 2),
        "meanWidth": round(mean_w, 2),
        "meanHeight": round(mean_h, 2),
        "trapRatio": round(trap, 3),
        "aspect": round(aspect, 3),
        "minTopW": _MIN_WARP_TOP_W,
        "minTrap": _MIN_TRAP_RATIO,
        "minAspect": _MIN_PLATE_ASPECT,
        "reasons": reasons,
    }


def rect_crop_from_keypoints(
    native_bgr: np.ndarray,
    keypoints: np.ndarray,
    pad_frac: float,
) -> tuple[Optional[np.ndarray], dict[str, Any]]:
    """
    Tight plate crop — minAreaRect of keypoints → axis AABB + pad (no warp).
    Slight 1.05× grow so characters are not clipped.
    """
    fh, fw = native_bgr.shape[:2]
    pts = np.asarray(keypoints, dtype=np.float32).reshape(-1, 2)
    if pts.shape[0] < 2:
        return None, {"error": "bad_keypoints"}
    try:
        rect = cv2.minAreaRect(pts)
        box = cv2.boxPoints(rect)
        x1 = float(np.min(box[:, 0]))
        y1 = float(np.min(box[:, 1]))
        x2 = float(np.max(box[:, 0]))
        y2 = float(np.max(box[:, 1]))
    except Exception:  # noqa: BLE001
        x1 = float(np.min(pts[:, 0]))
        y1 = float(np.min(pts[:, 1]))
        x2 = float(np.max(pts[:, 0]))
        y2 = float(np.max(pts[:, 1]))
    # 1.05× grow about center (disc) then pad_frac
    cx = 0.5 * (x1 + x2)
    cy = 0.5 * (y1 + y2)
    bw = max(1.0, (x2 - x1) * 1.05)
    bh = max(1.0, (y2 - y1) * 1.05)
    x1, x2 = cx - bw / 2.0, cx + bw / 2.0
    y1, y2 = cy - bh / 2.0, cy + bh / 2.0
    px = bw * float(pad_frac)
    py = bh * float(pad_frac)
    xi1 = int(max(0, min(fw - 1, round(x1 - px))))
    yi1 = int(max(0, min(fh - 1, round(y1 - py))))
    xi2 = int(max(xi1 + 1, min(fw, round(x2 + px))))
    yi2 = int(max(yi1 + 1, min(fh, round(y2 + py))))
    crop = np.ascontiguousarray(native_bgr[yi1:yi2, xi1:xi2].copy())
    det = {
        "x": xi1,
        "y": yi1,
        "w": xi2 - xi1,
        "h": yi2 - yi1,
        "x1": xi1,
        "y1": yi1,
        "x2": xi2,
        "y2": yi2,
        "source": "ccpd-pose-minarea-fallback",
    }
    if crop.shape[1] < _MIN_W or crop.shape[0] < _MIN_H:
        return None, {"error": "sliver_reject", "det": det, "w": crop.shape[1], "h": crop.shape[0]}
    return crop, det


def _lb_to_native(
    x: float, y: float, scale: float, pad_x: int, pad_y: int, fw: int, fh: int
) -> Tuple[float, float]:
    xn = (float(x) - pad_x) / max(1e-6, scale)
    yn = (float(y) - pad_y) / max(1e-6, scale)
    xn = max(0.0, min(float(fw - 1), xn))
    yn = max(0.0, min(float(fh - 1), yn))
    return xn, yn


def _parse_pose_output(
    out: np.ndarray,
    *,
    scale: float,
    pad_x: int,
    pad_y: int,
    fw: int,
    fh: int,
    conf_thr: float,
) -> list[dict[str, Any]]:
    """
    Parse Ultralytics-style pose: channels = 4 (xywh) + 1 (obj) [+ nc] + nk*3.
    Accept (1,C,N), (C,N), (1,N,C), (N,C).
    """
    arr = np.asarray(out)
    if arr.ndim == 3:
        arr = arr[0]
    if arr.ndim != 2:
        return []
    # Prefer C x N when C is small (< 64) and N large
    if arr.shape[0] < arr.shape[1] and arr.shape[0] <= 64:
        pred = arr  # (C, N)
    else:
        pred = arr.T  # (C, N)
    c, n = pred.shape
    # Need at least xywh + conf + 4*2 (x,y) = 4+1+8 = 13; with visibility 4+1+12 = 17
    if c < 13 or n < 1:
        return []
    # Detect layout: if c == 4+1+12 or 4+1+8 or 4+nc+12
    has_vis = False
    kpt_off = 5
    if c >= 5 + _NKPT * 3:
        has_vis = True
        kpt_stride = 3
        # If more classes: 4 + nc + nk*3; assume nc=1 → offset 5
        if c > 5 + _NKPT * 3:
            # 4 + nc + 12; nc = c - 4 - 12
            nc = c - 4 - _NKPT * 3
            kpt_off = 4 + max(1, nc)
        else:
            kpt_off = 5
    elif c >= 5 + _NKPT * 2:
        has_vis = False
        kpt_stride = 2
        kpt_off = 5
    else:
        return []

    hits: list[dict[str, Any]] = []
    for i in range(n):
        conf = float(pred[4, i])
        if conf < conf_thr:
            continue
        cx, cy, bw, bh = float(pred[0, i]), float(pred[1, i]), float(pred[2, i]), float(pred[3, i])
        kpts_lb = []
        for k in range(_NKPT):
            base = kpt_off + k * kpt_stride
            kx = float(pred[base, i])
            ky = float(pred[base + 1, i])
            if has_vis and kpt_stride >= 3:
                kv = float(pred[base + 2, i])
                if kv < 0.1 and conf < conf_thr + 0.15:
                    # weak keypoint — still use coords
                    pass
            kpts_lb.append((kx, ky))
        # Map to native
        pts = []
        for kx, ky in kpts_lb:
            xn, yn = _lb_to_native(kx, ky, scale, pad_x, pad_y, fw, fh)
            pts.append([xn, yn])
        pts_a = np.asarray(pts, dtype=np.float32)
        # Also map box for meta
        x1 = (cx - bw / 2.0 - pad_x) / scale
        y1 = (cy - bh / 2.0 - pad_y) / scale
        x2 = (cx + bw / 2.0 - pad_x) / scale
        y2 = (cy + bh / 2.0 - pad_y) / scale
        hits.append({
            "conf": conf,
            "keypoints": pts_a,
            "box": {
                "x1": int(max(0, min(fw - 1, round(x1)))),
                "y1": int(max(0, min(fh - 1, round(y1)))),
                "x2": int(max(0, min(fw, round(x2)))),
                "y2": int(max(0, min(fh, round(y2)))),
            },
        })
    hits.sort(key=lambda h: h["conf"], reverse=True)
    try:
        from vehicle_detect import filter_watermark_deadzone
        from dual_lpr import filter_plate_boxes_geometry

        hits = filter_watermark_deadzone(hits, fh)
        hits = filter_plate_boxes_geometry(hits, vehicle_h=fh)
    except Exception:  # noqa: BLE001
        pass
    return hits


def localize_plate_native_warp(
    native_bgr: np.ndarray,
) -> Tuple[Optional[np.ndarray], dict[str, Any]]:
    """
    Run CCPD pose on letterbox; warp from NATIVE pixels only.
    Returns (warped_bgr | None, meta).
    """
    meta: dict[str, Any] = {
        "architecture": "ccpd-yolov8-pose-native-warp-v1",
        "pad": _PAD,
        "source": None,
    }
    if native_bgr is None or getattr(native_bgr, "size", 0) == 0:
        meta["error"] = "bad_native"
        return None, meta
    sess = get_session()
    if sess is None or not _input_name:
        meta["error"] = _session_error or "ccpd_pose_not_ready"
        return None, meta

    fh, fw = native_bgr.shape[:2]
    size = _input_size
    canvas, scale, pad_x, pad_y = _letterbox(native_bgr, size)
    blob = canvas[:, :, ::-1].transpose(2, 0, 1).astype(np.float32) / 255.0
    blob = np.expand_dims(blob, 0)
    try:
        outs = sess.run(None, {_input_name: blob})
    except Exception as exc:  # noqa: BLE001
        meta["error"] = "infer:" + str(exc)[:120]
        return None, meta
    if not outs:
        meta["error"] = "empty_output"
        return None, meta

    hits = _parse_pose_output(
        outs[0],
        scale=scale,
        pad_x=pad_x,
        pad_y=pad_y,
        fw=fw,
        fh=fh,
        conf_thr=_CONF,
    )
    if not hits:
        meta["error"] = "no_plate_pose"
        return None, meta

    best = hits[0]
    kpts = best["keypoints"]
    quad_raw = _order_quad(kpts)
    gate_ok, gate = deskew_gate(quad_raw)
    meta["deskewGate"] = gate

    # Extreme side-angle / tiny top edge → NO warpPerspective (barcode smear kill)
    if not gate_ok:
        crop, det_or_err = rect_crop_from_keypoints(native_bgr, kpts, _PAD)
        if crop is None:
            meta["error"] = (det_or_err or {}).get("error") or "bbox_fallback_failed"
            meta["sliverReject"] = det_or_err
            return None, meta
        det = dict(det_or_err)
        det["score"] = float(best["conf"])
        meta.update({
            "source": "ccpd-yolov8-pose-bbox-fallback",
            "conf": round(float(best["conf"]), 4),
            "quad": quad_raw.tolist(),
            "outW": int(crop.shape[1]),
            "outH": int(crop.shape[0]),
            "det": det,
            "nativeMicro": crop,
            "letterboxScale": float(scale),
            "letterboxPad": [int(pad_x), int(pad_y)],
            "nativeW": int(fw),
            "nativeH": int(fh),
            "warpBypassed": True,
        })
        return crop, meta

    quad = _pad_quad(quad_raw, _PAD, fw, fh)
    out_w, out_h = _warp_size(quad, native_bgr)
    warped = _warp_quad(native_bgr, quad, out_w, out_h)
    if warped is None or getattr(warped, "size", 0) == 0:
        # Warp failed → same xyxy fallback
        crop, det_or_err = rect_crop_from_keypoints(native_bgr, kpts, _PAD)
        if crop is not None:
            det = dict(det_or_err)
            det["score"] = float(best["conf"])
            meta.update({
                "source": "ccpd-yolov8-pose-bbox-fallback",
                "conf": round(float(best["conf"]), 4),
                "quad": quad_raw.tolist(),
                "outW": int(crop.shape[1]),
                "outH": int(crop.shape[0]),
                "det": det,
                "nativeMicro": crop,
                "letterboxScale": float(scale),
                "letterboxPad": [int(pad_x), int(pad_y)],
                "nativeW": int(fw),
                "nativeH": int(fh),
                "warpBypassed": True,
                "warpFallbackReason": "warp_failed",
            })
            return crop, meta
        meta["error"] = "warp_failed"
        return None, meta
    wh, ww = warped.shape[:2]
    if ww < _MIN_W or wh < _MIN_H:
        meta["error"] = "sliver_reject"
        meta["sliverReject"] = {"w": int(ww), "h": int(wh)}
        return None, meta

    box = best.get("box") or {}
    meta.update({
        "source": "ccpd-yolov8-pose",
        "conf": round(float(best["conf"]), 4),
        "quad": quad.tolist(),
        "outW": int(out_w),
        "outH": int(out_h),
        "det": {
            "x": int(box.get("x1") or 0),
            "y": int(box.get("y1") or 0),
            "w": int((box.get("x2") or 0) - (box.get("x1") or 0)),
            "h": int((box.get("y2") or 0) - (box.get("y1") or 0)),
            "x1": int(box.get("x1") or 0),
            "y1": int(box.get("y1") or 0),
            "x2": int(box.get("x2") or 0),
            "y2": int(box.get("y2") or 0),
            "score": float(best["conf"]),
            "source": "ccpd-pose-native",
        },
        "nativeMicro": warped,
        "letterboxScale": float(scale),
        "letterboxPad": [int(pad_x), int(pad_y)],
        "nativeW": int(fw),
        "nativeH": int(fh),
        "warpBypassed": False,
    })
    return warped, meta
