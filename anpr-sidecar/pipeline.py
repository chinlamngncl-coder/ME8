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
# Live OCR default: FastALPR. Do not load PaddleOCR (host WinError 127 shm.dll).
ANPR_ENGINE = (os.environ.get("FM_ANPR_ENGINE") or "fastalpr").strip().lower() or "fastalpr"
# Live temporary floor — was 0.80 / 0.70 rejecting clean mid-conf reads
CONF_FLOOR = float(os.environ.get("FM_ANPR_CONF_FLOOR", "0.50") or "0.50")
LIVE_CONF_FLOOR = float(os.environ.get("FM_ANPR_LIVE_CONF_FLOOR", "0.50") or "0.50")
MEDIAN_K = int(os.environ.get("FM_ANPR_MEDIAN_K", "3") or "3")
if MEDIAN_K % 2 == 0:
    MEDIAN_K += 1
MEDIAN_K = max(3, min(9, MEDIAN_K))
UPSCALE_H = max(40, int(os.environ.get("FM_ANPR_UPSCALE_H", "80") or "80"))
# SVTR recognition input height — must normalize before PaddleOCR.ocr() (tensor safety)
SVTR_INPUT_H = max(32, min(64, int(os.environ.get("FM_ANPR_SVTR_H", "48") or "48")))
OCR_CONF_FLOOR = float(os.environ.get("FM_ANPR_OCR_CONF_FLOOR", "0.50") or "0.50")
# Hatch: FM_ANPR_STRICT_REGEX=1 restores hard country lock (reject if no regex hit)
STRICT_REGEX = (os.environ.get("FM_ANPR_STRICT_REGEX") or "0").strip().lower() in (
    "1", "true", "yes", "on",
)
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

# LTO / PH standard plate — emit gate (ANPR-DECAL-GLARE-SYNTAX-V1)
PLATE_REGEX = re.compile(r"^[A-Z]{3}\s?\d{3,4}$")
# Fallback formats (compact, no space) — always 3 letters + 3–4 digits (len 6–7)
PLATE_REGEX_FALLBACKS: tuple[re.Pattern[str], ...] = (
    PLATE_REGEX,
    re.compile(r"^[A-Z]{3}\d{3,4}$"),
)

REGION_TRAILING_TAGS = ("NCR", "NIR", "CAR", "BAR", "ARMM")

ALLOW_OK_SOURCES = frozenset({"opencv", "paddle_line", "yolo", "full_tight", "full_skip", "fastalpr"})

_yolo = None
_yolo_error: Optional[str] = None
_ocr = None
_ocr_error: Optional[str] = None


def _compact_alnum(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def _json_safe(obj: Any) -> Any:
    """
    FastAPI/Pydantic JSON boundary — never leave numpy.ndarray / np scalars in responses.
    Arrays → .tolist(); np.float32/int64 → float()/int(); drop huge image buffers.
    """
    if obj is None or isinstance(obj, (str, bool)):
        return obj
    if isinstance(obj, (bytes, bytearray)):
        return None
    if isinstance(obj, np.ndarray):
        # Image buffers must not enter JSON (use JPEG b64 paths instead)
        if obj.ndim >= 2 and obj.size > 64:
            return None
        try:
            return obj.tolist()
        except Exception:  # noqa: BLE001
            return None
    if isinstance(obj, np.generic):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.bool_):
            return bool(obj)
        try:
            return obj.item()
        except Exception:  # noqa: BLE001
            return str(obj)
    if isinstance(obj, float):
        return float(obj)
    if isinstance(obj, int):
        return int(obj)
    if isinstance(obj, dict):
        out: dict[str, Any] = {}
        for k, v in obj.items():
            # Internal CV buffers — never serialize
            if k in ("uiMicro", "uiMacro", "nativeMicro", "micro", "warped"):
                continue
            safe = _json_safe(v)
            if safe is not None or v is None:
                out[k] = safe
        return out
    if isinstance(obj, (list, tuple)):
        return [_json_safe(x) for x in obj]
    # Torch / other tensors with .tolist
    if hasattr(obj, "tolist") and not isinstance(obj, (str, bytes)):
        try:
            return _json_safe(obj.tolist())
        except Exception:  # noqa: BLE001
            return str(obj)[:120]
    return obj


def _pop_cv_buffers(payload: dict[str, Any]) -> dict[str, Any]:
    """Remove ndarray image keys before payload mapping / FastAPI return."""
    if not isinstance(payload, dict):
        return payload
    for k in ("uiMicro", "uiMacro", "nativeMicro", "micro", "warped"):
        payload.pop(k, None)
    return payload


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


def soft_plate_from_raw(
    raw_text: str,
    region: Optional[str] = None,
    *,
    prefer_3_digit: bool = False,
) -> Optional[str]:
    """
    Live lock — LTO syntax only (no slogan / decal / glare hallucinations).
    Emits only strings matching PLATE_REGEX (or region lock / fallbacks).
    """
    return validate_lto_plate_syntax(
        raw_text, region=region, prefer_3_digit=prefer_3_digit
    )


def passes_emit_length_alpha_guard(repaired_text: str) -> bool:
    """
    Seal short/junk leaks (POZ71, NHK5):
      clean_length must be 6 or 7; first 3 chars must be A–Z after positional repair.
    """
    repaired = (repaired_text or "").upper()
    clean = re.sub(r"[^A-Z0-9]", "", repaired)
    clean_length = len(clean.replace(" ", ""))
    if clean_length < 6 or clean_length > 7:
        return False
    if len(clean) < 3 or not re.match(r"^[A-Z]{3}", clean):
        return False
    return True


def validate_lto_plate_syntax(
    raw_text: str,
    region: Optional[str] = None,
    *,
    prefer_3_digit: bool = False,
) -> Optional[str]:
    """
    Strict emit gate: PLATE_REGEX /^[A-Z]{3}\\s?\\d{3,4}$/ (+ fallbacks / region lock).
    Rejects SEBASTIAN / SEBAXYIN / M3W111 / POZ71 / NHK5 / truncated junk.
    """
    if not (raw_text or "").strip():
        return None
    reg = (region or REGION).lower()

    def _disp(compact: str) -> str:
        c = _compact_alnum(compact)
        m = re.match(r"^([A-Z]{3})(\d{3,4})$", c)
        if m:
            return f"{m.group(1)} {m.group(2)}"
        return c

    def _accept(compact: str) -> Optional[str]:
        c = _compact_alnum(compact)
        if not c:
            return None
        # Length + alpha head guard — AFTER strip spaces/specials
        if not passes_emit_length_alpha_guard(c):
            return None
        # First 3 strictly alphabetic (reject digit bleed into letter slots)
        if not re.match(r"^[A-Z]{3}\d{3,4}$", c):
            if reg == "ph":
                return None
        return c

    # Prefer country lock first (PH finder = LLL### / LLL####)
    locked = lock_plate_from_raw(raw_text, reg, prefer_3_digit=prefer_3_digit)
    if locked:
        compact = _compact_alnum(locked)
        disp = _disp(locked)
        if any(rx.match(disp) or rx.match(compact) for rx in PLATE_REGEX_FALLBACKS):
            return _accept(compact)
        # Non-PH region locks — still enforce length 6–7 + alpha head when alnum
        if reg != "ph":
            return _accept(compact) or (compact if passes_emit_length_alpha_guard(compact) else None)
    if STRICT_REGEX and reg == "ph":
        return None
    for cand in _candidate_lock_texts(raw_text):
        t = normalize_ph_badge_separators(cand).upper().strip()
        t = re.sub(r"\s+", " ", t)
        compact = _strip_trailing_region_tags(_compact_alnum(t))
        for rx in PLATE_REGEX_FALLBACKS:
            if rx.match(t) or rx.match(compact):
                m = re.fullmatch(r"([A-Z]{3})(\d{3,4})", compact)
                if m:
                    return _accept(m.group(1) + m.group(2))
                return _accept(compact)
    return None


def unclear_syntax_reject(raw_text: str = "", *, error: str = "syntax_reject") -> dict[str, Any]:
    """Node-facing UNCLEAR payload when OCR text fails LTO syntax."""
    return {
        "ok": False,
        "unclear": True,
        "plate": None,
        "plateCompact": None,
        "plateText": "UNCLEAR",
        "rawText": (raw_text or "")[:200],
        "error": error,
        "reviewStatus": "Unclear / Manual Review",
    }


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
    """PP-OCRv4 + SVTR recognition (Stage 3 sequence OCR)."""
    global _ocr, _ocr_error
    if _ocr is not None:
        return _ocr
    if _ocr_error:
        return None
    try:
        from paddleocr import PaddleOCR

        # Prefer PP-OCRv4 / SVTR; fall back through API variants across paddleocr 2.x
        attempts = [
            dict(use_angle_cls=True, lang="en", show_log=False, ocr_version="PP-OCRv4", rec_algorithm="SVTR_LCNet"),
            dict(use_angle_cls=True, lang="en", show_log=False, ocr_version="PP-OCRv4"),
            dict(use_textline_orientation=True, lang="en", ocr_version="PP-OCRv4"),
            dict(use_angle_cls=True, lang="en", show_log=False),
            dict(use_textline_orientation=True, lang="en"),
        ]
        last_err = None
        for kwargs in attempts:
            try:
                _ocr = PaddleOCR(**kwargs)
                return _ocr
            except TypeError as exc:
                last_err = exc
                continue
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                continue
        _ocr_error = str(last_err or "paddleocr_init_failed")[:200]
        return None
    except Exception as exc:  # noqa: BLE001
        _ocr_error = str(exc)[:200]
        return None


def read_with_ppocrv4(img_bgr: np.ndarray) -> dict[str, Any]:
    """
    Stage 3 — PP-OCRv4 (SVTR) on a DEEP COPY of the micro-crop.
    Caller UI uint8 buffer is never resized/normalized in place.
    Failures → unclear + traceback on sidecar console.
    """
    unclear_fail = {
        "ok": False,
        "unclear": True,
        "reviewStatus": "Unclear / Manual Review",
        "engine": "pp-ocrv4",
        "ocrModel": "PP-OCRv4-SVTR",
    }
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return {**unclear_fail, "error": "bad_file"}
    if get_ocr() is None:
        print("[anpr-ppocrv4] engine_missing:", _ocr_error or "PaddleOCR not installed", flush=True)
        return {
            **unclear_fail,
            "error": "engine_missing",
            "message": (_ocr_error or "PaddleOCR not installed")[:160],
        }
    # Inference-only deep copy (UI keeps the original uint8 crop)
    work = _ensure_ui_uint8(img_bgr)
    if work is None:
        return {**unclear_fail, "error": "bad_file", "message": "ui_uint8_copy_failed"}
    try:
        raw_text, conf01, lines, prof, ocr_mode = _ocr_crop_attempt(
            work, region=REGION, use_main_band=True
        )
    except Exception as exc:  # noqa: BLE001
        import traceback
        print("[anpr-ppocrv4] OCR exception:", repr(exc), flush=True)
        traceback.print_exc()
        return {
            **unclear_fail,
            "error": "ocr_exception",
            "message": str(exc)[:220],
        }
    text = str(raw_text or "").strip()
    conf = float(conf01 or 0)
    # Mandate: conf < 0.70 → Unclear; otherwise pass detected string to UI
    if not text or conf < OCR_CONF_FLOOR:
        print(
            f"[anpr-ppocrv4] Unclear — text={text!r} conf={conf:.3f} floor={OCR_CONF_FLOOR}",
            flush=True,
        )
        return {
            **unclear_fail,
            "error": "low_confidence" if text else "plate_not_found",
            "rawText": text,
            "conf": conf,
            "preprocess": prof,
            "ocrMode": ocr_mode,
            "lines": lines,
            "det": {
                "x": 0,
                "y": 0,
                "w": int(img_bgr.shape[1]),
                "h": int(img_bgr.shape[0]),
                "score": conf,
                "source": "pp-ocrv4-strip",
            },
        }
    return {
        "ok": True,
        "rawText": text,
        "conf": conf,
        "engine": "pp-ocrv4",
        "ocrModel": "PP-OCRv4-SVTR",
        "preprocess": prof,
        "ocrMode": ocr_mode,
        "lines": lines,
        "unclear": False,
        "det": {
            "x": 0,
            "y": 0,
            "w": int(img_bgr.shape[1]),
            "h": int(img_bgr.shape[0]),
            "score": conf,
            "source": "pp-ocrv4-strip",
        },
    }


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


def _resize_for_svtr(img_bgr: np.ndarray, target_h: int = SVTR_INPUT_H) -> np.ndarray:
    """
    Resize inference buffer to SVTR height (48). Always returns a NEW array —
    never mutates the UI uint8 micro-crop.
    """
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return img_bgr
    h, w = img_bgr.shape[:2]
    if h <= 0 or w <= 0:
        return img_bgr
    if h == target_h:
        return np.ascontiguousarray(img_bgr).copy()
    scale = float(target_h) / float(h)
    new_w = max(8, int(round(w * scale)))
    max_w = int(os.environ.get("FM_ANPR_SVTR_MAX_W", "640") or "640")
    if new_w > max_w:
        new_w = max_w
    interp = cv2.INTER_AREA if h > target_h else cv2.INTER_CUBIC
    return cv2.resize(img_bgr, (new_w, target_h), interpolation=interp)


def _parse_paddle_ocr_results(results: Any) -> tuple[str, float, list[dict[str, Any]]]:
    """
    PaddleOCR v4 classic shape:
      results = ocr.ocr(img, cls=True)
      for line in results[0]:
          box, (text, confidence) = line
    Also tolerates dict / OCRResult rec_texts variants.
    Picks the highest-confidence line as detected_text.
    """
    lines_out: list[dict[str, Any]] = []
    detected_text = ""
    max_conf = 0.0

    if results is None:
        return "", 0.0, lines_out

    # Newer paddleocr may return [OCRResult] or dict-like
    if isinstance(results, dict):
        rec_texts = results.get("rec_texts") or results.get("text") or []
        rec_scores = results.get("rec_scores") or results.get("score") or []
        for t, s in zip(rec_texts, rec_scores if rec_scores else [0.0] * len(rec_texts)):
            conf = float(s or 0)
            text = str(t or "").strip()
            if not text:
                continue
            lines_out.append({"text": text, "conf": conf})
            if conf > max_conf:
                max_conf = conf
                detected_text = text
        return detected_text, max_conf, lines_out

    if not isinstance(results, (list, tuple)) or not results:
        return "", 0.0, lines_out

    page0 = results[0]
    if page0 is None:
        return "", 0.0, lines_out

    # OCRResult object with attributes
    if hasattr(page0, "rec_texts") or (isinstance(page0, dict) and ("rec_texts" in page0 or "text" in page0)):
        obj = page0 if not isinstance(page0, dict) else page0
        if isinstance(obj, dict):
            rec_texts = obj.get("rec_texts") or obj.get("text") or []
            rec_scores = obj.get("rec_scores") or obj.get("score") or []
        else:
            rec_texts = getattr(obj, "rec_texts", None) or getattr(obj, "text", None) or []
            rec_scores = getattr(obj, "rec_scores", None) or getattr(obj, "score", None) or []
        for t, s in zip(list(rec_texts), list(rec_scores) if rec_scores is not None else [0.0] * len(list(rec_texts))):
            conf = float(s or 0)
            text = str(t or "").strip()
            if not text:
                continue
            lines_out.append({"text": text, "conf": conf})
            if conf > max_conf:
                max_conf = conf
                detected_text = text
        return detected_text, max_conf, lines_out

    # Mandated nested list: [[box, (text, conf)], ...]
    try:
        for line in page0:
            if not line:
                continue
            text = ""
            conf = 0.0
            try:
                # box, (text, confidence) = line
                _box, info = line[0], line[1]
                if isinstance(info, (list, tuple)) and len(info) >= 2:
                    text = str(info[0] or "").strip()
                    conf = float(info[1] or 0)
                elif isinstance(info, str):
                    text = info.strip()
                    conf = 0.0
                elif isinstance(info, dict):
                    text = str(info.get("text") or "").strip()
                    conf = float(info.get("score") or info.get("confidence") or 0)
            except (TypeError, ValueError, IndexError):
                # Alternate: line is already (text, conf)
                if isinstance(line, (list, tuple)) and len(line) >= 2 and isinstance(line[0], str):
                    text = str(line[0] or "").strip()
                    conf = float(line[1] or 0)
                else:
                    continue
            if not text:
                continue
            lines_out.append({"text": text, "conf": conf})
            if conf > max_conf:
                max_conf = conf
                detected_text = text
    except TypeError:
        # page0 not iterable — last resort stringify
        pass

    return detected_text, max_conf, lines_out


def run_paddle(cleaned_gray: np.ndarray) -> tuple[str, float, list[dict[str, Any]]]:
    ocr = get_ocr()
    if ocr is None:
        raise RuntimeError(_ocr_error or "ocr_missing")
    if cleaned_gray is None or getattr(cleaned_gray, "size", 0) == 0:
        return "", 0.0, []
    if len(cleaned_gray.shape) == 2:
        bgr = cv2.cvtColor(cleaned_gray, cv2.COLOR_GRAY2BGR)
    else:
        bgr = cleaned_gray
    bgr = _resize_for_svtr(bgr, SVTR_INPUT_H)
    try:
        results = ocr.ocr(bgr, cls=True)
    except TypeError:
        try:
            results = ocr.ocr(bgr)
        except Exception as exc:  # noqa: BLE001
            import traceback
            print("[anpr-ppocrv4] run_paddle ocr() failed:", repr(exc),
                  "shape=", getattr(bgr, "shape", None), flush=True)
            traceback.print_exc()
            raise
    except Exception as exc:  # noqa: BLE001
        import traceback
        print("[anpr-ppocrv4] run_paddle ocr() failed:", repr(exc),
              "shape=", getattr(bgr, "shape", None), flush=True)
        traceback.print_exc()
        raise

    detected_text, max_conf, lines_out = _parse_paddle_ocr_results(results)
    if detected_text:
        detected_text = normalize_ph_badge_separators(detected_text)
        print(
            f"[anpr-ppocrv4] parsed text={detected_text!r} conf={max_conf:.3f} lines={len(lines_out)}",
            flush=True,
        )
    else:
        print(f"[anpr-ppocrv4] parse empty — raw type={type(results).__name__}", flush=True)
    return detected_text, max_conf, lines_out


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


def _ensure_ui_uint8(img_bgr: np.ndarray) -> Optional[np.ndarray]:
    """
    Deep-copy contiguous uint8 BGR for UI / DB / magnifier.
    Never returns a shared view of an OCR tensor / normalized buffer.
    """
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return None
    try:
        arr = np.ascontiguousarray(img_bgr)
        if arr.dtype != np.uint8:
            if np.issubdtype(arr.dtype, np.floating):
                mx = float(np.max(arr)) if arr.size else 0.0
                if mx <= 1.5:
                    arr = (np.clip(arr, 0.0, 1.0) * 255.0).astype(np.uint8)
                else:
                    arr = np.clip(arr, 0.0, 255.0).astype(np.uint8)
            else:
                arr = np.clip(arr, 0, 255).astype(np.uint8)
        # Independent buffer — OCR may mutate its own copy later
        return arr.copy()
    except Exception:  # noqa: BLE001
        return None


def _ndarray_jpeg_b64(crop_bgr: np.ndarray) -> Optional[str]:
    import base64

    ui = _ensure_ui_uint8(crop_bgr)
    if ui is None:
        return None
    try:
        ok, buf = cv2.imencode(".jpg", ui, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
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
    """Attach UI micro-crop from raw uint8 only (never SVTR-resized OCR buffer)."""
    out = dict(payload or {})
    b64 = _ndarray_jpeg_b64(crop_bgr)
    if b64:
        out["cropJpegB64"] = b64
        out["hasCrop"] = True
        out["uiCropUint8"] = True
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
                # Stage-2 MMR: classify macro-crop before Stage-3 consumers use coords
                try:
                    from vehicle_mmr import classify_vehicle_mmr

                    mmr = classify_vehicle_mmr(crop, meta.get("label"))
                    meta["make"] = mmr.get("make")
                    meta["model"] = mmr.get("model")
                    meta["color"] = mmr.get("color")
                    meta["mmrText"] = mmr.get("mmrText")
                    meta["mmrEngine"] = mmr.get("engine")
                    out["mmr"] = {
                        "make": mmr.get("make"),
                        "model": mmr.get("model"),
                        "color": mmr.get("color"),
                        "mmrText": mmr.get("mmrText"),
                        "engine": mmr.get("engine"),
                    }
                except Exception:  # noqa: BLE001
                    pass
                # Keyframe sharpness (Laplacian variance) for best-frame selection
                try:
                    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                    sharp = float(cv2.Laplacian(gray, cv2.CV_64F).var())
                    meta["sharpness"] = sharp
                    out["sharpness"] = sharp
                except Exception:  # noqa: BLE001
                    pass
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
    engine_tag = str(raw.get("engine") or "pp-ocrv4")
    reg = region or REGION

    def finish(payload: dict[str, Any]) -> dict[str, Any]:
        # Plate crop stays secondary; vehicle/plate-hull is rail primary
        attached = _attach_vehicle(
            _attach_crop(payload, img_bgr, det_meta),
            img_bgr,
            vehicle_det,
            plate_det=det_meta,
        )
        return _json_safe(attached)

    if not raw.get("ok") and not det_meta:
        out = dict(raw)
        _pop_cv_buffers(out)
        out["region"] = reg
        out["engine"] = engine_tag
        # Vehicle-only Live tick (plate miss) — still publish vehicle scene
        if vehicle_det:
            out["error"] = out.get("error") or "plate_not_found"
            out["hasDetection"] = False
            return finish(_attach_debug(_json_safe(out)))
        return finish(_json_safe(out))

    text = str(raw.get("rawText") or "")
    conf01 = float(raw.get("conf") or 0)
    # FastALPR sometimes returns 0–100; normalize to 0–1 for floor checks
    if conf01 > 1.0:
        conf01 = conf01 / 100.0
    conf_pct = int(round(max(0.0, min(1.0, conf01)) * 100))
    prefer_3 = (reg or "").lower() == "ph"
    print(f"RAW OCR RESULT: {text} | CONFIDENCE: {conf01}", flush=True)
    locked = validate_lto_plate_syntax(text, reg, prefer_3_digit=prefer_3) if text.strip() else None
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
        "plateText": "UNCLEAR",
    }

    if not text.strip() or len(re.sub(r"[^A-Za-z0-9]", "", text)) < 3:
        print(
            f"[ANPR-OCR] pipeline silent drop empty/short text={text!r} conf={conf01}",
            flush=True,
        )
        return finish(
            _attach_debug({
                "ok": False,
                "drop": True,
                "unclear": False,
                "error": "ocr_empty_or_short",
                "plate": None,
                "plateCompact": None,
                "plateText": None,
                "confidence": conf_pct,
                "rawText": (text or "")[:200],
                "engine": engine_tag,
                "region": reg,
                "det": det_meta,
                "hasDetection": bool(det_meta),
            }),
        )

    # Live / dual path: 0.50 floor (was 0.70–0.80)
    ocr_path = str(raw.get("ocrPath") or "").lower()
    floor = LIVE_CONF_FLOOR if ocr_path == "live" or "dual" in engine_tag.lower() else CONF_FLOOR
    if conf01 < floor and not (isinstance(raw.get("dual"), dict) and raw.get("ok")):
        return finish(
            _attach_debug({
                "ok": False,
                "unclear": True,
                "reviewStatus": "Unclear / Manual Review",
                "error": "low_confidence",
                "plate": None,
                "plateCompact": None,
                **fail_base,
            }),
        )

    # Prefer dual-locked compact only if it still passes LTO syntax
    dual_plate = str(raw.get("plateCompact") or raw.get("plate") or "").strip()
    dual_ok = validate_lto_plate_syntax(dual_plate, reg, prefer_3_digit=prefer_3) if dual_plate else None
    plate_compact = locked or dual_ok
    if plate_compact:
        plate_compact = _compact_alnum(plate_compact)
    # Syntax fail → UNCLEAR (never emit SEBAXYIN / M3W111 / truncated junk)
    if not plate_compact or not validate_lto_plate_syntax(plate_compact, reg, prefer_3_digit=prefer_3):
        return finish(
            _attach_debug({
                "ok": False,
                "unclear": True,
                "reviewStatus": "Unclear / Manual Review",
                "error": "syntax_reject",
                "plate": None,
                "plateCompact": None,
                **fail_base,
            }),
        )

    out_ok = {
        "ok": True,
        "plate": format_display(plate_compact),
        "plateCompact": plate_compact,
        "plateText": format_display(plate_compact),
        "confidence": conf_pct,
        "lowConfidence": conf01 < 0.70,
        "engine": engine_tag,
        "region": reg,
        "rawText": text[:200],
        "det": det_meta,
        "detModel": raw.get("detModel"),
        "ocrModel": raw.get("ocrModel"),
        "yolo": "fastalpr",
        "hasDetection": True,
        "unclear": False,
    }
    if isinstance(raw.get("dual"), dict):
        out_ok["dual"] = raw["dual"]
        out_ok["temporalLocked"] = bool(raw["dual"].get("temporalLocked"))
    return finish(_attach_debug(out_ok))


def _stamp_frame_uuid(payload: dict[str, Any], pre: dict[str, Any]) -> dict[str, Any]:
    """Stamp Frame_UUID + sharpness onto every Macro/Micro/OCR output from one ingest."""
    if not isinstance(payload, dict):
        return payload
    out = dict(payload)
    fid = pre.get("frameUuid")
    if fid:
        out["frameUuid"] = fid
    if pre.get("sharpness") is not None and out.get("sharpness") is None:
        out["sharpness"] = pre.get("sharpness")
    if pre.get("blurFloor") is not None:
        out["blurFloor"] = pre.get("blurFloor")
    if pre.get("fisheye") is not None:
        out["fisheye"] = pre.get("fisheye")
    return out


def _read_plate_fastalpr(
    img_bgr: np.ndarray,
    *,
    region: Optional[str] = None,
    path: Optional[str] = None,
) -> dict[str, Any]:
    """
    Cascaded double-crop:
      Stage 1/2 — YOLO vehicle macro on full-res (native) frame
      Stage 3 — CCPD pose micro → path-routed OCR (default heavy for /read).
    No global-frame OCR.
    """
    ocr_path = path or "heavy"
    from vehicle_detect import VEHICLE_CLASS_IDS, detect_vehicles, pad_vehicle_box

    # Always operate on the caller's buffer (already native after preprocess)
    native = img_bgr
    fh, fw = native.shape[:2]
    vehicles: list[dict[str, Any]] = []
    try:
        vehicles = detect_vehicles(native)
    except Exception:  # noqa: BLE001
        vehicles = []

    vehicles = [
        v for v in vehicles
        if int(v.get("cls") if v.get("cls") is not None else -1) in VEHICLE_CLASS_IDS
        or str(v.get("label") or "").lower() in ("car", "truck", "bus", "motorcycle", "bicycle")
    ]
    if not vehicles:
        # Snapshot / Offline often upload bumper or plate crops (no full car).
        # Still run Stage-2 → RapidOCR on the whole image as a synthetic macro.
        print(
            "[ANPR-STATIC] no_vehicle — fallback plate OCR on full frame (snapshot crop)",
            flush=True,
        )
        try:
            from dual_lpr import cascade_plate_from_vehicle_macro

            raw = cascade_plate_from_vehicle_macro(
                native,
                track_id=None,
                vehicle_origin=(0, 0),
                path=ocr_path,
            )
        except Exception as exc:  # noqa: BLE001
            import traceback

            print("[anpr-dual] static no_vehicle cascade fail:", repr(exc), flush=True)
            traceback.print_exc()
            return {
                "ok": False,
                "error": "no_vehicle",
                "engine": "dual-lpr-v1",
                "region": region or REGION,
                "message": "No vehicle detected — cascaded plate OCR skipped",
                "hasDetection": False,
                "cascade": "vehicle-required",
            }
        ui_micro = raw.pop("uiMicro", None) if isinstance(raw, dict) else None
        if isinstance(raw, dict):
            raw.pop("uiMacro", None)
            raw.pop("nativeMicro", None)
            _pop_cv_buffers(raw)
        det = _extract_det_meta(raw)
        out = _finalize_fastalpr_payload(
            native,
            raw if isinstance(raw, dict) else {"ok": False, "error": "plate_not_found"},
            det,
            region=region,
            vehicle_det=None,
        )
        if isinstance(ui_micro, np.ndarray) and ui_micro.size > 0:
            out = _attach_crop_array(out, _ensure_ui_uint8(ui_micro))
        out["cascade"] = "static-fullframe-fallback"
        return out

    best_vehicle = vehicles[0]
    best_raw: Optional[dict[str, Any]] = None
    best_det: Optional[dict[str, Any]] = None
    best_rank = (-1.0, -1.0)
    best_wpod_meta: Optional[dict[str, Any]] = None
    best_warped: Optional[np.ndarray] = None
    best_native_micro: Optional[np.ndarray] = None

    for v in vehicles:
        # Macro-crop from full-resolution native buffer (coords mapped from YOLO letterbox)
        x0, y0, x1, y1 = pad_vehicle_box(v, fw, fh)
        macro = native[y0:y1, x0:x1]
        if macro is None or macro.size == 0:
            continue

        try:
            from dual_lpr import cascade_plate_from_vehicle_macro
            raw = cascade_plate_from_vehicle_macro(
                macro,
                track_id=None,
                vehicle_origin=(x0, y0),
                path=ocr_path,
            )
        except Exception as exc:  # noqa: BLE001
            import traceback
            print("[anpr-dual] cascade wrap exception:", repr(exc), flush=True)
            traceback.print_exc()
            raw = {
                "ok": False,
                "unclear": True,
                "reviewStatus": "Unclear / Manual Review",
                "error": "ocr_exception",
                "message": str(exc)[:220],
                "engine": "dual-lpr-v1",
            }

        ui_micro = raw.pop("uiMicro", None) if isinstance(raw, dict) else None
        if isinstance(raw, dict):
            raw.pop("uiMacro", None)
            raw.pop("nativeMicro", None)
            _pop_cv_buffers(raw)
        warped = None
        wpod_meta = raw.get("wpod") if isinstance(raw, dict) else None
        if isinstance(ui_micro, np.ndarray) and ui_micro.size > 0:
            ui_micro = _ensure_ui_uint8(ui_micro)

        det = _extract_det_meta(raw) or (wpod_meta.get("det") if isinstance(wpod_meta, dict) else None)
        if isinstance(det, dict) and not det.get("absolute"):
            det = _offset_det(det, x0, y0)
        text = str(raw.get("rawText") or raw.get("plate") or "").strip()
        conf = float(raw.get("conf") or 0)
        det_score = float((det or {}).get("score") or 0)
        rank = (1.0 if text else 0.0, conf if text else det_score)
        if det is None and not raw.get("ok") and not raw.get("unclear"):
            continue
        if rank > best_rank or (best_raw is None):
            best_rank = rank
            best_raw = raw
            best_det = det
            best_vehicle = v
            best_wpod_meta = wpod_meta if isinstance(wpod_meta, dict) else None
            best_warped = warped
            best_native_micro = ui_micro
            if text and conf > 0 and raw.get("ok"):
                break

    if best_raw is None:
        best_raw = {
            "ok": False,
            "unclear": True,
            "reviewStatus": "Unclear / Manual Review",
            "error": "plate_not_found",
            "engine": "dual-lpr-v1",
            "message": "Cascaded crop-in-crop found no plate inside vehicle",
        }

    out = _finalize_fastalpr_payload(
        native,
        best_raw,
        best_det,
        region=region,
        vehicle_det=best_vehicle,
    )
    # UI micro-crop = untouched uint8 (never SVTR-resized)
    if best_native_micro is not None and getattr(best_native_micro, "size", 0) > 0:
        out = _attach_crop_array(out, best_native_micro)
    elif best_warped is not None:
        out = _attach_crop_array(out, best_warped)
    if best_wpod_meta:
        out["wpod"] = {
            "source": best_wpod_meta.get("source"),
            "pad": best_wpod_meta.get("pad"),
            "architecture": best_wpod_meta.get("architecture") or "wpod-double-crop-v1",
            "outW": best_wpod_meta.get("outW"),
            "outH": best_wpod_meta.get("outH"),
        }
    out["ocrModel"] = best_raw.get("ocrModel") or (
        "dual-FastALPR+HyperLPR3" if ocr_path == "heavy" else "FastALPR-live-fast-path"
    )
    out["ocrPath"] = best_raw.get("ocrPath") or ocr_path
    out["engine"] = best_raw.get("engine") or out.get("engine") or "dual-lpr-v1"
    if isinstance(best_raw.get("dual"), dict):
        out["dual"] = best_raw["dual"]
    if best_raw.get("unclear") or not best_raw.get("ok"):
        out["unclear"] = True
        out["reviewStatus"] = best_raw.get("reviewStatus") or "Unclear / Manual Review"
        out["ocrError"] = best_raw.get("error") or "plate_not_found"
    return out


def read_plate_bgr(
    img_bgr: np.ndarray,
    *,
    region: Optional[str] = None,
    skip_yolo: bool = False,
    skip_detect: Optional[bool] = None,
) -> dict[str, Any]:
    """
    Active engine from FM_ANPR_ENGINE (default fastalpr cascade).
    /read defaults to heavy path (FastALPR + HyperLPR). Live uses /read-macro.
    Pre-process: Frame_UUID + native frame (fisheye OFF) + Laplacian blur gate.
    """
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return {"ok": False, "error": "bad_file"}

    from frame_preprocess import preprocess_ingest

    # Keep reference to the highest-res buffer for all crops (YOLO letterbox is inference-only)
    native_bgr = img_bgr
    processed, pre = preprocess_ingest(native_bgr)
    if processed is None:
        return {
            "ok": False,
            "error": pre.get("error") or "blur_reject",
            "frameUuid": pre.get("frameUuid"),
            "sharpness": pre.get("sharpness"),
            "blurFloor": pre.get("blurFloor"),
            "message": "Frame rejected (motion blur / bad input)",
        }

    img_bgr = processed
    eng = ANPR_ENGINE
    # Ship default START-ANPR.bat uses FM_ANPR_ENGINE=rapidocr — must hit cascade, not dead Paddle path.
    if eng in (
        "fastalpr",
        "fast-alpr",
        "eval",
        "ship",
        "rapidocr",
        "rapidocr-onnx",
        "dual",
        "dual-lpr",
        "dual_lpr",
    ):
        out = _read_plate_fastalpr(img_bgr, region=region, path="heavy")
        return _stamp_frame_uuid(out, pre)

    from plate_roi import dedupe_rois, looks_like_tight_plate_crop, merge_detect_rois, roi_area, yellow_hint_roi

    if skip_detect is None:
        skip_detect = bool(skip_yolo)

    if get_ocr() is None:
        return {
            "ok": False,
            "error": "engine_missing",
            "frameUuid": pre.get("frameUuid"),
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
        return _stamp_frame_uuid({
            "ok": False,
            "error": "plate_not_found",
            "engine": engine_tag,
            "region": (region or REGION),
            "message": "No plate region found",
        }, pre)

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
        return _stamp_frame_uuid(successes[0], pre)

    if len(successes) > 1:
        compacts = {s.get("plateCompact") for s in successes if s.get("plateCompact")}
        if len(compacts) > 1:
            return _stamp_frame_uuid(
                _attach_debug(
                    {
                        "ok": False,
                        "error": "ambiguous_read",
                        "engine": engine_tag,
                        "region": (region or REGION),
                        "message": "Multiple ROIs disagree on plate text",
                        "candidates": [s.get("plateCompact") for s in successes[:3]],
                    },
                    roiCount=len(rois),
                ),
                pre,
            )
        return _stamp_frame_uuid(successes[0], pre)

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
            return _stamp_frame_uuid(ok_payload, pre)
        if fail_cand and (best_fail is None or (fail_cand.get("confidence") or 0) > (best_fail.get("confidence") or 0)):
            best_fail = fail_cand

    if best_fail:
        return _stamp_frame_uuid(best_fail, pre)
    return _stamp_frame_uuid({
        "ok": False,
        "error": "plate_not_found",
        "engine": engine_tag,
        "region": (region or REGION),
    }, pre)


def track_frame_bgr(
    img_bgr: np.ndarray,
    *,
    cam_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    LIVE track-only pass — Stage 1 YOLO vehicle detect + macro-crop + sharpness.
    Sampled frames are motion-stabilized; NO WPOD / NO OCR (deferred dual-engine on exit).
    """
    from dual_lpr import stabilize_frame
    from vehicle_detect import VEHICLE_CLASS_IDS, crop_vehicle_bgr, detect_vehicles
    from frame_preprocess import preprocess_ingest, laplacian_variance

    cam_label = str(cam_id or "unknown").strip() or "unknown"

    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        print(f"[ANPR-TRACE] Camera: {cam_label} | Detections found: 0 | error=bad_file")
        return {"ok": False, "error": "bad_file", "trackOnly": True}

    processed, pre = preprocess_ingest(img_bgr)
    if processed is None:
        print(
            f"[ANPR-TRACE] Camera: {cam_label} | Detections found: 0 | error="
            f"{pre.get('error') or 'blur_reject'}"
        )
        return {
            "ok": False,
            "error": pre.get("error") or "blur_reject",
            "trackOnly": True,
            "frameUuid": pre.get("frameUuid"),
            "sharpness": pre.get("sharpness"),
            "blurFloor": pre.get("blurFloor"),
        }
    try:
        processed = stabilize_frame(processed)
    except Exception:  # noqa: BLE001
        pass

    vehicles: list[dict[str, Any]] = []
    try:
        vehicles = detect_vehicles(processed)
    except Exception:  # noqa: BLE001
        vehicles = []
    vehicles = [
        v for v in vehicles
        if int(v.get("cls") if v.get("cls") is not None else -1) in VEHICLE_CLASS_IDS
        or str(v.get("label") or "").lower() in ("car", "truck", "bus", "motorcycle", "bicycle")
    ]
    try:
        from anpr_funnel_log import bump
        bump("s1_vehicles", len(vehicles))
    except Exception:
        pass
    print(f"[ANPR-TRACE] Camera: {cam_label} | Detections found: {len(vehicles)}")
    if not vehicles:
        return _stamp_frame_uuid({
            "ok": False,
            "error": "no_vehicle",
            "trackOnly": True,
            "hasDetection": False,
            "message": "No vehicle — track skip",
            "camId": cam_label,
        }, pre)

    best = vehicles[0]
    vehicles_out: list[dict[str, Any]] = []
    best_b64 = None
    best_sharp = float(pre.get("sharpness") or 0)
    for v in vehicles:
        crop = crop_vehicle_bgr(processed, v)
        sharp_v = float(pre.get("sharpness") or 0)
        if crop is not None and getattr(crop, "size", 0) > 0:
            try:
                sharp_v = max(sharp_v, float(laplacian_variance(crop)))
            except Exception:  # noqa: BLE001
                pass
        entry: dict[str, Any] = {
            "x": int(v.get("x") or 0),
            "y": int(v.get("y") or 0),
            "w": int(v.get("w") or 0),
            "h": int(v.get("h") or 0),
            "label": v.get("label"),
            "score": float(v.get("score") or 0),
            "cls": int(v.get("cls") if v.get("cls") is not None else -1),
            "sharpness": float(sharp_v),
        }
        if crop is not None:
            b64 = _ndarray_jpeg_b64(crop)
            if b64:
                entry["vehicleJpegB64"] = b64
                if best_b64 is None:
                    best_b64 = b64
            # CMM (MMR) on Stage-1 crop — not OCR; color always, make/model if ONNX present
            try:
                from vehicle_mmr import classify_vehicle_mmr

                mmr = classify_vehicle_mmr(crop, entry.get("label"))
                entry["make"] = mmr.get("make")
                entry["model"] = mmr.get("model")
                entry["color"] = mmr.get("color")
                entry["mmrText"] = mmr.get("mmrText")
                entry["mmr"] = {
                    "make": mmr.get("make"),
                    "model": mmr.get("model"),
                    "color": mmr.get("color"),
                    "mmrText": mmr.get("mmrText"),
                    "engine": mmr.get("engine"),
                }
            except Exception:  # noqa: BLE001
                pass
        vehicles_out.append(entry)
        if sharp_v > best_sharp:
            best_sharp = sharp_v

    if best_b64 is None:
        crop0 = crop_vehicle_bgr(processed, best)
        if crop0 is not None:
            best_b64 = _ndarray_jpeg_b64(crop0)

    out: dict[str, Any] = {
        "ok": True,
        "trackOnly": True,
        "hasDetection": True,
        "multiTarget": True,
        "vehicleCount": len(vehicles_out),
        "sharpness": float(best_sharp),
        "camId": cam_label,
        "vehicle": {
            "x": int(best.get("x") or 0),
            "y": int(best.get("y") or 0),
            "w": int(best.get("w") or 0),
            "h": int(best.get("h") or 0),
            "label": best.get("label"),
            "score": float(best.get("score") or 0),
            "cls": int(best.get("cls") if best.get("cls") is not None else -1),
            "sharpness": float(best_sharp),
        },
        "vehicles": vehicles_out,
        "engine": "track-yolo-v1",
    }
    if vehicles_out and isinstance(vehicles_out[0].get("mmr"), dict):
        out["mmr"] = dict(vehicles_out[0]["mmr"])
        out["vehicle"]["make"] = vehicles_out[0].get("make")
        out["vehicle"]["model"] = vehicles_out[0].get("model")
        out["vehicle"]["color"] = vehicles_out[0].get("color")
        out["vehicle"]["mmrText"] = vehicles_out[0].get("mmrText")
    if best_b64:
        out["vehicleJpegB64"] = best_b64
        out["hasVehicle"] = True
    print(
        f"[ANPR-FUNNEL] multi_target cam={cam_label} vehicles={len(vehicles_out)}",
        flush=True,
    )
    return _json_safe(_stamp_frame_uuid(out, pre))


def read_macro_crop_bgr(
    img_bgr: np.ndarray,
    *,
    region: Optional[str] = None,
    track_id: Optional[str] = None,
    path: Optional[str] = None,
) -> dict[str, Any]:
    """
    Deferred / moving-target: image is already a vehicle macro-crop.
    Default path=live (FastALPR only). Heavy = FastALPR + HyperLPR.
    """
    from dual_lpr import cascade_plate_from_vehicle_macro, resolve_ocr_path, stabilize_frame
    from frame_preprocess import preprocess_ingest, laplacian_variance

    ocr_path = resolve_ocr_path(path or "live")

    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return {"ok": False, "error": "bad_file"}

    processed, pre = preprocess_ingest(img_bgr)
    if processed is None:
        processed = img_bgr
        pre = {"frameUuid": pre.get("frameUuid"), "sharpness": pre.get("sharpness") or 0}
    try:
        processed = stabilize_frame(processed)
    except Exception:  # noqa: BLE001
        pass

    try:
        raw = cascade_plate_from_vehicle_macro(
            processed,
            track_id=track_id,
            vehicle_origin=(0, 0),
            path=ocr_path,
        )
    except Exception as exc:  # noqa: BLE001
        import traceback
        print("[anpr-dual] deferred cascade exception:", repr(exc), flush=True)
        traceback.print_exc()
        raw = {
            "ok": False,
            "unclear": True,
            "reviewStatus": "Unclear / Manual Review",
            "error": "ocr_exception",
            "message": str(exc)[:220],
            "engine": "dual-lpr-v1",
        }

    ui_micro = raw.pop("uiMicro", None) if isinstance(raw, dict) else None
    if isinstance(raw, dict):
        raw.pop("uiMacro", None)
        raw.pop("nativeMicro", None)
        _pop_cv_buffers(raw)
    if isinstance(ui_micro, np.ndarray) and ui_micro.size > 0:
        ui_micro = _ensure_ui_uint8(ui_micro)
    wpod_meta = raw.get("wpod") if isinstance(raw, dict) else None

    det = _extract_det_meta(raw)
    if isinstance(det, dict):
        # Cast YOLO/pose box + conf to native Python (never np.float32 in JSON)
        for k in ("x", "y", "w", "h", "x1", "y1", "x2", "y2"):
            if det.get(k) is not None:
                det[k] = int(det[k])
        if det.get("score") is not None:
            det["score"] = float(det["score"])
        if det.get("detConf") is not None:
            det["detConf"] = float(det["detConf"])
    fh, fw = processed.shape[:2]
    vehicle_det = {
        "x": 0,
        "y": 0,
        "w": int(fw),
        "h": int(fh),
        "label": "car",
        "score": 1.0,
        "source": "deferred-macro",
    }
    out = _finalize_fastalpr_payload(
        processed,
        raw,
        det,
        region=region,
        vehicle_det=vehicle_det,
    )
    if ui_micro is not None:
        out = _attach_crop_array(out, ui_micro)
    b64 = _ndarray_jpeg_b64(processed)
    if b64:
        out["vehicleJpegB64"] = b64
        out["hasVehicle"] = True
    if wpod_meta:
        out["wpod"] = {
            "source": wpod_meta.get("source") if isinstance(wpod_meta, dict) else None,
            "architecture": "cascade-crop-in-crop-v1",
        }
    try:
        out["sharpness"] = float(laplacian_variance(processed))
    except Exception:  # noqa: BLE001
        out["sharpness"] = pre.get("sharpness")
    out["deferredSingleShot"] = True
    out["cascade"] = "vehicle-then-plate"
    out["ocrModel"] = raw.get("ocrModel") or (
        "FastALPR-live-fast-path" if ocr_path == "live" else "dual-FastALPR+HyperLPR3"
    )
    out["ocrPath"] = raw.get("ocrPath") or ocr_path
    out["engine"] = raw.get("engine") or out.get("engine") or "dual-lpr-v1"
    if isinstance(raw.get("dual"), dict):
        out["dual"] = raw["dual"]
        out["temporalLocked"] = bool(raw["dual"].get("temporalLocked"))
    if track_id:
        out["trackId"] = str(track_id)
    # Preserve consensus plate even when temporal still pending
    if not out.get("plate") and raw.get("plate"):
        out["plate"] = raw.get("plate")
        out["plateCompact"] = raw.get("plateCompact") or raw.get("plate")
    if raw.get("unclear") or not raw.get("ok"):
        out["unclear"] = True
        out["reviewStatus"] = raw.get("reviewStatus") or "Unclear / Manual Review"
        out["ocrError"] = raw.get("error") or "plate_not_found"
        # If we have a consensus candidate, surface it (not blank UNCLEAR)
        cons = (raw.get("dual") or {}).get("consensus") if isinstance(raw.get("dual"), dict) else None
        cand = (cons or {}).get("plate") if isinstance(cons, dict) else None
        if cand and not out.get("plate"):
            out["plate"] = cand
            out["plateCompact"] = cand
            out["rawText"] = cand
    return _json_safe(_stamp_frame_uuid(out, pre if isinstance(pre, dict) else {}))


def track_frame_path(path: str, cam_id: Optional[str] = None) -> dict[str, Any]:
    if not path or not os.path.isfile(path):
        print(f"[ANPR-TRACE] Camera: {cam_id or 'unknown'} | Detections found: 0 | error=bad_file")
        return {"ok": False, "error": "bad_file", "trackOnly": True}
    img = cv2.imread(path)
    if img is None:
        print(f"[ANPR-TRACE] Camera: {cam_id or 'unknown'} | Detections found: 0 | error=cannot_decode")
        return {"ok": False, "error": "bad_file", "trackOnly": True, "message": "cannot_decode"}
    return track_frame_bgr(img, cam_id=cam_id)


def read_macro_crop_path(
    path: str,
    *,
    region: Optional[str] = None,
    track_id: Optional[str] = None,
    ocr_path: Optional[str] = None,
) -> dict[str, Any]:
    if not path or not os.path.isfile(path):
        return {"ok": False, "error": "bad_file"}
    img = cv2.imread(path)
    if img is None:
        return {"ok": False, "error": "bad_file", "message": "cannot_decode"}
    return read_macro_crop_bgr(img, region=region, track_id=track_id, path=ocr_path)


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
    try:
        return _health_payload_inner()
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "health_payload_exc",
            "message": str(exc)[:200],
            "engine": "dual-lpr-v1",
        }


def _health_payload_inner() -> dict[str, Any]:
    from plate_yolo import yolo_engine_status
    from vehicle_detect import vehicle_status
    from wpod_net import wpod_status

    hatch_fastalpr = ANPR_ENGINE in ("fastalpr", "fast-alpr", "eval", "ship")
    fa: dict[str, Any] = {
        "ready": False,
        "error": "skipped_until_FM_ANPR_ENGINE=fastalpr",
        "detModel": None,
        "ocrModel": None,
        "license": None,
        "detConf": None,
        "fallbackDet": None,
        "fallbackReady": False,
    }
    if hatch_fastalpr:
        from fastalpr_engine import fastalpr_status

        fa = fastalpr_status()
    rapid_st: dict[str, Any] = {"ready": False, "error": "not_checked"}
    try:
        from rapid_ocr_engine import rapidocr_status

        rapid_st = rapidocr_status()
    except Exception as exc:  # noqa: BLE001
        rapid_st = {"ready": False, "error": str(exc)[:120]}
    vs = vehicle_status()
    ws = wpod_status()
    try:
        yst = yolo_engine_status()
    except Exception as exc:  # noqa: BLE001
        yst = {"ready": False, "error": str(exc)[:160], "stage2": {"ready": False, "error": str(exc)[:120]}}
    yolo = get_yolo() if ANPR_ENGINE in ("paddle", "mob601", "yolo") else None

    cascade = True  # vehicle-then-plate cascade (OCR = RapidOCR / FastALPR hatch)
    dual_on = (os.environ.get("FM_ANPR_DUAL_ENGINE") or "1").strip().lower() not in (
        "0", "false", "no", "off",
    )
    plate_det = (os.environ.get("FM_ANPR_PLATE_DET") or "ph_id_yolo").strip().lower()
    try:
        from plate_pose_ccpd import plate_pose_status

        pps = plate_pose_status()
    except Exception as exc:  # noqa: BLE001
        pps = {"ready": False, "error": str(exc)[:120]}
    hls = {"ready": False, "error": "skipped_on_health"}
    try:
        from dual_lpr import (
            BOX_PAD_FRAC,
            ENHANCE_SKIP_FM,
            MICRO_BLUR_HEAVY,
            MICRO_BLUR_LIVE,
            PLATE_RANK_K,
        )
    except Exception:  # noqa: BLE001
        MICRO_BLUR_LIVE = float(os.environ.get("FM_ANPR_MICRO_BLUR_FLOOR", "35") or "35")
        MICRO_BLUR_HEAVY = float(os.environ.get("FM_ANPR_MICRO_BLUR_HEAVY", "100") or "100")
        BOX_PAD_FRAC = float(os.environ.get("FM_ANPR_BOX_PAD", "0.30") or "0.30")
        PLATE_RANK_K = int(os.environ.get("FM_ANPR_PLATE_RANK_K", "3") or "3")
        ENHANCE_SKIP_FM = float(os.environ.get("FM_ANPR_ENHANCE_SKIP_FM", "80") or "80")
    # Do not import paddleocr here — host WinError 127 shm.dll.
    s2 = (yst or {}).get("stage2") if isinstance(yst, dict) else {}
    s2_ready = bool(isinstance(s2, dict) and s2.get("ready"))
    if hatch_fastalpr:
        active_ok = bool(fa.get("ready"))
    else:
        # Ship bat: rapidocr + Stage-2 YOLO — badge must not require FastALPR.
        active_ok = bool(s2_ready and rapid_st.get("ready"))
    eng_b = "hyperlpr3"
    ship_stack = (
        f"Static: S1 vehicle → S2 YOLO plate pad={BOX_PAD_FRAC:.2f} → RapidOCR | "
        f"rankK={PLATE_RANK_K} | live ingest removed"
    )
    return {
        "ok": active_ok,
        "engine": "dual-lpr-v1" if cascade else "mob601-plate-yolo-pack-v1",
        "shipStack": ship_stack,
        "bestPlateCrop": {
            "boxPad": float(BOX_PAD_FRAC),
            "rankK": int(PLATE_RANK_K),
            "enhanceSkipFm": float(ENHANCE_SKIP_FM),
        },
        "livePath": f"RapidOCR-onnx | microBlur<{MICRO_BLUR_LIVE:.0f}",
        "heavyPath": f"RapidOCR-onnx | microBlur<{MICRO_BLUR_HEAVY:.0f}",
        "dualEngine": dual_on,
        "engineB": eng_b,
        "ppocr": "rapidocr-onnx",
        "cascade": "vehicle-then-plate",
        "activeEngine": ANPR_ENGINE,
        "region": REGION,
        "confFloor": CONF_FLOOR,
        "medianK": MEDIAN_K,
        "upscaleH": UPSCALE_H,
        "preprocess": PREPROCESS_MODE,
        "sequenceOcr": "HyperLPR3-heavy-only",
        "blurFloor": float(os.environ.get("FM_ANPR_BLUR_FLOOR", "20") or "20"),
        "microBlurFloor": float(MICRO_BLUR_LIVE),
        "microBlurLive": float(MICRO_BLUR_LIVE),
        "microBlurHeavy": float(MICRO_BLUR_HEAVY),
        "ocrTimeoutS": float(os.environ.get("FM_ANPR_OCR_TIMEOUT_S", "2.5") or "2.5"),
        "fisheye": (os.environ.get("FM_ANPR_FISHEYE") or "0").strip().lower() in ("1", "true", "on", "yes"),
        "fastalpr": "ready" if (hatch_fastalpr and fa.get("ready")) else ("hatch" if hatch_fastalpr else "not_loaded"),
        "fastalprError": fa.get("error"),
        "fastalprDet": fa.get("detModel"),
        "fastalprDetConf": fa.get("detConf"),
        "fastalprOcr": fa.get("ocrModel"),
        "fastalprFallbackDet": fa.get("fallbackDet"),
        "fastalprFallbackReady": fa.get("fallbackReady"),
        "hyperlpr": "ready" if hls.get("ready") else "missing",
        "hyperlprError": hls.get("error"),
        "hyperlprRole": "heavy-path-engine-B",
        "powerCrop": "native-res-crop-v1",
        "detLicense": fa.get("license"),
        "vehicleDetect": "ready" if vs.get("ready") else ("off" if not vs.get("enabled") else "missing"),
        "vehicleError": vs.get("error"),
        "vehicleWeights": vs.get("weights"),
        "plateDet": plate_det,
        "stage2Plate": "ready" if s2_ready else "missing",
        "stage2PlateError": (s2 or {}).get("error") if isinstance(s2, dict) else None,
        "stage2PlateWeights": (s2 or {}).get("weights") if isinstance(s2, dict) else None,
        "stage2PlateArchitecture": "stage2-ph-id-plates-yolo-v1",
        "platePose": "ready" if pps.get("ready") else "missing",
        "platePoseError": pps.get("error"),
        "platePoseWeights": pps.get("weights"),
        "platePosePad": pps.get("pad"),
        "platePoseArchitecture": pps.get("architecture") or "yolov8-plate-bbox-v1",
        "wpod": ws.get("mode"),
        "wpodReady": bool(ws.get("ready")),
        "wpodPad": ws.get("pad"),
        "wpodArchitecture": ws.get("architecture"),
        "wpodRole": "legacy-hatch",
        "ocr": "ready" if rapid_st.get("ready") else "missing",
        "ocrError": rapid_st.get("error"),
        "ocrModel": "RapidOCR-onnx",
        "ocrBackend": "rapidocr-onnx",
        "detect": (
            "vehicle+yolo-bbox+rapidocr-onnx"
            if cascade
            else ("yolo-first" if yolo is not None else "opencv")
        ),
        "yolo": "ready" if yolo is not None else ("idle" if cascade else "missing"),
        "yoloKind": yst.get("kind"),
        "yoloError": yst.get("error") or _yolo_error,
        "weights": ((s2 or {}).get("weights") if isinstance(s2, dict) else None) or _plate_weights_path(),
        "roi": True,
        "shipDefault": "live-rapidocr-onnx / stage2-yolo-bbox",
        "fastalprShip": "hatch-optional",
        "paddleIsolation": "removed-use-rapidocr",
        "temporalVote": "char_majority",
    }
