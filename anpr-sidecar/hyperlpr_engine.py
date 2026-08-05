"""
Engine B — HyperLPR3 recognition on deskewed plate micro-crop.
Alphanumeric / regional regex via pipeline.lock_plate_from_raw.
"""
from __future__ import annotations

import os
import re
import threading
from typing import Any, Optional

import cv2
import numpy as np

_lock = threading.Lock()
_catcher = None
_catcher_error: Optional[str] = None


def _alnum_only(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def hyperlpr_status() -> dict[str, Any]:
    ready = get_catcher() is not None
    return {
        "ready": ready,
        "error": _catcher_error,
        "engine": "hyperlpr3",
        "role": "engine-b",
    }


def get_catcher():
    global _catcher, _catcher_error
    if _catcher is not None:
        return _catcher
    if _catcher_error and (os.environ.get("FM_ANPR_HYPERLPR_RETRY") or "").strip() not in (
        "1",
        "true",
        "yes",
    ):
        return None
    with _lock:
        if _catcher is not None:
            return _catcher
        try:
            import hyperlpr3 as lpr3

            level = (os.environ.get("FM_ANPR_HYPERLPR_LEVEL") or "low").strip().lower()
            det = getattr(lpr3, "DETECT_LEVEL_HIGH", 1) if level in ("high", "640") else getattr(
                lpr3, "DETECT_LEVEL_LOW", 0
            )
            _catcher = lpr3.LicensePlateCatcher(detect_level=det)
            _catcher_error = None
            return _catcher
        except Exception as exc:  # noqa: BLE001
            _catcher_error = str(exc)[:180]
            _catcher = None
            return None


def _pad_for_det(micro_bgr: np.ndarray, min_side: int = 320) -> np.ndarray:
    h, w = micro_bgr.shape[:2]
    side = max(h, w, min_side)
    canvas = np.zeros((side, side, 3), dtype=np.uint8)
    y0 = (side - h) // 2
    x0 = (side - w) // 2
    canvas[y0 : y0 + h, x0 : x0 + w] = micro_bgr
    return canvas


def read_with_hyperlpr(micro_bgr: np.ndarray) -> dict[str, Any]:
    """
    Run HyperLPR3 on a plate micro-crop (already warped). Returns FastALPR-like dict.
    """
    out: dict[str, Any] = {
        "ok": False,
        "unclear": True,
        "engine": "hyperlpr3",
        "ocrModel": "HyperLPR3",
        "rawText": "",
        "conf": 0.0,
        "plate": None,
    }
    if micro_bgr is None or getattr(micro_bgr, "size", 0) == 0:
        out["error"] = "bad_file"
        return out
    catcher = get_catcher()
    if catcher is None:
        out["error"] = _catcher_error or "hyperlpr3_missing"
        return out

    work = np.ascontiguousarray(micro_bgr)
    if work.dtype != np.uint8:
        work = work.astype(np.uint8)
    # Tiny warped strips: pad so HyperLPR detector can fire
    padded = _pad_for_det(work)
    try:
        results = catcher(padded)
    except Exception as exc:  # noqa: BLE001
        out["error"] = "hyperlpr_exc:" + str(exc)[:120]
        return out

    if not results:
        # Retry on unpadded crop (full strip already plate-like)
        try:
            results = catcher(work)
        except Exception:  # noqa: BLE001
            results = []
    if not results:
        out["error"] = "plate_not_found"
        return out

    # Prefer highest conf; keep alphanumeric-only text for PH/EN syntax
    best = None
    best_conf = -1.0
    for item in results:
        try:
            code, conf, ptype, box = item[0], float(item[1]), item[2], item[3]
        except (TypeError, ValueError, IndexError):
            continue
        alnum = _alnum_only(str(code))
        if not alnum or len(alnum) < 4:
            continue
        if conf > best_conf:
            best_conf = conf
            best = (alnum, conf, ptype, box, str(code))

    if best is None:
        # Fall back to first raw (still strip non-alnum later in dual normalize)
        try:
            item = results[0]
            code = str(item[0])
            conf = float(item[1])
            alnum = _alnum_only(code)
            out["rawText"] = alnum or code
            out["conf"] = conf
            out["error"] = "no_alnum_plate"
        except Exception:  # noqa: BLE001
            out["error"] = "bad_result"
        return out

    alnum, conf, ptype, box, raw_code = best
    out.update({
        "ok": True,
        "unclear": False,
        "rawText": alnum,
        "plate": alnum,
        "conf": float(conf),
        "confidence": float(conf),
        "hyperlprType": ptype,
        "hyperlprRaw": raw_code,
    })
    if box is not None:
        try:
            x1, y1, x2, y2 = [int(v) for v in box[:4]]
            out["det"] = {
                "x": x1,
                "y": y1,
                "w": max(0, x2 - x1),
                "h": max(0, y2 - y1),
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "score": conf,
                "source": "hyperlpr3",
            }
        except Exception:  # noqa: BLE001
            pass
    return out
