"""
WPOD-NET cascaded plate micro-crop (alpr-unconstrained architecture).

Stage 2 (caller): YOLO vehicle macro-crop from full-res frame.
Stage 3 (this module): WPOD localize 4 corners → affine/perspective un-warp →
                       10% padding → OCR-ready plate strip (reject <30×15 slivers).

ONNX weights optional at models/wpod.onnx (or FM_ANPR_WPOD_ONNX).
Without ONNX: FastALPR plate box + OpenCV perspective un-warp (same cascade shape).
"""
from __future__ import annotations

import os
from typing import Any, Optional, Tuple

import cv2
import numpy as np

_PAD = float(os.environ.get("FM_ANPR_WPOD_PAD", "0.10") or "0.10")
_THRESH = float(os.environ.get("FM_ANPR_WPOD_THRESH", "0.40") or "0.40")
# Floors only — actual warp size tracks native plate bbox (not tiny 240 from YOLO letterbox).
_OUT_W = int(os.environ.get("FM_ANPR_WPOD_OUT_W", "480") or "480")
_OUT_H = int(os.environ.get("FM_ANPR_WPOD_OUT_H", "160") or "160")
_OUT_W_MAX = int(os.environ.get("FM_ANPR_WPOD_OUT_W_MAX", "1280") or "1280")
_OUT_H_MAX = int(os.environ.get("FM_ANPR_WPOD_OUT_H_MAX", "480") or "480")
_MAX_DIM = int(os.environ.get("FM_ANPR_WPOD_MAX_DIM", "608") or "608")
_NET_STEP = 16
# Sliver floors (must match dual_lpr)
_MIN_MICRO_W = max(30, int(os.environ.get("FM_ANPR_MIN_MICRO_W", "30") or "30"))
_MIN_MICRO_H = max(15, int(os.environ.get("FM_ANPR_MIN_MICRO_H", "15") or "15"))
_BOX_PAD = float(os.environ.get("FM_ANPR_BOX_PAD", "0.10") or "0.10")


def _native_out_size(quad: np.ndarray, I_orig: np.ndarray) -> tuple[int, int]:
    """Warp destination sized from native plate extent (never downscale below plate pixels)."""
    xs = quad[:, 0]
    ys = quad[:, 1]
    bw = float(np.max(xs) - np.min(xs))
    bh = float(np.max(ys) - np.min(ys))
    fh, fw = I_orig.shape[:2]
    # Sample at ~2× plate width so OCR glyphs stay sharp from 1080p/4K buffer
    out_w = int(max(_OUT_W, min(bw * 2.0, float(_OUT_W_MAX), float(fw))))
    out_h = int(max(_OUT_H, min(bh * 2.0, float(_OUT_H_MAX), float(fh))))
    out_w = max(64, out_w - (out_w % 2))
    out_h = max(32, out_h - (out_h % 2))
    return out_w, out_h

_session = None
_session_error: Optional[str] = None


def _weights_path() -> str:
    env = (os.environ.get("FM_ANPR_WPOD_ONNX") or "").strip()
    if env:
        return env
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "models", "wpod.onnx")


def get_wpod_session():
    global _session, _session_error
    if _session is not None:
        return _session
    if _session_error:
        return None
    path = _weights_path()
    if not os.path.isfile(path):
        _session_error = "wpod_onnx_missing:" + path
        return None
    try:
        import onnxruntime as ort

        _session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        return _session
    except Exception as exc:  # noqa: BLE001
        _session_error = str(exc)[:180]
        return None


def wpod_status() -> dict[str, Any]:
    sess = get_wpod_session()
    return {
        "ready": sess is not None,
        "error": _session_error,
        "weights": _weights_path(),
        "pad": _PAD,
        "mode": "onnx" if sess is not None else "cascade-affine-fallback",
        "architecture": "alpr-unconstrained-wpod-cascade-v1",
    }


def _pad_quad(pts: np.ndarray, pad_frac: float, fw: int, fh: int) -> np.ndarray:
    """Expand quad about its center by pad_frac (default 15%)."""
    c = pts.mean(axis=0)
    out = c + (pts - c) * (1.0 + float(pad_frac))
    out[:, 0] = np.clip(out[:, 0], 0, max(0, fw - 1))
    out[:, 1] = np.clip(out[:, 1], 0, max(0, fh - 1))
    return out.astype(np.float32)


def _warp_quad(img_bgr: np.ndarray, pts: np.ndarray, out_w: int, out_h: int) -> Optional[np.ndarray]:
    """pts: 4x2 float32 TL,TR,BR,BL in image coords."""
    if img_bgr is None or img_bgr.size == 0 or pts is None or len(pts) != 4:
        return None
    dst = np.array(
        [[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]],
        dtype=np.float32,
    )
    src = pts.astype(np.float32)
    try:
        H = cv2.getPerspectiveTransform(src, dst)
        return cv2.warpPerspective(
            img_bgr,
            H,
            (out_w, out_h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
    except Exception:  # noqa: BLE001
        return None


def _bbox_to_quad(x: int, y: int, w: int, h: int) -> np.ndarray:
    return np.array(
        [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
        dtype=np.float32,
    )


def _refine_quad_edges(img_bgr: np.ndarray, quad: np.ndarray) -> np.ndarray:
    """
    Mild side-angle refine: nudge left/right edges using vertical gradients
    so parallel-park plates get a slight parallelogram before un-warp.
    """
    if img_bgr is None or img_bgr.size == 0:
        return quad
    fh, fw = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    x0 = int(max(0, min(fw - 1, np.min(quad[:, 0]))))
    x1 = int(max(0, min(fw, np.max(quad[:, 0]))))
    y0 = int(max(0, min(fh - 1, np.min(quad[:, 1]))))
    y1 = int(max(0, min(fh, np.max(quad[:, 1]))))
    if x1 - x0 < 16 or y1 - y0 < 8:
        return quad
    roi = np.abs(gx[y0:y1, x0:x1])
    if roi.size == 0:
        return quad
    col = roi.mean(axis=0)
    if col.size < 8:
        return quad
    # Peak edges near left / right thirds → shear estimate
    mid = col.size // 2
    left_peak = int(np.argmax(col[: mid + 1]))
    right_peak = mid + int(np.argmax(col[mid:]))
    shear = float(right_peak - left_peak - mid) * 0.15
    out = quad.copy()
    # TL, BL shift; TR, BR opposite
    out[0, 0] += shear
    out[3, 0] += shear
    out[1, 0] -= shear
    out[2, 0] -= shear
    out[:, 0] = np.clip(out[:, 0], 0, fw - 1)
    out[:, 1] = np.clip(out[:, 1], 0, fh - 1)
    return out


def _reconstruct_onnx(Y: np.ndarray, I_resized: np.ndarray, I_orig: np.ndarray) -> Optional[np.ndarray]:
    """
    Decode WPOD 8-channel map → best plate warp (paper reconstruct).
    Y shape: HxWx8 or 1xHxWx8 (prob, _, a11,a12,a13,a21,a22,a23).
    """
    if Y is None:
        return None
    arr = np.asarray(Y)
    if arr.ndim == 4:
        arr = arr[0]
    if arr.ndim == 3 and arr.shape[0] == 8:
        arr = np.transpose(arr, (1, 2, 0))
    if arr.ndim != 3 or arr.shape[2] < 8:
        return None

    Probs = arr[..., 0]
    Affines = arr[..., 2:8]
    rx, ry = Probs.shape[:2]
    net_stride = 16
    side = ((208.0 + 40.0) / 2.0) / net_stride  # 7.75
    xx, yy = np.where(Probs > _THRESH)
    if len(xx) == 0:
        return None

    iwh = np.array([I_resized.shape[1], I_resized.shape[0]], dtype=np.float64).reshape(2, 1)
    MN = iwh / float(net_stride)
    best = None
    best_p = -1.0
    vxx = vyy = 0.5
    base = np.array([[-vxx, -vyy, 1.0], [vxx, -vyy, 1.0], [vxx, vyy, 1.0], [-vxx, vyy, 1.0]], dtype=np.float64).T

    for i in range(len(xx)):
        y, x = int(xx[i]), int(yy[i])
        prob = float(Probs[y, x])
        if prob <= best_p:
            continue
        affine = Affines[y, x].astype(np.float64)
        A = np.reshape(affine, (2, 3))
        A[0, 0] = max(A[0, 0], 0.0)
        A[1, 1] = max(A[1, 1], 0.0)
        mn = np.array([float(x) + 0.5, float(y) + 0.5], dtype=np.float64)
        pts = A @ base  # 2x4
        pts_MN = pts * side + mn.reshape(2, 1)
        pts_prop = pts_MN / MN
        # to original resized pixels
        pts_px = (pts_prop * iwh).T  # 4x2
        # scale to original image
        sx = float(I_orig.shape[1]) / float(I_resized.shape[1])
        sy = float(I_orig.shape[0]) / float(I_resized.shape[0])
        pts_o = pts_px.copy()
        pts_o[:, 0] *= sx
        pts_o[:, 1] *= sy
        best_p = prob
        best = pts_o.astype(np.float32)

    if best is None:
        return None
    fh, fw = I_orig.shape[:2]
    padded = _pad_quad(best, _PAD, fw, fh)
    out_w, out_h = _native_out_size(padded, I_orig)
    return _warp_quad(I_orig, padded, out_w, out_h)


def _detect_wpod_onnx(vehicle_bgr: np.ndarray) -> Optional[np.ndarray]:
    sess = get_wpod_session()
    if sess is None or vehicle_bgr is None or vehicle_bgr.size == 0:
        return None
    I = vehicle_bgr
    min_dim = min(I.shape[:2])
    if min_dim < 8:
        return None
    factor = float(_MAX_DIM) / float(min_dim)
    w = int(I.shape[1] * factor)
    h = int(I.shape[0] * factor)
    w += (_NET_STEP - w % _NET_STEP) % _NET_STEP
    h += (_NET_STEP - h % _NET_STEP) % _NET_STEP
    Iresized = cv2.resize(I, (w, h), interpolation=cv2.INTER_CUBIC)
    # NHWC float 0..1 or 0..255 — try both common conventions
    blob = Iresized.astype(np.float32)
    if float(np.max(blob)) > 1.5:
        blob = blob / 255.0
    inp = sess.get_inputs()[0]
    name = inp.name
    shape = list(inp.shape)
    feed = blob
    # NCHW vs NHWC
    if len(shape) == 4 and shape[1] == 3:
        feed = np.transpose(blob, (2, 0, 1))[None, ...]
    else:
        feed = blob[None, ...]
    try:
        outs = sess.run(None, {name: feed})
    except Exception:  # noqa: BLE001
        return None
    if not outs:
        return None
    return _reconstruct_onnx(outs[0], Iresized, I)


def _detect_affine_fallback(vehicle_bgr: np.ndarray) -> Optional[Tuple[np.ndarray, dict[str, Any]]]:
    """
    Cascade fallback: plate box inside vehicle → scale to orig macro dims →
    10% pad → reject slivers (<30w/<15h) → perspective un-warp.
    """
    from dual_lpr import crop_micro_from_box, resolve_xyxy_to_pixels, pad_xyxy
    from fastalpr_engine import read_with_fastalpr

    raw = read_with_fastalpr(vehicle_bgr)
    det = raw.get("det") if isinstance(raw, dict) else None
    fh, fw = vehicle_bgr.shape[:2]
    if not isinstance(det, dict):
        return None

    xyxy = resolve_xyxy_to_pixels(det, fw, fh)
    if xyxy is None:
        return None
    x0, y0, x1, y1 = pad_xyxy(*xyxy, fw, fh, pad_frac=_BOX_PAD)
    bw, bh = x1 - x0, y1 - y0
    if bw < _MIN_MICRO_W or bh < _MIN_MICRO_H:
        return None

    native_micro, crop_meta = crop_micro_from_box(vehicle_bgr, det, pad_frac=_BOX_PAD)
    if native_micro is None:
        return None

    quad = _bbox_to_quad(x0, y0, bw, bh)
    quad = _refine_quad_edges(vehicle_bgr, quad)
    quad = _pad_quad(quad, _PAD, fw, fh)
    out_w, out_h = _native_out_size(quad, vehicle_bgr)
    warped = _warp_quad(vehicle_bgr, quad, out_w, out_h)
    if warped is not None:
        wh, ww = warped.shape[:2]
        if ww < _MIN_MICRO_W or wh < _MIN_MICRO_H:
            warped = None

    meta = {
        "source": "wpod-cascade-affine",
        "pad": _PAD,
        "boxPad": _BOX_PAD,
        "det": crop_meta or {
            "x": x0,
            "y": y0,
            "w": bw,
            "h": bh,
            "x1": x0,
            "y1": y0,
            "x2": x1,
            "y2": y1,
            "source": "scaled-pad-v1",
        },
        "quad": quad.tolist(),
        "outW": out_w if warped is not None else None,
        "outH": out_h if warped is not None else None,
        "nativeMicro": native_micro,
        "ocrHint": {
            "rawText": raw.get("rawText"),
            "conf": raw.get("conf"),
            "ok": raw.get("ok"),
            "candidates": raw.get("candidates"),
            "detModel": raw.get("detModel"),
            "ocrModel": raw.get("ocrModel"),
            "engine": raw.get("engine"),
        },
    }
    # Prefer warped if valid; else native padded crop still returned via nativeMicro
    return (warped if warped is not None else native_micro), meta


def localize_and_unwarp(vehicle_bgr: np.ndarray) -> Tuple[Optional[np.ndarray], dict[str, Any]]:
    """
    Returns (warped_plate_bgr | None, meta).
    Always applies 10% pad before OCR hand-off; rejects thin slivers.
    """
    meta: dict[str, Any] = {"pad": _PAD, "boxPad": _BOX_PAD, "architecture": "wpod-double-crop-v1"}
    if vehicle_bgr is None or getattr(vehicle_bgr, "size", 0) == 0:
        meta["error"] = "bad_vehicle_crop"
        return None, meta

    warped = _detect_wpod_onnx(vehicle_bgr)
    if warped is not None:
        wh, ww = warped.shape[:2]
        if ww >= _MIN_MICRO_W and wh >= _MIN_MICRO_H:
            meta["source"] = "wpod-onnx"
            meta["outW"] = warped.shape[1]
            meta["outH"] = warped.shape[0]
            return warped, meta
        meta["sliverReject"] = {"w": ww, "h": wh, "source": "wpod-onnx"}

    fb = _detect_affine_fallback(vehicle_bgr)
    if fb is not None:
        warped2, m2 = fb
        meta.update({k: v for k, v in m2.items()})
        return warped2, meta

    meta["error"] = "plate_not_localized"
    return None, meta
