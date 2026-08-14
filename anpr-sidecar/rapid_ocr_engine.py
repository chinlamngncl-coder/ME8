"""
RapidOCR (ONNX) — PaddleOCR-compatible text/conf without paddlepaddle/torch.
Safe in the same process as Stage-2 PyTorch YOLO (no shm.dll clash).
"""
from __future__ import annotations

import re
import threading
from typing import Any, Optional

import cv2
import numpy as np

_engine = None
_engine_error: Optional[str] = None
_lock = threading.Lock()


def _ensure_engine():
    global _engine, _engine_error
    if _engine is not None:
        return _engine
    if _engine_error:
        return None
    with _lock:
        if _engine is not None:
            return _engine
        if _engine_error:
            return None
        try:
            from rapidocr_onnxruntime import RapidOCR

            print("[RAPID-OCR] Initializing RapidOCR (onnxruntime)...", flush=True)
            _engine = RapidOCR()
            print("[RAPID-OCR] RapidOCR init OK", flush=True)
            return _engine
        except Exception as exc:  # noqa: BLE001
            _engine_error = str(exc)[:180]
            print("[RAPID-OCR] init fail:", _engine_error, flush=True)
            return None


def _pick_best_lto_text(lines: list[tuple[float, float, str, float]]) -> tuple[str, float]:
    """
    Prefer a single OCR line that passes PH LTO syntax (AAA123 / AAA1234).
    Blind join of bumper + plate was rejecting valid plates (format_reject).
    """
    if not lines:
        return "", 0.0
    try:
        from pipeline import lock_plate_from_raw, validate_lto_plate_syntax
    except Exception:  # noqa: BLE001
        lock_plate_from_raw = None  # type: ignore
        validate_lto_plate_syntax = None  # type: ignore

    best_locked: Optional[tuple[float, str]] = None  # conf, compact_or_disp
    for _y, _x, text, conf in lines:
        locked = None
        if validate_lto_plate_syntax is not None:
            try:
                locked = validate_lto_plate_syntax(text)
            except Exception:  # noqa: BLE001
                locked = None
        if not locked and lock_plate_from_raw is not None:
            try:
                locked = lock_plate_from_raw(text)
            except Exception:  # noqa: BLE001
                locked = None
        if locked:
            if best_locked is None or float(conf) > best_locked[0]:
                best_locked = (float(conf), str(locked))

    if best_locked:
        print(
            f"[RAPID-OCR] best_lto_line={best_locked[1]!r} conf={best_locked[0]:.3f} "
            f"from {len(lines)} line(s)",
            flush=True,
        )
        return best_locked[1], best_locked[0]

    # Last resort: merged string, then PH finder on merge (may recover one plate)
    lines_sorted = sorted(lines, key=lambda t: (round(t[0] / 10.0), t[1]))
    merged = "".join(t[2] for t in lines_sorted)
    highest = max((t[3] for t in lines), default=0.0)
    if merged and lock_plate_from_raw is not None:
        try:
            locked = lock_plate_from_raw(merged)
        except Exception:  # noqa: BLE001
            locked = None
        if locked:
            compact = re.sub(r"[^A-Z0-9]", "", str(locked).upper())
            if re.fullmatch(r"[A-Z]{3}\d{3,4}", compact):
                print(f"[RAPID-OCR] best_lto_from_merge={locked!r} raw_merge={merged!r}", flush=True)
                return str(locked), float(highest)
    return merged, float(highest)


def read_with_rapidocr(plate_crop: np.ndarray) -> dict[str, Any]:
    """Run RapidOCR on plate crop. Returns rawText + conf for the funnel."""
    if plate_crop is None or getattr(plate_crop, "size", 0) == 0:
        print("[RAPID-OCR] skip — empty plate_crop", flush=True)
        return {
            "ok": False,
            "error": "bad_file",
            "rawText": "",
            "conf": 0.0,
            "engine": "rapidocr-onnx",
        }
    ocr = _ensure_engine()
    if ocr is None:
        return {
            "ok": False,
            "error": "rapidocr_missing",
            "message": (_engine_error or "rapidocr-onnxruntime not installed")[:160],
            "rawText": "",
            "conf": 0.0,
            "engine": "rapidocr-onnx",
        }
    print(f"[RAPID-OCR] infer shape={getattr(plate_crop, 'shape', None)}", flush=True)
    try:
        # Stage-2 expanded plate crop: optional light upscale if tiny; no macro / heavy pad.
        img = plate_crop
        h0 = int(img.shape[0]) if img is not None else 0
        w0 = int(img.shape[1]) if img is not None else 0
        if h0 > 0 and h0 < 48:
            scale = 48.0 / float(h0)
            img = cv2.resize(
                img,
                (max(1, int(round(w0 * scale))), 48),
                interpolation=cv2.INTER_CUBIC,
            )
            print(f"[RAPID-OCR] light_upscale shape={getattr(img, 'shape', None)}", flush=True)
        result, _elapse = ocr(img)
    except Exception as exc:  # noqa: BLE001
        print(f"[RAPID-OCR] execution failed: {exc}", flush=True)
        return {
            "ok": False,
            "error": "rapidocr_exc",
            "message": str(exc)[:160],
            "rawText": "",
            "conf": 0.0,
            "engine": "rapidocr-onnx",
        }
    lines: list[tuple[float, float, str, float]] = []  # (y, x, text, conf)
    if result:
        for line in result:
            try:
                if isinstance(line, (list, tuple)) and len(line) >= 3:
                    box, text, conf = line[0], line[1], float(line[2])
                elif isinstance(line, (list, tuple)) and len(line) == 2 and isinstance(line[1], (list, tuple)):
                    box, text, conf = line[0], line[1][0], float(line[1][1])
                else:
                    continue
            except (TypeError, IndexError, ValueError):
                continue
            # Keep Latin letters + digits only (strip CJK e.g. 皖 and other junk)
            cleaned = "".join(ch for ch in str(text or "") if ("A" <= ch <= "Z") or ("a" <= ch <= "z") or ch.isdigit())
            cleaned = cleaned.upper()
            if not cleaned:
                continue
            xs, ys = [], []
            try:
                for pt in box or []:
                    xs.append(float(pt[0]))
                    ys.append(float(pt[1]))
            except (TypeError, IndexError, ValueError):
                pass
            x0 = min(xs) if xs else 0.0
            y0 = min(ys) if ys else 0.0
            lines.append((y0, x0, cleaned, float(conf)))
    detected_text, highest_conf = _pick_best_lto_text(lines)
    print(f"RAW OCR RESULT: {detected_text} | CONFIDENCE: {highest_conf}", flush=True)
    return {
        "ok": bool(detected_text) and highest_conf > 0,
        "rawText": detected_text,
        "plate": detected_text or None,
        "conf": highest_conf,
        "confidence": highest_conf,
        "engine": "rapidocr-onnx",
    }


def rapidocr_status() -> dict[str, Any]:
    eng = _ensure_engine()
    return {
        "ready": eng is not None,
        "error": _engine_error,
        "engine": "rapidocr-onnx",
        "framework": "onnxruntime",
    }
