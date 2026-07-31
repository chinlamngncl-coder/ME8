"""
MOB-601 ANPR pipeline — ROI detect + OpenCV preprocess + PaddleOCR + region regex + confidence floor.
ANPR-PH-OCR-HARDEN-V1: CLAHE profiles, upscale, main-line band, O/0 variants, harm locks.
Read-only CV core. Does not touch WVP/ZLM routing.
"""
from __future__ import annotations

import os
import re
from typing import Any, Optional

import cv2
import numpy as np

REGION = (os.environ.get("FM_ANPR_REGION") or "ph").strip().lower() or "ph"
# ANPR-FASTALPR-SHIP-DEFAULT-V1 — ship core; set FM_ANPR_ENGINE=paddle for lab hatch only
ANPR_ENGINE = (os.environ.get("FM_ANPR_ENGINE") or "fastalpr").strip().lower() or "fastalpr"
CONF_FLOOR = float(os.environ.get("FM_ANPR_CONF_FLOOR", "0.80") or "0.80")
MEDIAN_K = int(os.environ.get("FM_ANPR_MEDIAN_K", "3") or "3")
if MEDIAN_K % 2 == 0:
    MEDIAN_K += 1
MEDIAN_K = max(3, min(9, MEDIAN_K))
UPSCALE_H = max(40, int(os.environ.get("FM_ANPR_UPSCALE_H", "80") or "80"))
PREPROCESS_MODE = (os.environ.get("FM_ANPR_PREPROCESS") or "auto").strip().lower()
MAIN_LINE_BAND = float(os.environ.get("FM_ANPR_MAIN_LINE_BAND", "0.6") or "0.6")
MAIN_LINE_TRIM_TOP = float(os.environ.get("FM_ANPR_MAIN_LINE_TRIM", "0.08") or "0.08")
DEBUG_ANPR = (os.environ.get("FM_ANPR_DEBUG") or "").strip() in ("1", "true", "yes")
CLAHE_NIGHT = float(os.environ.get("FM_ANPR_CLAHE_NIGHT", "2.0") or "2.0")
CLAHE_YELLOW = float(os.environ.get("FM_ANPR_CLAHE_YELLOW", "1.5") or "1.5")
CLAHE_STANDARD = float(os.environ.get("FM_ANPR_CLAHE_STANDARD", "1.8") or "1.8")

REGION_FINDERS: dict[str, re.Pattern[str]] = {
    "ph": re.compile(r"([A-Z]{3})(\d{3,4})(?!\d)"),
    "kr": re.compile(r"(\d{2,3}[A-Z]{1,2}\d{4})"),
    "th": re.compile(r"(\d{1,3}[A-Z]{1,3}\d{1,4})"),
    "en": re.compile(r"([A-Z0-9]{5,10})"),
}

REGION_TRAILING_TAGS = ("NCR", "NIR", "CAR", "BAR", "ARMM")

ALLOW_OK_SOURCES = frozenset({"opencv", "paddle_line", "yolo", "full_tight", "full_skip", "fastalpr"})

_yolo = None
_yolo_error: Optional[str] = None
_ocr = None
_ocr_error: Optional[str] = None


def _compact_alnum(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def normalize_ph_badge_separators(raw_text: str) -> str:
    """PH centre emblem often OCR as : . · | between letter and digit blocks."""
    t = (raw_text or "").upper()
    t = re.sub(r"([A-Z]{2,3})\s*[:·.•|/\\\-]\s*(\d{2,4})", r"\1 \2", t)
    return t


def _strip_trailing_region_tags(compact: str) -> str:
    for tag in REGION_TRAILING_TAGS:
        if compact.endswith(tag) and len(compact) > len(tag):
            return compact[: -len(tag)]
    return compact


def apply_region_regex(
    raw_text: str,
    region: Optional[str] = None,
    *,
    prefer_3_digit: bool = False,
) -> Optional[str]:
    """MOB-601 Rule 3 — never trust raw OCR string."""
    reg = (region or REGION).lower()
    finder = REGION_FINDERS.get(reg) or REGION_FINDERS["ph"]
    compact = _compact_alnum(normalize_ph_badge_separators(raw_text))
    if not compact:
        return None
    compact = _strip_trailing_region_tags(compact)

    matches = list(finder.finditer(compact))
    if not matches:
        return None
    best = None
    best_score = -1
    for m in matches:
        plate = "".join(m.groups()) if m.lastindex else m.group(0)
        digit_part = m.group(2) if m.lastindex and m.lastindex >= 2 else ""
        score = len(plate) * 10 - m.start()
        if prefer_3_digit and len(digit_part) == 3:
            score += 8
        elif prefer_3_digit and len(digit_part) == 4:
            score -= 4
        if score > best_score:
            best_score = score
            best = plate
    return best


def _ph_letter_digit_variants(compact: str) -> list[str]:
    """Bounded O↔0 / I↔J in letter block — include dual O/0 for W00→WOO class."""
    compact = _compact_alnum(compact)
    if len(compact) < 6:
        return []
    head = list(compact[:3])
    rest = compact[3:]
    out: list[str] = []

    def add(letters: list[str]) -> None:
        cand = "".join(letters) + rest
        if cand not in out:
            out.append(cand)

    add(head)
    # Single substitutions
    for i in range(3):
        for src, dst in (("O", "0"), ("0", "O"), ("I", "J"), ("J", "I")):
            if head[i] == src:
                v = head.copy()
                v[i] = dst
                add(v)
    # Dual O/0 in positions 1–2 (PH emboss: W00 185 → WOO 185)
    if head[0].isalpha() and all(c in "0O" for c in head[1:]):
        for a in ("O", "0"):
            for b in ("O", "0"):
                add([head[0], a, b])
    return [c for c in out if c != compact]


def _candidate_lock_texts(raw_text: str) -> list[str]:
    """ANPR-YELLOW-PUV-LOCK-V1 — ban per line; never poison main line with footer."""
    from plate_roi import BAN_TEXT

    cleaned = normalize_ph_badge_separators(raw_text or "")
    parts = re.split(r"[\n|;]+", cleaned)
    if len(parts) <= 1:
        parts = re.split(r"\s{2,}", cleaned)
    lines: list[str] = []
    for p in parts:
        p = (p or "").strip()
        if not p:
            continue
        if BAN_TEXT.search(p):
            continue
        lines.append(p)
    out: list[str] = []
    for ln in lines:
        if ln not in out:
            out.append(ln)
    if lines:
        joined = " ".join(lines)
        if joined not in out:
            out.append(joined)
    # Last resort: whole string with badge normalize (may still lock if ban only in footer tokens)
    if cleaned and cleaned not in out:
        out.append(cleaned)
    return out


def lock_plate_from_raw(
    raw_text: str,
    region: Optional[str] = None,
    *,
    prefer_3_digit: bool = False,
) -> Optional[str]:
    """Regex lock + bounded O/0; ban filters lines, not the whole blob after lock."""
    for cand in _candidate_lock_texts(raw_text):
        locked = apply_region_regex(cand, region, prefer_3_digit=prefer_3_digit)
        if locked:
            return locked
        compact = _strip_trailing_region_tags(_compact_alnum(cand))
        for variant in _ph_letter_digit_variants(compact):
            locked = apply_region_regex(variant, region, prefer_3_digit=prefer_3_digit)
            if locked:
                return locked
    return None


def _models_dir() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def _plate_weights_path() -> Optional[str]:
    from plate_yolo import plate_weights_paths

    paths = plate_weights_paths()
    return paths.get("onnx") or paths.get("pt")


def get_yolo():
    """Plate YOLO — ONNX first (no torch), else Ultralytics .pt."""
    global _yolo, _yolo_error
    if _yolo is not None:
        return _yolo
    try:
        from plate_yolo import get_plate_yolo, yolo_engine_status

        eng = get_plate_yolo()
        st = yolo_engine_status()
        if eng is None:
            _yolo_error = st.get("error") or "plate_weights_missing"
            return None
        _yolo = eng
        _yolo_error = None
        return _yolo
    except Exception as exc:  # noqa: BLE001
        _yolo_error = str(exc)[:200]
        return None


def get_ocr():
    global _ocr, _ocr_error
    if _ocr is not None:
        return _ocr
    if _ocr_error:
        return None
    try:
        from paddleocr import PaddleOCR

        try:
            _ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        except TypeError:
            _ocr = PaddleOCR(use_textline_orientation=True, lang="en")
        return _ocr
    except Exception as exc:  # noqa: BLE001
        _ocr_error = str(exc)[:200]
        return None


def detect_preprocess_profile(crop_bgr: np.ndarray) -> str:
    if PREPROCESS_MODE in ("night", "yellow_puv", "yellow", "standard"):
        return "yellow_puv" if PREPROCESS_MODE == "yellow" else PREPROCESS_MODE
    if crop_bgr is None or crop_bgr.size == 0 or len(crop_bgr.shape) < 3:
        return "standard"
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    _h, s, v = cv2.split(hsv)
    mean_s = float(np.mean(s))
    mean_v = float(np.mean(v))
    mean_h = float(np.mean(_h))
    bright_ratio = float(np.mean(v > 200))
    if mean_s > 80 and 15 <= mean_h <= 45:
        return "yellow_puv"
    # Night/glare: dark scene with bloom — not bright white plates (high mean_v)
    if mean_v < 90 or (bright_ratio > 0.12 and mean_v < 130):
        return "night"
    return "standard"


def preprocess_plate_bgr(crop_bgr: np.ndarray, profile: Optional[str] = None) -> tuple[np.ndarray, str]:
    """CLAHE + bicubic upscale + medianBlur — never feed raw colour to OCR."""
    if crop_bgr is None or crop_bgr.size == 0:
        raise ValueError("empty_crop")

    prof = profile or detect_preprocess_profile(crop_bgr)
    if len(crop_bgr.shape) == 2:
        bgr = cv2.cvtColor(crop_bgr, cv2.COLOR_GRAY2BGR)
    else:
        bgr = crop_bgr

    if prof == "yellow_puv":
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        gray = hsv[:, :, 2]
    else:
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    ch, cw = gray.shape[:2]
    if ch != UPSCALE_H:
        scale = UPSCALE_H / float(max(1, ch))
        new_w = max(1, int(cw * scale))
        gray = cv2.resize(gray, (new_w, UPSCALE_H), interpolation=cv2.INTER_CUBIC)

    clip = CLAHE_YELLOW if prof == "yellow_puv" else (CLAHE_NIGHT if prof == "night" else CLAHE_STANDARD)
    clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8))
    cleaned = clahe.apply(gray)
    cleaned = cv2.medianBlur(cleaned, MEDIAN_K)
    return cleaned, prof


def yolo_best_plate_crop(img_bgr: np.ndarray) -> tuple[np.ndarray, Optional[dict[str, Any]]]:
    """Best plate YOLO box crop; else full image."""
    model = get_yolo()
    if model is None:
        return img_bgr, None
    try:
        if hasattr(model, "predict_boxes"):
            boxes = model.predict_boxes(img_bgr, conf_thr=0.22)
        else:
            boxes = []
        if not boxes:
            return img_bgr, None
        boxes = sorted(boxes, key=lambda b: ((b["x1"] - b["x0"]) * (b["y1"] - b["y0"]), -b["conf"]))
        b = boxes[0]
        x0, y0, x1, y1 = b["x0"], b["y0"], b["x1"], b["y1"]
        crop = img_bgr[y0:y1, x0:x1]
        meta = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "detConf": round(float(b["conf"]), 4)}
        return crop, meta
    except Exception:  # noqa: BLE001
        return img_bgr, None


def format_display(plate_compact: str) -> str:
    c = _compact_alnum(plate_compact)
    m = re.match(r"^([A-Z]{3})(\d{3,4})$", c)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    return c


def run_paddle(cleaned_gray: np.ndarray) -> tuple[str, float, list[dict[str, Any]]]:
    ocr = get_ocr()
    if ocr is None:
        raise RuntimeError(_ocr_error or "ocr_missing")
    bgr = cv2.cvtColor(cleaned_gray, cv2.COLOR_GRAY2BGR)
    try:
        result = ocr.ocr(bgr, cls=True)
    except TypeError:
        result = ocr.ocr(bgr)

    lines_out: list[dict[str, Any]] = []
    if not result:
        return "", 0.0, lines_out
    lines = result[0] if isinstance(result, list) and result else result
    if lines is None:
        return "", 0.0, lines_out
    if isinstance(lines, dict):
        rec_texts = lines.get("rec_texts") or lines.get("text") or []
        rec_scores = lines.get("rec_scores") or lines.get("score") or []
        for t, s in zip(rec_texts, rec_scores if rec_scores else [0.0] * len(rec_texts)):
            lines_out.append({"text": str(t), "conf": float(s)})
    else:
        for item in lines:
            if not item:
                continue
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                info = item[1]
                if isinstance(info, (list, tuple)) and len(info) >= 2:
                    lines_out.append({"text": str(info[0]), "conf": float(info[1])})
                elif isinstance(info, str):
                    lines_out.append({"text": info, "conf": 0.0})

    from plate_roi import BAN_TEXT

    best_text = ""
    best_conf = 0.0
    best_score = -1.0
    for ln in lines_out:
        text = normalize_ph_badge_separators(ln.get("text") or "")
        conf = float(ln.get("conf") or 0)
        if BAN_TEXT.search(text):
            continue
        letters = re.sub(r"[^A-Za-z]", "", text)
        digits = re.sub(r"[^0-9]", "", text)
        if len(letters) >= 10 and len(digits) == 0:
            continue
        if len(digits) < 2:
            continue
        compact = _compact_alnum(text)
        score = conf
        if re.search(r"[A-Z]{2,3}\d{2,4}", compact):
            score += 0.5
        if apply_region_regex(text):
            score += 1.0
        if score > best_score:
            best_score = score
            best_text = text
            best_conf = conf
    if not best_text and lines_out:
        kept = []
        for ln in lines_out:
            t = normalize_ph_badge_separators(ln.get("text") or "")
            if BAN_TEXT.search(t):
                continue
            if len(re.sub(r"[^0-9]", "", t)) < 1:
                continue
            kept.append({**ln, "text": t})
        if kept:
            # Prefer shortest digit-bearing line (main plate) over slogan join
            kept.sort(key=lambda ln: len(_compact_alnum(ln.get("text") or "")))
            best_text = kept[0]["text"]
            best_conf = float(kept[0].get("conf") or 0)
    return best_text, best_conf, lines_out


def _attach_debug(payload: dict[str, Any], **extra: Any) -> dict[str, Any]:
    if DEBUG_ANPR:
        payload = dict(payload)
        payload["debug"] = {k: v for k, v in extra.items() if v is not None}
    return payload


def _ocr_crop_attempt(
    crop_bgr: np.ndarray,
    *,
    region: Optional[str],
    use_main_band: bool,
) -> tuple[str, float, list[dict[str, Any]], str, str]:
    """Returns raw_text, conf, lines, preprocess_profile, ocr_mode."""
    from plate_roi import main_line_band_crop

    ocr_target = crop_bgr
    ocr_mode = "full"
    if use_main_band:
        band = main_line_band_crop(
            crop_bgr,
            band_frac=MAIN_LINE_BAND,
            trim_top=MAIN_LINE_TRIM_TOP,
        )
        if band is not None and band.size > 0 and band.shape[0] < crop_bgr.shape[0]:
            ocr_target = band
            ocr_mode = "main_band"

    cleaned, prof = preprocess_plate_bgr(ocr_target)
    raw_text, conf01, lines = run_paddle(cleaned)

    if use_main_band and ocr_mode == "main_band" and not lock_plate_from_raw(raw_text, region):
        digit_count = len(re.sub(r"[^0-9]", "", raw_text or ""))
        if digit_count >= 2:
            cleaned_full, prof_full = preprocess_plate_bgr(crop_bgr, profile=prof)
            raw_full, conf_full, lines_full = run_paddle(cleaned_full)
            if lock_plate_from_raw(raw_full, region) or conf_full > conf01:
                return raw_full, conf_full, lines_full, prof_full, "full_fallback_in_tight"

    return raw_text, conf01, lines, prof, ocr_mode


def _try_roi_read(
    img_bgr: np.ndarray,
    roi: dict[str, Any],
    *,
    region: Optional[str],
    engine_tag: str,
    roi_count: int,
    allow_publish: bool,
) -> tuple[Optional[dict[str, Any]], Optional[dict[str, Any]]]:
    """Return (success_payload, fail_candidate)."""
    from plate_roi import crop_passes_hard_gate, crop_roi, looks_like_tight_plate_crop, roi_passes_hard_gate

    fh, fw = img_bgr.shape[:2]
    source = str(roi.get("source") or "")
    if not roi_passes_hard_gate(roi, fw, fh):
        return None, None

    crop = crop_roi(img_bgr, roi)
    if crop is None or crop.size == 0:
        return None, None

    tight = looks_like_tight_plate_crop(img_bgr) or source == "full_tight"
    prof_hint = detect_preprocess_profile(crop)
    # ANPR-YELLOW-PUV-LOCK-V1 — main-band whenever yellow, not only tight full-frame
    use_main_band = prof_hint == "yellow_puv" or (tight and prof_hint == "yellow_puv")
    if source not in ("full_tight", "full_skip", "yolo") and not crop_passes_hard_gate(crop, img_bgr.shape):
        return None, None

    # Wide rear + yellow: also try yellow profile on a mid-lower plate-ish band of this ROI
    try:
        raw_text, conf01, _lines, prof, ocr_mode = _ocr_crop_attempt(
            crop,
            region=region,
            use_main_band=use_main_band,
        )
    except Exception as exc:  # noqa: BLE001
        return None, {"ok": False, "error": "failed", "message": str(exc)[:160]}

    prefer_3 = (prof == "yellow_puv") or (prof_hint == "yellow_puv")
    locked = lock_plate_from_raw(raw_text, region, prefer_3_digit=prefer_3)
    conf_pct = int(round(max(0.0, min(1.0, conf01)) * 100))
    det_meta = {
        "x": roi["x0"],
        "y": roi["y0"],
        "w": roi["x1"] - roi["x0"],
        "h": roi["y1"] - roi["y0"],
        "score": roi.get("score"),
        "source": source,
    }

    fail_base = {
        "confidence": conf_pct,
        "rawText": (raw_text or "")[:200],
        "engine": engine_tag,
        "region": (region or REGION),
        "det": det_meta,
        "preprocessProfile": prof,
        "ocrMode": ocr_mode,
    }

    if conf01 < CONF_FLOOR:
        return None, _attach_crop_array(
            _attach_debug({"ok": False, "error": "low_confidence", **fail_base}, lines=len(_lines)),
            crop,
        )

    if not locked:
        return None, _attach_crop_array(
            _attach_debug({"ok": False, "error": "format_reject", **fail_base}, lines=len(_lines)),
            crop,
        )

    if not allow_publish:
        return None, _attach_crop_array(
            _attach_debug({"ok": False, "error": "format_reject", **fail_base}, blockedSource=source),
            crop,
        )

    if source not in ALLOW_OK_SOURCES:
        return None, _attach_crop_array(
            _attach_debug({"ok": False, "error": "plate_not_found", **fail_base}, blockedSource=source),
            crop,
        )

    ok_payload = _attach_crop_array(
        _attach_debug(
            {
                "ok": True,
                "plate": format_display(locked),
                "plateCompact": locked,
                "confidence": conf_pct,
                "lowConfidence": False,
                "engine": engine_tag,
                "region": (region or REGION),
                "rawText": (raw_text or "")[:200],
                "det": det_meta,
                "roiCount": roi_count,
                "preprocessProfile": prof,
                "ocrMode": ocr_mode,
                "yolo": "on" if source == "yolo" else ("weights_missing" if _yolo_error == "plate_weights_missing" else "off"),
            },
            lines=len(_lines),
        ),
        crop,
    )
    return ok_payload, None


def _det_crop_jpeg_b64(img_bgr: np.ndarray, det: Optional[dict[str, Any]]) -> Optional[str]:
    """Tight plate JPEG (base64) from detector box — crop-first rail, region-agnostic."""
    import base64

    if img_bgr is None or getattr(img_bgr, "size", 0) == 0 or not isinstance(det, dict):
        return None
    try:
        fh, fw = img_bgr.shape[:2]
        x = int(det.get("x") or 0)
        y = int(det.get("y") or 0)
        bw = int(det.get("w") or 0)
        bh = int(det.get("h") or 0)
        if bw < 12 or bh < 8:
            return None
        pad_x = max(2, int(bw * 0.12))
        pad_y = max(2, int(bh * 0.15))
        x0 = max(0, x - pad_x)
        y0 = max(0, y - pad_y)
        x1 = min(fw, x + bw + pad_x)
        y1 = min(fh, y + bh + pad_y)
        if x1 - x0 < 12 or y1 - y0 < 8:
            return None
        crop = img_bgr[y0:y1, x0:x1]
        if crop is None or crop.size == 0:
            return None
        return _ndarray_jpeg_b64(crop)
    except Exception:  # noqa: BLE001
        return None


def _ndarray_jpeg_b64(crop_bgr: np.ndarray) -> Optional[str]:
    import base64

    if crop_bgr is None or getattr(crop_bgr, "size", 0) == 0:
        return None
    try:
        ok, buf = cv2.imencode(".jpg", crop_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        if not ok or buf is None:
            return None
        return base64.b64encode(buf.tobytes()).decode("ascii")
    except Exception:  # noqa: BLE001
        return None


def _attach_crop(payload: dict[str, Any], img_bgr: np.ndarray, det: Optional[dict[str, Any]]) -> dict[str, Any]:
    out = dict(payload or {})
    b64 = _det_crop_jpeg_b64(img_bgr, det)
    if b64:
        out["cropJpegB64"] = b64
        out["hasCrop"] = True
    return out


def _attach_crop_array(payload: dict[str, Any], crop_bgr: np.ndarray) -> dict[str, Any]:
    out = dict(payload or {})
    b64 = _ndarray_jpeg_b64(crop_bgr)
    if b64:
        out["cropJpegB64"] = b64
        out["hasCrop"] = True
    return out


def _attach_vehicle(
    payload: dict[str, Any],
    img_bgr: np.ndarray,
    vehicle_det: Optional[dict[str, Any]],
    plate_det: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    ANPR-LIVE-WHOLE-VEHICLE-CROP-V1 — rail primary = whole-vehicle hull JPEG.
    Never leave only a tight plate scrap as the scene image when a plate box exists.
    """
    out = dict(payload or {})
    try:
        from vehicle_detect import crop_plate_context_bgr, crop_vehicle_bgr

        crop = None
        meta = None
        if vehicle_det:
            crop = crop_vehicle_bgr(img_bgr, vehicle_det)
            meta = {
                "label": vehicle_det.get("label"),
                "score": vehicle_det.get("score"),
                "x": vehicle_det.get("x"),
                "y": vehicle_det.get("y"),
                "w": vehicle_det.get("w"),
                "h": vehicle_det.get("h"),
                "source": "vehicle-hull",
            }
        if crop is None and isinstance(plate_det, dict):
            crop = crop_plate_context_bgr(img_bgr, plate_det)
            meta = {
                "label": "plate-context",
                "score": plate_det.get("score") or plate_det.get("detConf"),
                "x": plate_det.get("x"),
                "y": plate_det.get("y"),
                "w": plate_det.get("w"),
                "h": plate_det.get("h"),
                "source": "plate-hull",
            }
        b64 = _ndarray_jpeg_b64(crop) if crop is not None else None
        if b64:
            out["vehicleJpegB64"] = b64
            out["hasVehicle"] = True
            if meta:
                out["vehicle"] = meta
    except Exception:  # noqa: BLE001
        pass
    return out


def _offset_det(det: Optional[dict[str, Any]], ox: int, oy: int) -> Optional[dict[str, Any]]:
    if not isinstance(det, dict):
        return det
    out = dict(det)
    out["x"] = int(det.get("x") or 0) + int(ox)
    out["y"] = int(det.get("y") or 0) + int(oy)
    return out


def _extract_det_meta(raw: dict[str, Any]) -> Optional[dict[str, Any]]:
    det_meta = raw.get("det") if isinstance(raw.get("det"), dict) else None
    if not det_meta and isinstance(raw.get("candidates"), list):
        for c in raw["candidates"]:
            if isinstance(c, dict) and isinstance(c.get("det"), dict):
                det_meta = c["det"]
                break
    return det_meta


def _finalize_fastalpr_payload(
    img_bgr: np.ndarray,
    raw: dict[str, Any],
    det_meta: Optional[dict[str, Any]],
    *,
    region: Optional[str],
    vehicle_det: Optional[dict[str, Any]],
) -> dict[str, Any]:
    engine_tag = "fastalpr-ship-v1"
    reg = region or REGION

    def finish(payload: dict[str, Any]) -> dict[str, Any]:
        # Plate crop stays secondary; vehicle/plate-hull is rail primary
        return _attach_vehicle(
            _attach_crop(payload, img_bgr, det_meta),
            img_bgr,
            vehicle_det,
            plate_det=det_meta,
        )

    if not raw.get("ok") and not det_meta:
        out = dict(raw)
        out["region"] = reg
        out["engine"] = engine_tag
        # Vehicle-only Live tick (plate miss) — still publish vehicle scene
        if vehicle_det:
            out["error"] = out.get("error") or "plate_not_found"
            out["hasDetection"] = False
            return finish(_attach_debug(out))
        return finish(out)

    text = str(raw.get("rawText") or "")
    conf01 = float(raw.get("conf") or 0)
    conf_pct = int(round(max(0.0, min(1.0, conf01)) * 100))
    prefer_3 = (reg or "").lower() == "ph"
    locked = lock_plate_from_raw(text, reg, prefer_3_digit=prefer_3) if text.strip() else None
    if not isinstance(det_meta, dict):
        det_meta = {"source": "fastalpr"} if det_meta is None and raw.get("ok") else det_meta

    fail_base = {
        "confidence": conf_pct,
        "rawText": text[:200],
        "engine": engine_tag,
        "region": reg,
        "det": det_meta,
        "detModel": raw.get("detModel"),
        "ocrModel": raw.get("ocrModel"),
        "hasDetection": bool(det_meta),
    }

    if not text.strip() or conf01 <= 0:
        return finish(
            _attach_debug({"ok": False, "error": "plate_not_found", **fail_base}),
        )

    if conf01 < CONF_FLOOR:
        return finish(
            _attach_debug({"ok": False, "error": "low_confidence", **fail_base}),
        )
    if not locked:
        return finish(
            _attach_debug({"ok": False, "error": "format_reject", **fail_base}),
        )

    return finish(
        _attach_debug(
            {
                "ok": True,
                "plate": format_display(locked),
                "plateCompact": locked,
                "confidence": conf_pct,
                "lowConfidence": False,
                "engine": engine_tag,
                "region": reg,
                "rawText": text[:200],
                "det": det_meta,
                "detModel": raw.get("detModel"),
                "ocrModel": raw.get("ocrModel"),
                "yolo": "fastalpr",
                "hasDetection": True,
            }
        ),
    )


def _read_plate_fastalpr(
    img_bgr: np.ndarray,
    *,
    region: Optional[str] = None,
) -> dict[str, Any]:
    """
    ANPR-LIVE-VEHICLE-SCENE-PLATE-V1:
    vehicle detect → plate on vehicle ROI(s) + full frame → vehicleJpegB64 + plate crop.
    """
    from fastalpr_engine import read_with_fastalpr
    from vehicle_detect import detect_vehicles, pad_vehicle_box

    fh, fw = img_bgr.shape[:2]
    vehicles: list[dict[str, Any]] = []
    try:
        vehicles = detect_vehicles(img_bgr)
    except Exception:  # noqa: BLE001
        vehicles = []
    best_vehicle = vehicles[0] if vehicles else None

    best_raw: Optional[dict[str, Any]] = None
    best_det: Optional[dict[str, Any]] = None
    best_rank = (-1.0, -1.0)

    # Prefer plate search inside vehicle boxes (cars / bikes / bus / lorry)
    for v in vehicles:
        x0, y0, x1, y1 = pad_vehicle_box(v, fw, fh)
        roi = img_bgr[y0:y1, x0:x1]
        if roi is None or roi.size == 0:
            continue
        try:
            raw = read_with_fastalpr(roi)
        except Exception:  # noqa: BLE001
            continue
        det = _extract_det_meta(raw)
        det = _offset_det(det, x0, y0) if det else None
        text = str(raw.get("rawText") or "").strip()
        conf = float(raw.get("conf") or 0)
        det_score = float((det or {}).get("score") or 0)
        rank = (1.0 if text else 0.0, conf if text else det_score)
        if det is None and not raw.get("ok"):
            continue
        if rank > best_rank:
            best_rank = rank
            best_raw = raw
            best_det = det
            if text and conf > 0:
                break

    # Full-frame plate pass (front/rear when vehicle box weak)
    try:
        full_raw = read_with_fastalpr(img_bgr)
    except Exception:  # noqa: BLE001
        full_raw = {"ok": False, "error": "failed"}
    full_det = _extract_det_meta(full_raw)
    full_text = str(full_raw.get("rawText") or "").strip()
    full_conf = float(full_raw.get("conf") or 0)
    full_rank = (
        1.0 if full_text else 0.0,
        full_conf if full_text else float((full_det or {}).get("score") or 0),
    )
    if full_det is not None or full_raw.get("ok"):
        if best_raw is None or full_rank > best_rank:
            best_raw = full_raw
            best_det = full_det

    if best_raw is None:
        best_raw = full_raw if isinstance(full_raw, dict) else {
            "ok": False,
            "error": "plate_not_found",
            "engine": "fastalpr-ship-v1",
        }

    return _finalize_fastalpr_payload(
        img_bgr,
        best_raw,
        best_det,
        region=region,
        vehicle_det=best_vehicle,
    )


def read_plate_bgr(
    img_bgr: np.ndarray,
    *,
    region: Optional[str] = None,
    skip_yolo: bool = False,
    skip_detect: Optional[bool] = None,
) -> dict[str, Any]:
    """
    Active engine from FM_ANPR_ENGINE (default fastalpr — ship).
    paddle path: YOLO/OpenCV ROI → CLAHE → Paddle → regex → ≥80% (lab hatch).
    """
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return {"ok": False, "error": "bad_file"}

    eng = ANPR_ENGINE
    if eng in ("fastalpr", "fast-alpr", "eval", "ship"):
        return _read_plate_fastalpr(img_bgr, region=region)

    from plate_roi import dedupe_rois, looks_like_tight_plate_crop, merge_detect_rois, roi_area, yellow_hint_roi

    if skip_detect is None:
        skip_detect = bool(skip_yolo)

    if get_ocr() is None:
        return {
            "ok": False,
            "error": "engine_missing",
            "message": (_ocr_error or "PaddleOCR not installed")[:160],
        }

    engine_tag = "mob601-plate-yolo-pack-v1"
    fh, fw = img_bgr.shape[:2]
    rois: list[dict[str, Any]] = []
    if not skip_detect:
        rois = merge_detect_rois(img_bgr, ocr_engine=get_ocr(), yolo_model=get_yolo())
        if not any(str(r.get("source")) == "yolo" for r in rois):
            yh = yellow_hint_roi(img_bgr)
            if yh:
                rois.append(yh)
                rois = dedupe_rois(rois)[:5]

    if not rois and looks_like_tight_plate_crop(img_bgr):
        rois = [{"x0": 0, "y0": 0, "x1": fw, "y1": fh, "score": 0.5, "source": "full_tight"}]
    if not rois and skip_detect:
        rois = [{"x0": 0, "y0": 0, "x1": fw, "y1": fh, "score": 0.1, "source": "full_skip"}]

    if not rois:
        return {
            "ok": False,
            "error": "plate_not_found",
            "engine": engine_tag,
            "region": (region or REGION),
            "message": "No plate region found",
        }

    rois.sort(key=lambda r: (roi_area(r), -float(r.get("score") or 0)))

    best_fail: Optional[dict[str, Any]] = None
    successes: list[dict[str, Any]] = []

    for roi in rois:
        source = str(roi.get("source") or "")
        allow_publish = True
        if source == "full_fallback" and not looks_like_tight_plate_crop(img_bgr):
            allow_publish = False

        ok_payload, fail_cand = _try_roi_read(
            img_bgr,
            roi,
            region=region,
            engine_tag=engine_tag,
            roi_count=len(rois),
            allow_publish=allow_publish,
        )
        if ok_payload:
            successes.append(ok_payload)
        elif fail_cand:
            if best_fail is None or (fail_cand.get("confidence") or 0) > (best_fail.get("confidence") or 0):
                best_fail = fail_cand

    if len(successes) == 1:
        return successes[0]

    if len(successes) > 1:
        compacts = {s.get("plateCompact") for s in successes if s.get("plateCompact")}
        if len(compacts) > 1:
            return _attach_debug(
                {
                    "ok": False,
                    "error": "ambiguous_read",
                    "engine": engine_tag,
                    "region": (region or REGION),
                    "message": "Multiple ROIs disagree on plate text",
                    "candidates": [s.get("plateCompact") for s in successes[:3]],
                },
                roiCount=len(rois),
            )
        return successes[0]

    if looks_like_tight_plate_crop(img_bgr):
        fallback_roi = {"x0": 0, "y0": 0, "x1": fw, "y1": fh, "score": 0.01, "source": "full_fallback"}
        ok_payload, fail_cand = _try_roi_read(
            img_bgr,
            fallback_roi,
            region=region,
            engine_tag=engine_tag,
            roi_count=len(rois) + 1,
            allow_publish=True,
        )
        if ok_payload:
            return ok_payload
        if fail_cand and (best_fail is None or (fail_cand.get("confidence") or 0) > (best_fail.get("confidence") or 0)):
            best_fail = fail_cand

    if best_fail:
        return best_fail
    return {
        "ok": False,
        "error": "plate_not_found",
        "engine": engine_tag,
        "region": (region or REGION),
    }


def read_plate_path(
    path: str,
    *,
    region: Optional[str] = None,
    skip_yolo: bool = False,
    skip_detect: Optional[bool] = None,
) -> dict[str, Any]:
    if not path or not os.path.isfile(path):
        return {"ok": False, "error": "bad_file"}
    img = cv2.imread(path)
    if img is None:
        return {"ok": False, "error": "bad_file", "message": "cannot_decode"}
    return read_plate_bgr(img, region=region, skip_yolo=skip_yolo, skip_detect=skip_detect)


def health_payload() -> dict[str, Any]:
    from fastalpr_engine import fastalpr_status
    from plate_yolo import yolo_engine_status
    from vehicle_detect import vehicle_status

    fa = fastalpr_status()
    vs = vehicle_status()
    yst = yolo_engine_status()
    yolo = get_yolo() if ANPR_ENGINE in ("paddle", "mob601", "yolo") else None
    ocr = get_ocr() if ANPR_ENGINE in ("paddle", "mob601", "yolo") else None

    active_ok = fa["ready"] if ANPR_ENGINE in ("fastalpr", "fast-alpr", "eval", "ship") else (ocr is not None)
    return {
        "ok": active_ok,
        "engine": "fastalpr-ship-v1" if ANPR_ENGINE in ("fastalpr", "fast-alpr", "eval", "ship") else "mob601-plate-yolo-pack-v1",
        "activeEngine": ANPR_ENGINE,
        "region": REGION,
        "confFloor": CONF_FLOOR,
        "medianK": MEDIAN_K,
        "upscaleH": UPSCALE_H,
        "preprocess": PREPROCESS_MODE,
        "fastalpr": "ready" if fa["ready"] else "missing",
        "fastalprError": fa.get("error"),
        "fastalprDet": fa.get("detModel"),
        "fastalprDetConf": fa.get("detConf"),
        "fastalprOcr": fa.get("ocrModel"),
        "fastalprFallbackDet": fa.get("fallbackDet"),
        "fastalprFallbackReady": fa.get("fallbackReady"),
        "powerCrop": "whole-vehicle-crop-v1",
        "detLicense": fa.get("license"),
        "vehicleDetect": "ready" if vs.get("ready") else ("off" if not vs.get("enabled") else "missing"),
        "vehicleError": vs.get("error"),
        "vehicleWeights": vs.get("weights"),
        "ocr": "ready" if ocr is not None else ("idle" if ANPR_ENGINE in ("fastalpr", "fast-alpr", "eval", "ship") else "missing"),
        "ocrError": _ocr_error,
        "detect": "vehicle+fastalpr" if ANPR_ENGINE in ("fastalpr", "fast-alpr", "eval", "ship") else ("yolo-first" if yolo is not None else "opencv+paddle_line"),
        "yolo": "ready" if yolo is not None else ("idle" if ANPR_ENGINE in ("fastalpr", "fast-alpr", "eval", "ship") else "missing"),
        "yoloKind": yst.get("kind"),
        "yoloError": yst.get("error") or _yolo_error,
        "weights": _plate_weights_path(),
        "roi": True,
        "shipDefault": "fastalpr",
        "fastalprShip": "v1",
    }
