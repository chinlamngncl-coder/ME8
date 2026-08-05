"""
BWC frame pre-process — Frame UUID + Laplacian blur gate.
Fisheye un-warp DISABLED (uncalibrated matrix destroyed pixel density).
"""
from __future__ import annotations

import os
import uuid
from typing import Any, Optional, Tuple

import cv2
import numpy as np

# Highly permissive — only drop mathematically unrecoverable mud; OCR handles mild blur.
BLUR_FLOOR = float(os.environ.get("FM_ANPR_BLUR_FLOOR", "20") or "20")
# Default OFF — set FM_ANPR_FISHEYE=1 only with calibrated intrinsics.
FISHEYE_ON = (os.environ.get("FM_ANPR_FISHEYE") or "0").strip().lower() in ("1", "true", "on", "yes")


def new_frame_uuid() -> str:
    return str(uuid.uuid4())


def laplacian_variance(img_bgr: np.ndarray) -> float:
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return 0.0
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def undistor_bwc(img_bgr: np.ndarray) -> np.ndarray:
    """
    Legacy uncalibrated fisheye path — BYPASSED by default.
    Do not enable without a real camera matrix (destroys plate pixels).
    """
    if not FISHEYE_ON or img_bgr is None or img_bgr.size == 0:
        return img_bgr
    h, w = img_bgr.shape[:2]
    if h < 32 or w < 32:
        return img_bgr
    fx = float(os.environ.get("FM_ANPR_CAM_FX", str(w * 0.85)) or (w * 0.85))
    fy = float(os.environ.get("FM_ANPR_CAM_FY", str(h * 0.85)) or (h * 0.85))
    cx = w * 0.5
    cy = h * 0.5
    k1 = float(os.environ.get("FM_ANPR_DIST_K1", "-0.22") or "-0.22")
    k2 = float(os.environ.get("FM_ANPR_DIST_K2", "0.06") or "0.06")
    p1 = float(os.environ.get("FM_ANPR_DIST_P1", "0") or "0")
    p2 = float(os.environ.get("FM_ANPR_DIST_P2", "0") or "0")
    K = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]], dtype=np.float64)
    D = np.array([k1, k2, p1, p2], dtype=np.float64)
    try:
        new_K, _ = cv2.getOptimalNewCameraMatrix(K, D, (w, h), 0.85, (w, h))
        map1, map2 = cv2.initUndistortRectifyMap(K, D, None, new_K, (w, h), cv2.CV_16SC2)
        return cv2.remap(img_bgr, map1, map2, interpolation=cv2.INTER_LINEAR)
    except Exception:  # noqa: BLE001
        return img_bgr


def preprocess_ingest(
    img_bgr: np.ndarray,
    *,
    frame_uuid: Optional[str] = None,
) -> Tuple[Optional[np.ndarray], dict[str, Any]]:
    """
    Returns (native_bgr | None, meta).
    Passes the unaltered frame into Stage 1 (fisheye off by default).
    If blur-rejected, processed_bgr is None and meta.error == 'blur_reject'.
    """
    fid = frame_uuid or new_frame_uuid()
    meta: dict[str, Any] = {"frameUuid": fid, "fisheye": bool(FISHEYE_ON)}
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        meta["error"] = "bad_file"
        return None, meta

    # Native frame — no destructive un-warp unless explicitly enabled
    frame = undistor_bwc(img_bgr) if FISHEYE_ON else img_bgr
    sharp = laplacian_variance(frame)
    meta["sharpness"] = sharp
    meta["blurFloor"] = BLUR_FLOOR
    meta["nativeW"] = int(frame.shape[1])
    meta["nativeH"] = int(frame.shape[0])
    if sharp < BLUR_FLOOR:
        meta["error"] = "blur_reject"
        meta["ok"] = False
        return None, meta
    return frame, meta
