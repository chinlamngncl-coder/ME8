"""
ANPR FastALPR ship engine — YOLO plate detect + fast-plate-ocr global (ONNX).
ANPR-LIVE-POWER-CROP-MIT-V1 — default MIT open-image-models yolo-v9-t-512 (+ 384 fallback).
"""
from __future__ import annotations

import os
from typing import Any, Optional

import numpy as np

_alpr = None
_alpr_error: Optional[str] = None
_alpr_fb = None
_alpr_fb_error: Optional[str] = None

# MIT open-image-models plate ONNX (via FastALPR). 512 = power crop default; 384 = fallback.
DET_MODEL = (
    os.environ.get("FM_ANPR_FASTALPR_DET") or "yolo-v9-t-512-license-plate-end2end"
).strip()
# ANPR-OCR-CCT-S-GLOBAL-V1 — stronger MIT plate OCR (was cct-xs-v2-global-model)
OCR_MODEL = (
    os.environ.get("FM_ANPR_FASTALPR_OCR") or "cct-s-v2-global-model"
).strip()
DET_CONF = float(os.environ.get("FM_ANPR_FASTALPR_DET_CONF", "0.18") or "0.18")
FALLBACK_DET = (
    os.environ.get("FM_ANPR_FASTALPR_DET_FALLBACK") or "yolo-v9-t-384-license-plate-end2end"
).strip()
FALLBACK_CONF = float(os.environ.get("FM_ANPR_FASTALPR_DET_FALLBACK_CONF", "0.14") or "0.14")
USE_FALLBACK = (os.environ.get("FM_ANPR_FASTALPR_DET_FALLBACK_ENABLE") or "1").strip().lower() not in (
    "0", "false", "no", "off",
)


def get_fastalpr():
    global _alpr, _alpr_error
    if _alpr is not None:
        return _alpr
    if _alpr_error:
        return None
    try:
        from fast_alpr import ALPR

        _alpr = ALPR(
            detector_model=DET_MODEL,  # type: ignore[arg-type]
            ocr_model=OCR_MODEL,  # type: ignore[arg-type]
            detector_conf_thresh=DET_CONF,
            ocr_device="cpu",
        )
        return _alpr
    except Exception as exc:  # noqa: BLE001
        _alpr_error = str(exc)[:220]
        return None


def get_fastalpr_fallback():
    """Secondary MIT plate ONNX (384) when primary 512 finds nothing — bikes / far plates."""
    global _alpr_fb, _alpr_fb_error
    if not USE_FALLBACK or not FALLBACK_DET or FALLBACK_DET == DET_MODEL:
        return None
    if _alpr_fb is not None:
        return _alpr_fb
    if _alpr_fb_error:
        return None
    try:
        from fast_alpr import ALPR

        _alpr_fb = ALPR(
            detector_model=FALLBACK_DET,  # type: ignore[arg-type]
            ocr_model=OCR_MODEL,  # type: ignore[arg-type]
            detector_conf_thresh=FALLBACK_CONF,
            ocr_device="cpu",
        )
        return _alpr_fb
    except Exception as exc:  # noqa: BLE001
        _alpr_fb_error = str(exc)[:220]
        return None


def _ocr_conf_mean(ocr_obj: Any) -> float:
    conf = getattr(ocr_obj, "confidence", None)
    if conf is None:
        return 0.0
    if isinstance(conf, (int, float)):
        return float(conf)
    try:
        vals = [float(x) for x in conf]
        if not vals:
            return 0.0
        return float(sum(vals) / len(vals))
    except Exception:  # noqa: BLE001
        return 0.0


def _candidates_from_results(results: Any, *, det_source: str) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    if not results:
        return candidates
    for r in results:
        det = getattr(r, "detection", None)
        ocr = getattr(r, "ocr", None)
        box = getattr(det, "bounding_box", None) if det is not None else None
        det_conf = float(getattr(det, "confidence", 0) or 0) if det is not None else 0.0
        det_meta = None
        if box is not None:
            det_meta = {
                "x": int(getattr(box, "x1", 0)),
                "y": int(getattr(box, "y1", 0)),
                "w": int(getattr(box, "x2", 0) - getattr(box, "x1", 0)),
                "h": int(getattr(box, "y2", 0) - getattr(box, "y1", 0)),
                "score": round(det_conf, 4),
                "source": det_source,
                "detConf": round(det_conf, 4),
            }
        # Crop-first: detection-only rows OK (OCR text optional)
        if det_meta is None and ocr is None:
            continue
        text = str(getattr(ocr, "text", "") or "") if ocr is not None else ""
        conf = _ocr_conf_mean(ocr) if ocr is not None else 0.0
        candidates.append({
            "rawText": text,
            "conf": conf,
            "det": det_meta,
            "regionHint": getattr(ocr, "region", None) if ocr is not None else None,
        })
    return candidates


def read_with_fastalpr(img_bgr: np.ndarray) -> dict[str, Any]:
    """Run FastALPR on full frame. Returns raw candidates (OCR lock applied in pipeline)."""
    alpr = get_fastalpr()
    if alpr is None:
        return {
            "ok": False,
            "error": "engine_missing",
            "message": (_alpr_error or "fast-alpr not installed")[:160],
            "engine": "fastalpr-ship-v1",
        }
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return {"ok": False, "error": "bad_file", "engine": "fastalpr-ship-v1"}

    used_model = DET_MODEL
    try:
        results = alpr.predict(img_bgr)
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "failed",
            "message": str(exc)[:160],
            "engine": "fastalpr-ship-v1",
        }

    candidates = _candidates_from_results(results, det_source="fastalpr-512")
    try:
        from vehicle_detect import filter_watermark_deadzone

        fh = int(img_bgr.shape[0])
        candidates = filter_watermark_deadzone(candidates, fh)
    except Exception:  # noqa: BLE001
        pass

    # Power crop: if 512 finds nothing, try MIT 384 at lower conf (small / bike / far)
    if not candidates:
        fb = get_fastalpr_fallback()
        if fb is not None:
            try:
                fb_results = fb.predict(img_bgr)
                candidates = _candidates_from_results(fb_results, det_source="fastalpr-384-fb")
                try:
                    from vehicle_detect import filter_watermark_deadzone

                    candidates = filter_watermark_deadzone(candidates, int(img_bgr.shape[0]))
                except Exception:  # noqa: BLE001
                    pass
                if candidates:
                    used_model = FALLBACK_DET
            except Exception:  # noqa: BLE001
                pass

    if not candidates:
        return {
            "ok": False,
            "error": "plate_not_found",
            "engine": "fastalpr-ship-v1",
            "message": "FastALPR found no plate",
            "detModel": used_model,
            "ocrModel": OCR_MODEL,
        }

    with_text = [c for c in candidates if str(c.get("rawText") or "").strip()]
    pool = with_text if with_text else candidates
    pool.sort(
        key=lambda c: (
            float(c.get("conf") or 0),
            float((c.get("det") or {}).get("score") or 0),
        ),
        reverse=True,
    )
    best = pool[0]
    return {
        "ok": True,
        "engine": "fastalpr-ship-v1",
        "rawText": best.get("rawText") or "",
        "conf": best.get("conf") or 0.0,
        "det": best.get("det"),
        "hasDetection": bool(best.get("det")),
        "candidates": candidates[:5],
        "detModel": used_model,
        "ocrModel": OCR_MODEL,
    }


def fastalpr_status() -> dict[str, Any]:
    eng = get_fastalpr()
    fb = get_fastalpr_fallback() if USE_FALLBACK else None
    return {
        "ready": eng is not None,
        "error": _alpr_error,
        "detModel": DET_MODEL,
        "detConf": DET_CONF,
        "fallbackDet": FALLBACK_DET if USE_FALLBACK else None,
        "fallbackReady": fb is not None,
        "fallbackError": _alpr_fb_error,
        "ocrModel": OCR_MODEL,
        "license": "MIT (open-image-models / FastALPR ONNX)",
        "powerCrop": "v1-512",
    }
