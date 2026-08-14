"""
Dynamic OCR routing:

  Live / BWC  → RapidOCR (ONNX) on YOLO plate crop + micro blur floor 35
  Heavy / CCTV → RapidOCR + HyperLPR3 + micro blur floor 100

  No paddlepaddle in this process — RapidOCR uses onnxruntime (coexists with
  Stage-2 PyTorch YOLO; no shm.dll clash).

Detection champion: YOLOv8 plate bbox (plate_pose_ccpd.localize_plate_native_warp).
"""
from __future__ import annotations

import math
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Optional

import cv2
import numpy as np

# Intra-frame: prefer winner only if conf ≥ this when engines disagree
CONSENSUS_CONF = float(os.environ.get("FM_ANPR_DUAL_CONF", "0.50") or "0.50")
TEMPORAL_N = max(2, min(5, int(os.environ.get("FM_ANPR_TEMPORAL_N", "3") or "3")))
# Min samples before character-majority lock publishes (stops 4 wrong plates / 1 car)
TEMPORAL_MIN_LOCK = max(2, min(TEMPORAL_N, int(os.environ.get("FM_ANPR_TEMPORAL_MIN_LOCK", "2") or "2")))
# Heavy-path dual (FastALPR + HyperLPR). Live path never runs Engine B.
DUAL_ENABLED = (os.environ.get("FM_ANPR_DUAL_ENGINE") or "1").strip().lower() not in (
    "0", "false", "no", "off",
)
# Force-flush still runs char-vote; lock only when TEMPORAL_MIN_LOCK met (was instant first-wrong).
# Hatch: FM_ANPR_TEMPORAL_FORCE_FLUSH=1 + MIN_LOCK=1 restores old one-shot emit.
TEMPORAL_FORCE_FLUSH = (os.environ.get("FM_ANPR_TEMPORAL_FORCE_FLUSH") or "1").strip().lower() not in (
    "0", "false", "no", "off",
)
# Path-specific micro IQA (legacy FM_ANPR_MICRO_BLUR_FLOOR aliases live)
MICRO_BLUR_LIVE = float(
    os.environ.get("FM_ANPR_MICRO_BLUR_LIVE")
    or os.environ.get("FM_ANPR_MICRO_BLUR_FLOOR")
    or "35"
)
MICRO_BLUR_HEAVY = float(os.environ.get("FM_ANPR_MICRO_BLUR_HEAVY", "100") or "100")
# Back-compat alias (health / old readers)
MICRO_BLUR_FLOOR = MICRO_BLUR_LIVE
# Soft OCR skip — low floor so clean white plates are not skipped (was 80)
BLUR_REJECT_FM = float(os.environ.get("FM_ANPR_BLUR_REJECT_FM", "15") or "15")
BLUR_REJECT_FM = max(5.0, min(200.0, BLUR_REJECT_FM))


def resolve_ocr_path(path: Optional[str] = None) -> str:
    """Normalize to 'live' or 'heavy'."""
    p = (path or os.environ.get("FM_ANPR_OCR_PATH") or "live").strip().lower()
    if p in ("heavy", "static", "cctv", "hires", "high-res", "highres", "snapshot", "still"):
        return "heavy"
    return "live"


def micro_blur_floor_for(path: str) -> float:
    return MICRO_BLUR_HEAVY if resolve_ocr_path(path) == "heavy" else MICRO_BLUR_LIVE

_lock = threading.Lock()
# track_id → list of (plate, fm) kept to TEMPORAL_N sharpest only
_temporal: dict[str, list[tuple[str, float]]] = {}
# ANPR-BEST-PLATE-CROP-TRACK-V1 — top-K plate micros per track + last OCR cache
_plate_rank: dict[str, list[dict[str, Any]]] = {}
_plate_ocr_cache: dict[str, dict[str, Any]] = {}

# Micro-crop floors — slightly relaxed sliver (was 30×15; side-angle plates were dying)
MIN_MICRO_H = max(10, int(os.environ.get("FM_ANPR_MIN_MICRO_H", "12") or "12"))
MIN_MICRO_W = max(18, int(os.environ.get("FM_ANPR_MIN_MICRO_W", "22") or "22"))
# Tighter pad — at least 10% so turning/skewed plates are not clipped
BOX_PAD_FRAC = float(os.environ.get("FM_ANPR_BOX_PAD", "0.30") or "0.30")
BOX_PAD_FRAC = max(0.10, min(0.50, BOX_PAD_FRAC))
# Plate geometry — reject rear-window decals / slogans (tall or square crops)
PLATE_ASPECT_MIN = float(os.environ.get("FM_ANPR_PLATE_ASPECT_MIN", "2.0") or "2.0")
PLATE_ASPECT_MAX = float(os.environ.get("FM_ANPR_PLATE_ASPECT_MAX", "5.0") or "5.0")
# Drop plate boxes whose center sits in the upper band of the vehicle macro (window stickers)
WINDOW_DECAL_TOP_FRAC = float(os.environ.get("FM_ANPR_WINDOW_DECAL_TOP", "0.35") or "0.35")
WINDOW_DECAL_TOP_FRAC = max(0.15, min(0.55, WINDOW_DECAL_TOP_FRAC))
# Blown-out glare: fraction of pixels with value > 240
GLARE_PIXEL_THR = int(os.environ.get("FM_ANPR_GLARE_PIXEL", "240") or "240")
GLARE_FRAC_THR = float(os.environ.get("FM_ANPR_GLARE_FRAC", "0.75") or "0.75")
PLATE_RANK_K = max(1, min(5, int(os.environ.get("FM_ANPR_PLATE_RANK_K", "3") or "3")))
# Skip Lanczos enhance when micro already sharp (live speed)
ENHANCE_SKIP_FM = float(os.environ.get("FM_ANPR_ENHANCE_SKIP_FM", "80") or "80")


def micro_laplacian_fm(img_bgr: np.ndarray) -> float:
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return 0.0
    try:
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())
    except Exception:  # noqa: BLE001
        return 0.0


def plate_micro_score(
    micro_bgr: np.ndarray,
    plate_meta: Optional[dict[str, Any]] = None,
) -> float:
    """Rank plate crop: prefer sharp plate-like strips — not raw area (large crops win wrongly)."""
    if micro_bgr is None or getattr(micro_bgr, "size", 0) == 0:
        return 0.0
    h, w = micro_bgr.shape[:2]
    if h < 1 or w < 1:
        return 0.0
    aspect = float(w) / float(h)
    # PH plates are wide strips; punish square/tall vehicle-ish crops
    aspect_bonus = 1.0
    if 1.8 <= aspect <= 6.5:
        aspect_bonus = 1.35
    elif aspect < 1.2 or aspect > 10.0:
        aspect_bonus = 0.35
    fm = micro_laplacian_fm(micro_bgr)
    meta = plate_meta if isinstance(plate_meta, dict) else {}
    warp_bypassed = bool(meta.get("warpBypassed"))
    gate = meta.get("deskewGate") if isinstance(meta.get("deskewGate"), dict) else {}
    if warp_bypassed:
        bonus = 0.85
    elif gate.get("ok") is False:
        bonus = 0.90
    else:
        bonus = 1.25
    # Soft area term (sqrt) so a 4× larger wrong crop cannot dominate sharpness
    return float(math.sqrt(max(1.0, float(w * h))) * (1.0 + math.log1p(max(0.0, fm))) * bonus * aspect_bonus)


def consider_plate_crop(
    track_id: Optional[str],
    micro_bgr: np.ndarray,
    plate_meta: Optional[dict[str, Any]] = None,
) -> tuple[bool, Optional[np.ndarray], dict[str, Any]]:
    """
    Keep top-K plate micros per track. Returns (is_new_best, best_micro, rank_meta).
    """
    tid = str(track_id or "").strip()
    score = plate_micro_score(micro_bgr, plate_meta)
    fm = micro_laplacian_fm(micro_bgr)
    h, w = (micro_bgr.shape[:2] if micro_bgr is not None else (0, 0))
    rank_meta: dict[str, Any] = {
        "score": round(score, 2),
        "fm": round(fm, 2),
        "w": int(w),
        "h": int(h),
        "warpBypassed": bool((plate_meta or {}).get("warpBypassed")),
        "k": PLATE_RANK_K,
    }
    if not tid or micro_bgr is None or getattr(micro_bgr, "size", 0) == 0:
        return True, micro_bgr, rank_meta
    entry = {
        "score": score,
        "fm": fm,
        "micro": np.ascontiguousarray(micro_bgr.copy()),
        "warpBypassed": bool((plate_meta or {}).get("warpBypassed")),
    }
    with _lock:
        lst = list(_plate_rank.get(tid) or [])
        prev_best = float(lst[0]["score"]) if lst else -1.0
        lst.append(entry)
        lst.sort(key=lambda e: float(e.get("score") or 0), reverse=True)
        lst = lst[:PLATE_RANK_K]
        _plate_rank[tid] = lst
        best = lst[0]
        is_new_best = score >= prev_best
        rank_meta["prevBest"] = round(prev_best, 2) if prev_best >= 0 else None
        rank_meta["kept"] = len(lst)
        rank_meta["isNewBest"] = is_new_best
        best_micro = best.get("micro")
    return is_new_best, best_micro if isinstance(best_micro, np.ndarray) else micro_bgr, rank_meta


def enhance_plate_crop(crop_img: np.ndarray) -> np.ndarray:
    """Passthrough — heavy CLAHE/unsharp removed for live ms polling."""
    return crop_img


def resolve_xyxy_to_pixels(
    box: dict[str, Any],
    orig_w: int,
    orig_h: int,
) -> Optional[tuple[int, int, int, int]]:
    """
    Scale detector box to ORIGINAL frame/macro pixel coords.
    Accepts {x,y,w,h} or {x1,y1,x2,y2}. If values look normalized (≤1.5),
    multiply by orig_w / orig_h before slicing.
    """
    if not isinstance(box, dict) or orig_w < 2 or orig_h < 2:
        return None
    # Stage-2 Ultralytics boxes: {x0,y0,x1,y1} (x1/y1 = bottom-right, not width/height)
    if (
        box.get("x0") is not None
        and box.get("y0") is not None
        and box.get("x1") is not None
        and box.get("y1") is not None
        and box.get("x2") is None
        and box.get("w") is None
    ):
        x1 = float(box.get("x0") or 0)
        y1 = float(box.get("y0") or 0)
        x2 = float(box.get("x1") or 0)
        y2 = float(box.get("y1") or 0)
    elif box.get("x1") is not None and box.get("x2") is not None:
        x1 = float(box.get("x1") or 0)
        y1 = float(box.get("y1") or 0)
        x2 = float(box.get("x2") or 0)
        y2 = float(box.get("y2") or 0)
    else:
        x1 = float(box.get("x") or 0)
        y1 = float(box.get("y") or 0)
        bw = float(box.get("w") or 0)
        bh = float(box.get("h") or 0)
        x2 = x1 + bw
        y2 = y1 + bh
    vals = [x1, y1, x2, y2]
    # Normalized YOLO-style coords on [0,1]
    if max(vals) <= 1.5 and min(vals) >= -0.05:
        x1 *= float(orig_w)
        x2 *= float(orig_w)
        y1 *= float(orig_h)
        y2 *= float(orig_h)
    # Clamp + order
    x1, x2 = min(x1, x2), max(x1, x2)
    y1, y2 = min(y1, y2), max(y1, y2)
    xi1 = max(0, min(orig_w - 1, int(round(x1))))
    yi1 = max(0, min(orig_h - 1, int(round(y1))))
    xi2 = max(0, min(orig_w, int(round(x2))))
    yi2 = max(0, min(orig_h, int(round(y2))))
    if xi2 - xi1 < 2 or yi2 - yi1 < 2:
        return None
    return xi1, yi1, xi2, yi2


def pad_xyxy(
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    orig_w: int,
    orig_h: int,
    *,
    pad_frac: float = BOX_PAD_FRAC,
) -> tuple[int, int, int, int]:
    """≥10% dynamic pad around plate box (default 30% each side) — clamp to image [0,w]×[0,h]."""
    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)
    frac = max(0.10, min(0.50, float(pad_frac)))
    px = int(round(bw * frac))
    py = int(round(bh * frac))
    nx1 = max(0, int(x1) - px)
    ny1 = max(0, int(y1) - py)
    nx2 = min(int(orig_w), int(x2) + px)
    ny2 = min(int(orig_h), int(y2) + py)
    if nx2 <= nx1:
        nx2 = min(int(orig_w), nx1 + 1)
    if ny2 <= ny1:
        ny2 = min(int(orig_h), ny1 + 1)
    return nx1, ny1, nx2, ny2


def is_valid_micro_size(w: int, h: int) -> bool:
    return int(w) >= MIN_MICRO_W and int(h) >= MIN_MICRO_H


def is_valid_plate_aspect(w: int, h: int) -> bool:
    """Normal PH plate aspect: 2.0 <= width/height <= 5.0 (drops window decals)."""
    bw, bh = int(w), int(h)
    if bw < 1 or bh < 1:
        return False
    ar = float(bw) / float(bh)
    return PLATE_ASPECT_MIN <= ar <= PLATE_ASPECT_MAX


def plate_box_wh(box: dict[str, Any]) -> tuple[int, int]:
    if not isinstance(box, dict):
        return 0, 0
    if box.get("w") is not None and box.get("h") is not None:
        return max(0, int(box.get("w") or 0)), max(0, int(box.get("h") or 0))
    if box.get("x1") is not None and box.get("x2") is not None:
        return max(0, int(box["x2"]) - int(box["x1"])), max(0, int(box["y2"]) - int(box["y1"]))
    if box.get("x0") is not None and box.get("x1") is not None:
        return max(0, int(box["x1"]) - int(box["x0"])), max(0, int(box["y1"]) - int(box["y0"]))
    nested = box.get("box") if isinstance(box.get("box"), dict) else None
    if nested:
        return plate_box_wh(nested)
    return 0, 0


def is_window_decal_zone(
    box: dict[str, Any],
    vehicle_h: int,
    *,
    top_frac: Optional[float] = None,
) -> bool:
    """True if plate center Y is in the top band of the vehicle bbox (rear-window stickers)."""
    if vehicle_h < 2 or not isinstance(box, dict):
        return False
    frac = WINDOW_DECAL_TOP_FRAC if top_frac is None else float(top_frac)
    from vehicle_detect import detection_center_y

    cy = detection_center_y(box)
    if cy is None:
        return False
    return float(cy) < float(vehicle_h) * frac


def filter_plate_boxes_geometry(
    boxes: list[dict[str, Any]],
    *,
    vehicle_h: Optional[int] = None,
) -> list[dict[str, Any]]:
    """Drop non-plate aspect ratios and upper-vehicle (window decal) hits."""
    out: list[dict[str, Any]] = []
    for b in boxes or []:
        w, h = plate_box_wh(b)
        if w > 0 and h > 0 and not is_valid_plate_aspect(w, h):
            continue
        if vehicle_h and is_window_decal_zone(b, int(vehicle_h)):
            continue
        out.append(b)
    return out


def is_blown_out_glare(crop_bgr: np.ndarray) -> bool:
    """True when >75% of pixels are >240 — OCR would hallucinate (e.g. M3W111)."""
    if crop_bgr is None or getattr(crop_bgr, "size", 0) == 0:
        return True
    try:
        if len(crop_bgr.shape) == 3:
            gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        else:
            gray = crop_bgr
        frac = float(np.mean(gray.astype(np.float32) > float(GLARE_PIXEL_THR)))
        return frac > GLARE_FRAC_THR
    except Exception:  # noqa: BLE001
        return False


def deinterlace_scanlines(crop_bgr: np.ndarray) -> np.ndarray:
    """Passthrough — heavy filters removed (raw crop path)."""
    return crop_bgr


def unsharp_mask_crop(crop_bgr: np.ndarray) -> np.ndarray:
    """Passthrough — GaussianBlur/addWeighted unsharp removed for live speed."""
    return crop_bgr


def crop_micro_from_box(
    img_bgr: np.ndarray,
    box: dict[str, Any],
    *,
    pad_frac: float = BOX_PAD_FRAC,
    relax: bool = False,
) -> tuple[Optional[np.ndarray], Optional[dict[str, Any]]]:
    """
    Slice a plate micro-crop from img using scaled+padded box.
    Returns (crop | None, abs_box_meta).
    relax=True (Stage-2 force OCR): skip window/aspect/sliver gates — only need a non-empty slice.
    """
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return None, None
    fh, fw = img_bgr.shape[:2]
    xyxy = resolve_xyxy_to_pixels(box, fw, fh)
    if xyxy is None:
        # Stage-2 boxes often use x0,y0,x1,y1 — map if resolve missed
        if isinstance(box, dict) and box.get("x0") is not None and box.get("y1") is not None:
            try:
                xa, ya = int(box["x0"]), int(box["y0"])
                xb, yb = int(box["x1"]), int(box["y1"])
                xyxy = (
                    max(0, min(fw - 1, xa)),
                    max(0, min(fh - 1, ya)),
                    max(0, min(fw, xb)),
                    max(0, min(fh, yb)),
                )
                if xyxy[2] - xyxy[0] < 2 or xyxy[3] - xyxy[1] < 2:
                    xyxy = None
            except Exception:
                xyxy = None
        if xyxy is None:
            return None, {"error": "bad_box", "reject": "unscaled_or_empty"}
    if not relax and is_window_decal_zone(
        {"x1": xyxy[0], "y1": xyxy[1], "x2": xyxy[2], "y2": xyxy[3]},
        fh,
    ):
        return None, {
            "error": "window_decal_reject",
            "reject": "window_decal_top",
            "y1": xyxy[1],
            "y2": xyxy[3],
            "vehicleH": fh,
            "topFrac": WINDOW_DECAL_TOP_FRAC,
        }
    x1, y1, x2, y2 = pad_xyxy(*xyxy, fw, fh, pad_frac=pad_frac)
    bw, bh = x2 - x1, y2 - y1
    if not relax and not is_valid_micro_size(bw, bh):
        return None, {
            "error": "sliver_reject",
            "reject": "sliver",
            "w": bw,
            "h": bh,
            "minW": MIN_MICRO_W,
            "minH": MIN_MICRO_H,
            "x": x1,
            "y": y1,
        }
    if not relax and not is_valid_plate_aspect(bw, bh):
        return None, {
            "error": "aspect_reject",
            "reject": "decal_aspect",
            "w": bw,
            "h": bh,
            "aspect": round(float(bw) / float(max(1, bh)), 3),
            "minAspect": PLATE_ASPECT_MIN,
            "maxAspect": PLATE_ASPECT_MAX,
        }
    if bw < 4 or bh < 4:
        return None, {"error": "sliver_reject", "reject": "tiny", "w": bw, "h": bh}
    crop = img_bgr[y1:y2, x1:x2]
    if crop is None or crop.size == 0:
        return None, {"error": "empty_slice"}
    meta = {
        "x": x1,
        "y": y1,
        "w": bw,
        "h": bh,
        "x1": x1,
        "y1": y1,
        "x2": x2,
        "y2": y2,
        "score": float(box.get("score") or box.get("conf") or 0)
        if (box.get("score") is not None or box.get("conf") is not None)
        else None,
        "source": box.get("source") or ("stage2-relax" if relax else "scaled-pad-v1"),
        "padFrac": float(pad_frac),
        "aspect": round(float(bw) / float(max(1, bh)), 3),
        "relax": bool(relax),
    }
    return np.ascontiguousarray(crop.copy()), meta


def stabilize_frame(img_bgr: np.ndarray) -> np.ndarray:
    """Passthrough — CLAHE/Gaussian stabilize removed for live ms polling."""
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return img_bgr
    return np.ascontiguousarray(img_bgr)


def _pad_micro_for_det(micro_bgr: np.ndarray, min_side: int = 320) -> np.ndarray:
    """Pad tiny plate crops so FastALPR detector can still fire."""
    if micro_bgr is None or getattr(micro_bgr, "size", 0) == 0:
        return micro_bgr
    h, w = micro_bgr.shape[:2]
    side = max(h, w, min_side)
    canvas = np.zeros((side, side, 3), dtype=np.uint8)
    y0 = (side - h) // 2
    x0 = (side - w) // 2
    canvas[y0 : y0 + h, x0 : x0 + w] = micro_bgr
    return canvas


def ocr_alnum_len(text: str) -> int:
    return len(re.sub(r"[^A-Za-z0-9]", "", str(text or "")))


def ocr_text_is_publishable(text: str) -> bool:
    """Strict filter: empty / <5 alnum / pure digits (taxi fleet ID) → never publish."""
    alnum = re.sub(r"[^A-Za-z0-9]", "", str(text or ""))
    if len(alnum) < 5:
        return False
    # e.g. "1978" commercial/fleet ID — not a PH plate
    if re.fullmatch(r"\d+", alnum):
        return False
    return True


def _normalize_engine_hit(raw: dict[str, Any], *, engine_id: str) -> dict[str, Any]:
    from pipeline import apply_region_regex, validate_lto_plate_syntax

    text_raw = str((raw or {}).get("rawText") or (raw or {}).get("plate") or "").strip()
    conf = float((raw or {}).get("conf") or (raw or {}).get("confidence") or 0)
    if conf > 1.0:
        conf = conf / 100.0
    print(f"RAW OCR RESULT: {text_raw} | CONFIDENCE: {conf}", flush=True)
    alnum = re.sub(r"[^A-Za-z0-9]", "", text_raw)
    if not ocr_text_is_publishable(text_raw):
        reason = "pure_numeric" if re.fullmatch(r"\d+", alnum or "") else "empty_or_short"
        print(
            f"[ANPR-OCR] silent drop {reason} alnum={ocr_alnum_len(text_raw)} "
            f"text={text_raw!r} conf={conf}",
            flush=True,
        )
        return {
            "engineId": engine_id,
            "ok": False,
            "drop": True,
            "unclear": False,
            "rawText": text_raw,
            "plate": None,
            "plateCompact": None,
            "plateText": None,
            "conf": conf,
            "regexOk": False,
            "error": "ocr_empty_short_or_numeric",
            "raw": raw or {},
        }
    locked = None
    try:
        locked = validate_lto_plate_syntax(text_raw) if text_raw else None
    except Exception:  # noqa: BLE001
        locked = apply_region_regex(text_raw) if text_raw else None
        if locked and not validate_lto_plate_syntax(locked):
            locked = None
    regex_ok = bool(locked)
    plate = locked
    # Drop 1–3 char / non-LTO hallucinations even if engine said ok
    if plate and len(re.sub(r"[^A-Z0-9]", "", str(plate).upper())) < 5:
        plate = None
        regex_ok = False
    if text_raw and not plate:
        # Syntax fail — surface as unclear (Node maps to UNCLEAR)
        return {
            "engineId": engine_id,
            "ok": False,
            "unclear": True,
            "rawText": text_raw,
            "plate": None,
            "plateCompact": None,
            "plateText": "UNCLEAR",
            "conf": conf,
            "regexOk": False,
            "error": "syntax_reject",
            "raw": raw or {},
        }
    return {
        "engineId": engine_id,
        "ok": bool(plate) and (bool((raw or {}).get("ok")) or conf >= 0.50),
        "rawText": text_raw,
        "plate": plate,
        "plateCompact": plate,
        "conf": conf,
        "regexOk": regex_ok,
        "raw": raw or {},
    }


def clahe_glare_normalize(crop_bgr: np.ndarray) -> np.ndarray:
    """Passthrough — CLAHE glare path removed for live ms polling."""
    return crop_bgr


def prepare_plate_for_ocr(
    plate_crop: np.ndarray,
    *,
    track_id: Optional[str] = None,
    allow_blurry: bool = False,
) -> tuple[Optional[np.ndarray], Optional[dict[str, Any]]]:
    """
    Dynamic resize to 80px height + grayscale + MINMAX normalize (no Otsu/CLAHE).
    Returns (norm_bgr, None) for OCR, or (None, soft_skip) when blurry.
    allow_blurry=True (Stage-2 force OCR): never soft-skip on blur.
    """
    if plate_crop is None or getattr(plate_crop, "size", 0) == 0:
        return None, {
            "ok": False,
            "plate": None,
            "status": "blurry",
            "error": "micro_blur_reject",
            "track_id": track_id,
            "blur_score": 0.0,
            "unclear": False,
            "message": "empty crop — soft blur skip",
        }
    try:
        work = np.ascontiguousarray(plate_crop)
        # --- EXACT PYTHON PRE-PROCESSING LOGIC ---
        # 1. Dynamic Resize to 80px target height (prevents OCR failure on close-up shots)
        target_height = 80
        (h, w) = work.shape[:2]
        if h > 0:
            aspect_ratio = w / float(h)
            target_width = max(8, int(target_height * aspect_ratio))
            work = cv2.resize(
                work, (target_width, target_height), interpolation=cv2.INTER_CUBIC
            )

        # 2. Grayscale & Fast Contrast Normalization (Preserves edges better than Otsu)
        if len(work.shape) == 2:
            gray_plate = work
        else:
            gray_plate = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY)
        norm_plate = cv2.normalize(
            gray_plate, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX
        )

        # 3. Permissive Blur Check (Soft skip, no hard errors) — disabled for Stage-2 force
        blur_score = float(cv2.Laplacian(norm_plate, cv2.CV_64F).var())
        blur_min = float(os.environ.get("FM_ANPR_PREP_BLUR_MIN", "1") or "1")
        if (not allow_blurry) and blur_score < blur_min:
            return None, {
                "ok": False,
                "plate": None,
                "status": "blurry",
                "error": "micro_blur_reject",
                "track_id": track_id,
                "blur_score": round(blur_score, 2),
                "sharpness": round(blur_score, 2),
                "unclear": False,
                "message": f"blur_score={blur_score:.1f} < {blur_min} — OCR skipped, track kept",
            }

        # Pass norm_plate to OCR engine (BGR for FastALPR)
        return cv2.cvtColor(norm_plate, cv2.COLOR_GRAY2BGR), None
    except Exception:  # noqa: BLE001
        return plate_crop, None


def soft_blur_reject(plate_crop: np.ndarray, track_id: Optional[str] = None) -> Optional[dict[str, Any]]:
    """
    Soft Laplacian gate — only skip extreme mush (floor default 15).
    Prefer prepare_plate_for_ocr blur check after 80px resize; this remains
    for callers that gate before prep.
    """
    if plate_crop is None or getattr(plate_crop, "size", 0) == 0:
        return {
            "ok": False,
            "plate": None,
            "status": "blurry",
            "error": "micro_blur_reject",
            "track_id": track_id,
            "blur_score": 0.0,
            "unclear": False,
            "message": "empty crop — soft blur skip",
        }
    try:
        gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY) if len(plate_crop.shape) == 3 else plate_crop
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    except Exception:  # noqa: BLE001
        blur_score = 0.0
    if blur_score < BLUR_REJECT_FM:
        return {
            "ok": False,
            "plate": None,
            "status": "blurry",
            "error": "micro_blur_reject",
            "track_id": track_id,
            "blur_score": round(blur_score, 2),
            "sharpness": round(blur_score, 2),
            "unclear": False,
            "message": f"blur_score={blur_score:.1f} < {BLUR_REJECT_FM} — OCR skipped, track kept",
        }
    return None


def engine_a_fastlpr(micro_bgr: np.ndarray, *, allow_blurry: bool = False) -> dict[str, Any]:
    """
    Engine A — RapidOCR (ONNX) on YOLO plate micro-crop.
    Never call with a full BWC frame — that breaks cascaded crop-in-crop.
    """
    from rapid_ocr_engine import read_with_rapidocr

    if micro_bgr is None or getattr(micro_bgr, "size", 0) == 0:
        return _normalize_engine_hit(
            {"ok": False, "error": "bad_file", "rawText": "", "conf": 0},
            engine_id="A-rapidocr",
        )
    if (not allow_blurry) and is_blown_out_glare(micro_bgr):
        return {
            "engineId": "A-rapidocr",
            "ok": False,
            "unclear": True,
            "rawText": "",
            "plate": None,
            "plateCompact": None,
            "plateText": "UNCLEAR",
            "conf": 0.0,
            "regexOk": False,
            "error": "glare_blown_out",
            "cascade": "micro-only",
            "glareReject": True,
        }
    if _crop_is_blank(micro_bgr):
        return {
            "engineId": "A-rapidocr",
            "ok": False,
            "drop": True,
            "rawText": "",
            "plate": None,
            "conf": 0.0,
            "error": "blank_ocr_crop",
            "cascade": "micro-only",
        }
    print(
        f"[RAPID-OCR] engine_a shape={getattr(micro_bgr, 'shape', None)}",
        flush=True,
    )
    try:
        raw = read_with_rapidocr(np.ascontiguousarray(micro_bgr))
    except Exception as exc:  # noqa: BLE001
        raw = {
            "ok": False,
            "error": "engine_a_exception",
            "message": str(exc)[:160],
            "rawText": "",
            "conf": 0,
        }
    hit = _normalize_engine_hit(raw, engine_id="A-rapidocr")
    hit["cascade"] = "micro-only"
    hit["ocrEngine"] = "rapidocr-onnx"
    return hit


def _crop_is_blank(img: Optional[np.ndarray], mean_thr: float = 8.0) -> bool:
    if img is None or getattr(img, "size", 0) == 0:
        return True
    try:
        return float(np.mean(img)) < mean_thr
    except Exception:  # noqa: BLE001
        return True


def cascade_plate_from_vehicle_macro(
    macro_bgr: np.ndarray,
    *,
    track_id: Optional[str] = None,
    vehicle_origin: Optional[tuple[int, int]] = None,
    force_flush: Optional[bool] = None,
    path: Optional[str] = None,
) -> dict[str, Any]:
    """
    Cascaded crop-in-crop (Stage 2 plate → OCR):
      Input MUST be a vehicle macro (Stage 1 YOLO vehicle crop — native pixels).
      Stage 2 default: CCPD pose keypoints + unskew → FastALPR OCR (baseline).
      YOLO Stage-2 hatch: FM_ANPR_PLATE_DET=ph_id_only|ph_id_yolo
      Opt-in CCPD seatbelt after YOLO miss: FM_ANPR_PLATE_DET=ccpd_seatbelt
    """
    ocr_path = resolve_ocr_path(path)
    # Tighter pad 8–12% (ANPR-BEST-PLATE-CROP-TRACK-V1)
    pad_frac = BOX_PAD_FRAC
    do_force = force_flush if force_flush is not None else bool(track_id)

    if macro_bgr is None or getattr(macro_bgr, "size", 0) == 0:
        return {
            "ok": False,
            "unclear": True,
            "error": "bad_file",
            "engine": "dual-lpr-v1",
            "cascade": "vehicle-macro-required",
        }
    # Stabilize for detect, but keep a pristine native buffer for the final slice/warp
    native = np.ascontiguousarray(macro_bgr.copy())
    work = stabilize_frame(macro_bgr)
    mh, mw = native.shape[:2]
    det_mode = (os.environ.get("FM_ANPR_PLATE_DET") or "ph_id_yolo").strip().lower()
    use_ph_id = det_mode in ("ph_id_yolo", "ph_id", "stage2", "yolo", "ph_id_only")
    use_ccpd_seatbelt = det_mode in ("ccpd_seatbelt", "seatbelt")
    use_ccpd_forced = det_mode in ("legacy_ccpd", "ccpd_pose", "ccpd_only")

    plate_meta: dict[str, Any] = {}
    ocr_src: Optional[np.ndarray] = None
    sliver_meta: Optional[dict[str, Any]] = None
    abs_box: Optional[dict[str, Any]] = None

    def _accept_micro(img: Optional[np.ndarray], label: str) -> bool:
        nonlocal ocr_src, sliver_meta
        if img is None or getattr(img, "size", 0) == 0:
            return False
        h, w = img.shape[:2]
        if not is_valid_micro_size(w, h):
            sliver_meta = {
                "reject": "sliver",
                "source": label,
                "w": int(w),
                "h": int(h),
                "minW": MIN_MICRO_W,
                "minH": MIN_MICRO_H,
            }
            return False
        ocr_src = np.ascontiguousarray(img.copy())
        return True

    # --- Stage 2 champion: plate YOLO inside vehicle crop ---
    s2_forced = False
    if use_ph_id and not use_ccpd_forced:
        try:
            from plate_yolo import localize_plate_in_vehicle_crop

            crop_s2, plate_meta = localize_plate_in_vehicle_crop(native, pad_frac=pad_frac)
            if not isinstance(plate_meta, dict):
                plate_meta = {}
            # Force every S2_accepted crop to OCR — skip size/aspect accept gate
            if crop_s2 is not None and getattr(crop_s2, "size", 0) > 0:
                ocr_src = np.ascontiguousarray(crop_s2.copy())
                s2_forced = True
                if isinstance(plate_meta.get("det"), dict):
                    abs_box = dict(plate_meta["det"])
                print(
                    "[ANPR-FUNNEL] S2_crop→OCR force "
                    f"shape={ocr_src.shape} detScore={plate_meta.get('detScore')}",
                    flush=True,
                )
            elif isinstance(plate_meta.get("reject"), dict):
                sliver_meta = plate_meta.get("reject")
        except Exception as exc:  # noqa: BLE001
            plate_meta = {
                "error": "ph_id_yolo_exc:" + str(exc)[:120],
                "source": None,
                "architecture": "stage2-ph-id-plates-yolo-v1",
            }

    # --- CCPD pose (baseline Stage-2 localizer + unskew) ---
    if ocr_src is None and (use_ccpd_seatbelt or use_ccpd_forced):
        try:
            from plate_pose_ccpd import localize_plate_native_warp

            warped, ccpd_meta = localize_plate_native_warp(native)
            if not isinstance(ccpd_meta, dict):
                ccpd_meta = {}
            prev = dict(plate_meta) if isinstance(plate_meta, dict) else {}
            plate_meta = dict(ccpd_meta)
            if prev.get("error") or prev.get("source"):
                plate_meta["phIdAttempt"] = {
                    "error": prev.get("error"),
                    "source": prev.get("source"),
                }
            plate_meta["seatbelt"] = "ccpd" if not use_ccpd_forced else "ccpd_forced"
            plate_meta["architecture"] = plate_meta.get("architecture") or "ccpd-pose-unskew-v1"
            nm = plate_meta.pop("nativeMicro", None)
            if isinstance(nm, np.ndarray) and nm.size > 0:
                _accept_micro(nm, "ccpdPoseWarp")
            elif warped is not None:
                _accept_micro(warped, "ccpdPoseWarp")
            if isinstance(plate_meta.get("det"), dict):
                abs_box = dict(plate_meta["det"])
            if ocr_src is not None:
                if _crop_is_blank(ocr_src):
                    print(
                        f"[ANPR-FUNNEL] CCPD_crop blank reject mean={float(np.mean(ocr_src)):.2f}",
                        flush=True,
                    )
                    ocr_src = None
                    plate_meta = dict(plate_meta) if isinstance(plate_meta, dict) else {}
                    plate_meta["error"] = "blank_crop"
                else:
                    s2_forced = True
                    # TEMP visual debugger — native slice as extracted (no color convert)
                    try:
                        cv2.imwrite("debug_ocr_crop.jpg", ocr_src)
                        print(
                            f"[ANPR-FUNNEL] wrote debug_ocr_crop.jpg shape={ocr_src.shape} "
                            f"mean={float(np.mean(ocr_src)):.1f}",
                            flush=True,
                        )
                    except Exception as exc:  # noqa: BLE001
                        print("[ANPR-FUNNEL] debug_ocr_crop write fail:", str(exc)[:80], flush=True)
                    print(
                        "[ANPR-FUNNEL] CCPD_crop→OCR "
                        f"shape={ocr_src.shape} src={plate_meta.get('source')}",
                        flush=True,
                    )
            else:
                print(
                    "[ANPR-S2-RAW] CCPD miss "
                    f"err={plate_meta.get('error')} maxConf={plate_meta.get('maxConfRaw')} "
                    f"macro={native.shape}",
                    flush=True,
                )
        except Exception as exc:  # noqa: BLE001
            plate_meta = dict(plate_meta) if isinstance(plate_meta, dict) else {}
            plate_meta["legacyCcpdError"] = str(exc)[:120]
            print("[ANPR-FUNNEL] CCPD localize fail:", str(exc)[:120], flush=True)

    # NO vehicle-macro OCR fallback — CCPD miss / sliver → drop frame (next 30fps tick)
    if ocr_src is None:
        err = (plate_meta or {}).get("error") or "no_plate_pose"
        print(
            f"[ANPR-FUNNEL] S2_miss drop (no macro OCR) err={err} "
            f"macro={native.shape}",
            flush=True,
        )

    if ocr_src is None and det_mode in ("wpod", "wpod_only", "legacy_ccpd"):
        try:
            from wpod_net import localize_and_unwarp

            warped_w, wpod_meta = localize_and_unwarp(work)
            if not isinstance(wpod_meta, dict):
                wpod_meta = {}
            native_micro = wpod_meta.pop("nativeMicro", None)
            if isinstance(native_micro, np.ndarray):
                det_w = wpod_meta.get("det") if isinstance(wpod_meta.get("det"), dict) else None
                if isinstance(det_w, dict):
                    crop_n, meta_n = crop_micro_from_box(native, det_w, pad_frac=pad_frac)
                    if crop_n is not None and _accept_micro(crop_n, "wpodNativeSlice"):
                        abs_box = meta_n
                if ocr_src is None:
                    _accept_micro(native_micro, "wpodNativeMicro")
            if ocr_src is None and warped_w is not None:
                _accept_micro(warped_w, "wpodWarp")
            plate_meta = dict(plate_meta)
            plate_meta["wpodHatch"] = wpod_meta.get("source")
            if isinstance(wpod_meta.get("det"), dict) and abs_box is None:
                abs_box = dict(wpod_meta["det"])
        except Exception as exc:  # noqa: BLE001
            plate_meta = dict(plate_meta)
            plate_meta["wpodHatchError"] = str(exc)[:120]

    if ocr_src is None and isinstance(abs_box, dict):
        crop, meta = crop_micro_from_box(native, abs_box, pad_frac=pad_frac)
        if crop is not None:
            ocr_src = crop
            abs_box = meta
            plate_meta = dict(plate_meta)
            plate_meta["source"] = plate_meta.get("source") or "native-pad-crop-v1"
            plate_meta["det"] = meta
        else:
            sliver_meta = meta if isinstance(meta, dict) else sliver_meta

    if ocr_src is None:
        return {
            "ok": False,
            "unclear": True,
            "error": (sliver_meta or {}).get("error")
            or plate_meta.get("error")
            or "sliver_or_no_plate",
            "engine": "dual-lpr-v1",
            "cascade": "vehicle-then-plate",
            "sliverReject": sliver_meta,
            "message": "Invalid plate crop rejected — OCR skipped",
            "plateDet": {
                "source": plate_meta.get("source"),
                "architecture": plate_meta.get("architecture")
                or "stage2-ph-id-plates-yolo-v1",
                "error": plate_meta.get("error"),
                "weights": plate_meta.get("weights"),
                "seatbelt": plate_meta.get("seatbelt"),
            },
            "uiMacro": native,
            "macroW": mw,
            "macroH": mh,
        }

    oh, ow = ocr_src.shape[:2]
    if not s2_forced and not is_valid_micro_size(ow, oh):
        return {
            "ok": False,
            "unclear": True,
            "error": "sliver_reject",
            "engine": "dual-lpr-v1",
            "cascade": "vehicle-then-plate",
            "sliverReject": {"w": ow, "h": oh, "minW": MIN_MICRO_W, "minH": MIN_MICRO_H},
            "message": "Micro-crop below 30×15 — not passed to OCR",
            "uiMacro": native,
        }

    # Best-plate-over-track: rank for UI only. OCR MUST use this frame's Stage-2 plate crop.
    # (Rank score used area×sharpness — a large vehicle-ish crop could beat a tight plate and
    #  feed RapidOCR the wrong tensor → single-glyph hallucinations.)
    ui_micro = np.ascontiguousarray(ocr_src.copy())
    rank_meta: dict[str, Any] = {}
    ocr_target = np.ascontiguousarray(ocr_src.copy())
    if track_id:
        _is_nb, best_micro, rank_meta = consider_plate_crop(
            track_id, ocr_src, plate_meta if isinstance(plate_meta, dict) else {}
        )
        # UI may show ranked best; never replace OCR input with best_micro
        if isinstance(best_micro, np.ndarray) and best_micro.size > 0:
            ui_micro = np.ascontiguousarray(best_micro.copy())
        tid = str(track_id).strip()
        with _lock:
            cached = dict(_plate_ocr_cache.get(tid) or {}) if tid else {}
        if (
            not s2_forced
            and not _is_nb
            and not do_force
            and cached
            and cached.get("plate") is not None
        ):
            raw = dict(cached)
            raw["ocrSkipped"] = "not_new_best"
            raw["cropRank"] = rank_meta
            raw["uiMicro"] = ui_micro
            raw["uiMacro"] = native
            if abs_box:
                raw["det"] = abs_box
            raw["cascade"] = "vehicle-then-plate"
            raw["plateDet"] = {
                "source": plate_meta.get("source"),
                "architecture": plate_meta.get("architecture")
                or "stage2-ph-id-plates-yolo-v1",
                "boxPad": pad_frac,
            }
            return raw

    try:
        from anpr_funnel_log import bump
        bump("ocr_sent", 1)
    except Exception:
        pass
    print(
        "[ANPR-FUNNEL] OCR_sent=1 stage2_src="
        + str((plate_meta or {}).get("source") or "?")
        + (" s2_forced=1" if s2_forced else "")
        + f" plate_crop={getattr(ocr_target, 'shape', None)} macro={getattr(native, 'shape', None)}"
        + f" ocr_input=stage2_pad{pad_frac:.2f}",
        flush=True,
    )
    # Strict cascade: Stage-2 plate crop only (already expanded via BOX_PAD / pad_xyxy).
    plate_crop = np.ascontiguousarray(ocr_target.copy()) if ocr_target is not None else np.ascontiguousarray(ocr_src.copy())
    raw = {
        "ok": False,
        "unclear": True,
        "error": "ocr_not_run",
        "engine": "rapidocr-onnx",
        "rawText": "",
        "plate": None,
        "plateCompact": None,
        "conf": 0.0,
        "confidence": 0.0,
    }
    print(
        f"[RAPID-OCR] Starting OCR on shape: {getattr(plate_crop, 'shape', None)} (stage2_expanded)",
        flush=True,
    )
    try:
        from rapid_ocr_engine import read_with_rapidocr

        ocr_raw = read_with_rapidocr(np.ascontiguousarray(plate_crop))
        detected_text = str(ocr_raw.get("rawText") or "")
        highest_conf = float(ocr_raw.get("conf") or 0.0)
        hit = _normalize_engine_hit(ocr_raw, engine_id="A-rapidocr")
        raw = {
            "ok": bool(hit.get("ok") and detected_text),
            "unclear": not bool(hit.get("ok") and detected_text),
            "rawText": detected_text,
            "plate": hit.get("plate") or (detected_text or None),
            "plateCompact": hit.get("plateCompact") or (detected_text or None),
            "plateText": hit.get("plate") or detected_text or None,
            "conf": highest_conf,
            "confidence": highest_conf,
            "engine": "rapidocr-onnx",
            "ocrModel": "RapidOCR-onnx",
            "ocrPath": ocr_path,
            "drop": bool(hit.get("drop")),
            "error": hit.get("error"),
            "regexOk": hit.get("regexOk"),
        }
    except Exception as e:
        import traceback
        print(f"\n[RAPID-OCR] crashed: {e}", flush=True)
        traceback.print_exc()
        print("\n", flush=True)
        raw = {
            "ok": False,
            "unclear": True,
            "error": "rapidocr_crash:" + str(e)[:160],
            "engine": "rapidocr-onnx",
            "rawText": "",
            "plate": None,
            "plateCompact": None,
            "conf": 0.0,
            "confidence": 0.0,
        }
    # Asymmetric smart re-scan — recover clipped 4th digit / 3rd letter (steep angle / tight crop)
    rescan_box = abs_box if isinstance(abs_box, dict) else None
    if rescan_box is None and isinstance(plate_meta.get("det"), dict):
        rescan_box = dict(plate_meta["det"])
    if isinstance(raw, dict) and rescan_box is not None:
        try:
            raw = asymmetric_smart_rescan(native, rescan_box, raw)
        except Exception as exc:  # noqa: BLE001
            print("[anpr-dual] asymmetric rescan skip:", repr(exc)[:120], flush=True)
    if track_id and isinstance(raw, dict):
        tid = str(track_id).strip()
        cache_keep = {
            k: raw.get(k)
            for k in (
                "ok", "unclear", "plate", "plateCompact", "conf", "confidence",
                "rawText", "engine", "ocrModel", "ocrPath", "dual", "temporalLocked",
                "error", "reviewStatus", "sharpness", "microBlurFloor", "det",
                "asymmetricRescan", "plateText",
            )
        }
        with _lock:
            _plate_ocr_cache[tid] = cache_keep
        # Feed recovered full plate into temporal vote when rescan improved
        meta = raw.get("asymmetricRescan") if isinstance(raw.get("asymmetricRescan"), dict) else None
        if meta and meta.get("usedPass") == 2 and raw.get("plate"):
            try:
                temporal_push(
                    track_id,
                    str(raw.get("plate")),
                    fm=float(raw.get("sharpness") or 0),
                    force_flush=do_force,
                )
            except Exception:  # noqa: BLE001
                pass
    if isinstance(raw, dict):
        raw["cropRank"] = rank_meta
        if raw.get("uiMicro") is None:
            raw["uiMicro"] = ui_micro
        elif not isinstance(raw.get("uiMicro"), np.ndarray):
            raw["uiMicro"] = ui_micro
        else:
            # Keep rescan crop when present; else original tight micro
            pass
    det = abs_box or (raw.get("det") if isinstance(raw, dict) and isinstance(raw.get("det"), dict) else None)
    if det is None and isinstance(plate_meta.get("det"), dict):
        det = dict(plate_meta["det"])
    # Prefer asymmetric expanded det when rescan won
    if isinstance(raw, dict) and isinstance(raw.get("asymmetricRescan"), dict):
        if raw["asymmetricRescan"].get("usedPass") == 2 and isinstance(raw.get("det"), dict):
            det = raw["det"]
    ox = int(vehicle_origin[0]) if vehicle_origin else 0
    oy = int(vehicle_origin[1]) if vehicle_origin else 0
    if isinstance(det, dict) and (ox or oy):
        det = dict(det)
        det["x"] = int(det.get("x") or 0) + ox
        det["y"] = int(det.get("y") or 0) + oy
        if det.get("x1") is not None:
            det["x1"] = int(det.get("x1") or 0) + ox
            det["x2"] = int(det.get("x2") or 0) + ox
            det["y1"] = int(det.get("y1") or 0) + oy
            det["y2"] = int(det.get("y2") or 0) + oy
        det["absolute"] = True
        raw["det"] = det
    elif isinstance(det, dict):
        raw["det"] = det
    raw["cascade"] = "vehicle-then-plate"
    raw["plateDet"] = {
        "source": plate_meta.get("source"),
        "architecture": plate_meta.get("architecture") or "stage2-ph-id-plates-yolo-v1",
        "boxPad": pad_frac,
        "minMicroW": MIN_MICRO_W,
        "minMicroH": MIN_MICRO_H,
        "conf": plate_meta.get("conf") or plate_meta.get("detScore"),
        "weights": plate_meta.get("weights"),
    }
    raw["wpod"] = raw["plateDet"]  # legacy key for health/debug readers
    # UI always shows tight detector crop (not enhanced OCR input) unless rescan crop set
    if not isinstance(raw.get("uiMicro"), np.ndarray):
        raw["uiMicro"] = ui_micro if ui_micro is not None else ocr_src
    raw["uiMacro"] = native
    return raw


def engine_b_hyperlpr(micro_bgr: np.ndarray) -> dict[str, Any]:
    """
    Engine B — HyperLPR3 only (heavy / static / CCTV path).
    PP-OCR purged — never called from dual_lpr.
    """
    if micro_bgr is None or getattr(micro_bgr, "size", 0) == 0:
        return _normalize_engine_hit(
            {"ok": False, "error": "bad_file", "rawText": "", "conf": 0},
            engine_id="B-hyperlpr3",
        )

    from hyperlpr_engine import read_with_hyperlpr

    try:
        raw = read_with_hyperlpr(micro_bgr)
    except Exception as exc:  # noqa: BLE001
        raw = {
            "ok": False,
            "unclear": True,
            "error": "engine_b_exception",
            "message": str(exc)[:160],
            "rawText": "",
            "conf": 0,
        }
    hit = _normalize_engine_hit(raw, engine_id="B-hyperlpr3")
    hit["ocrModel"] = (raw or {}).get("ocrModel") or "HyperLPR3"
    return hit


# Legacy name — heavy path only (no PP-OCR)
engine_b_transformer = engine_b_hyperlpr


def consensus_arbitrate(
    eng_a: dict[str, Any],
    eng_b: dict[str, Any],
) -> dict[str, Any]:
    """
    Intra-frame consensus matrix:
      - strings match → approve
      - mismatch → higher conf (≥ CONSENSUS_CONF) + regional regex wins
    """
    pa = (eng_a or {}).get("plate")
    pb = (eng_b or {}).get("plate")
    ca = float((eng_a or {}).get("conf") or 0)
    cb = float((eng_b or {}).get("conf") or 0)
    ra = bool((eng_a or {}).get("regexOk"))
    rb = bool((eng_b or {}).get("regexOk"))

    out: dict[str, Any] = {
        "engineA": {k: eng_a.get(k) for k in ("engineId", "plate", "conf", "rawText", "ok", "regexOk")},
        "engineB": {k: eng_b.get(k) for k in ("engineId", "plate", "conf", "rawText", "ok", "regexOk", "ocrModel")},
        "consensusMode": None,
        "approved": False,
        "plate": None,
        "plateCompact": None,
        "conf": 0.0,
        "winner": None,
    }

    if pa and pb and str(pa) == str(pb):
        out["approved"] = True
        out["plate"] = pa
        out["plateCompact"] = pa
        out["conf"] = max(ca, cb)
        out["winner"] = "agree"
        out["consensusMode"] = "match"
        return out

    candidates = []
    if pa and ra:
        candidates.append(("A", pa, ca, eng_a))
    if pb and rb:
        candidates.append(("B", pb, cb, eng_b))
    if not candidates:
        # Do NOT soft-emit non-regex plates (SEBAXYIN / slogans)
        out["consensusMode"] = "none"
        out["approved"] = False
        out["plate"] = None
        out["plateCompact"] = None
        out["unclear"] = True
        out["plateText"] = "UNCLEAR"
        return out

    # Prefer conf ≥ floor; else highest conf among regex-valid
    hard = [c for c in candidates if c[2] >= CONSENSUS_CONF]
    pool = hard if hard else candidates
    pool.sort(key=lambda x: x[2], reverse=True)
    w = pool[0]
    out["approved"] = True if hard else (w[2] >= CONSENSUS_CONF * 0.85)
    out["plate"] = w[1]
    out["plateCompact"] = w[1]
    out["conf"] = w[2]
    out["winner"] = w[0]
    out["consensusMode"] = "high_conf_regex" if hard else "regex_best"
    return out


def _compact_plate(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(s or "").upper())


def parse_plate_prefix_suffix(text: str) -> tuple[str, str]:
    """Split OCR into alpha prefix + numeric suffix (PH LTO shape)."""
    c = _compact_plate(text)
    if not c:
        return "", ""
    m = re.match(r"^([A-Z]{1,4})(\d{1,5})$", c)
    if m:
        return m.group(1), m.group(2)
    # Soft split: leading letters then trailing digits
    m2 = re.match(r"^([A-Z]+)(\d+)$", c)
    if m2:
        return m2.group(1), m2.group(2)
    letters = re.sub(r"[^A-Z]", "", c)
    digits = re.sub(r"[^0-9]", "", c)
    return letters, digits


def truncation_missing_flags(text: str) -> tuple[bool, bool, str, str]:
    """
    missing_left  = only 2 letters (3rd alpha clipped)
    missing_right = only 3 digits (4th digit clipped) — e.g. NKE726 vs NKE7265
    """
    prefix, suffix = parse_plate_prefix_suffix(text)
    missing_left = len(prefix) == 2
    missing_right = len(suffix) == 3
    return missing_left, missing_right, prefix, suffix


def _box_xyxy(box: dict[str, Any], fw: int, fh: int) -> Optional[tuple[int, int, int, int]]:
    if not isinstance(box, dict) or fw < 2 or fh < 2:
        return None
    xyxy = resolve_xyxy_to_pixels(box, fw, fh)
    if xyxy is None:
        return None
    x1, y1, x2, y2 = xyxy
    if x2 - x1 < 8 or y2 - y1 < 6:
        return None
    return int(x1), int(y1), int(x2), int(y2)


def expand_box_asymmetric(
    box: dict[str, Any],
    fw: int,
    fh: int,
    *,
    missing_left: bool,
    missing_right: bool,
) -> Optional[tuple[int, int, int, int]]:
    """
    Asymmetric smart re-crop:
      missing_left  → expand left by 15% of width
      missing_right → expand right by 20% of width
      +5% vertical pad for angle skew
    """
    xyxy = _box_xyxy(box, fw, fh)
    if xyxy is None:
        return None
    x_min, y_min, x_max, y_max = xyxy
    width = max(1, x_max - x_min)
    height = max(1, y_max - y_min)
    new_x_min, new_x_max = x_min, x_max
    if missing_left:
        new_x_min = max(0, x_min - int(width * 0.15))
    if missing_right:
        new_x_max = min(fw, x_max + int(width * 0.20))
    pad_y = max(1, int(height * 0.05))
    new_y_min = max(0, y_min - pad_y)
    new_y_max = min(fh, y_max + pad_y)
    if new_x_max - new_x_min < 8 or new_y_max - new_y_min < 6:
        return None
    return new_x_min, new_y_min, new_x_max, new_y_max


def _hit_conf01(hit: dict[str, Any]) -> float:
    conf = float((hit or {}).get("conf") or (hit or {}).get("confidence") or 0)
    if conf > 1.0:
        conf = conf / 100.0
    return conf


def _hit_text(hit: dict[str, Any]) -> str:
    return str(
        (hit or {}).get("plate")
        or (hit or {}).get("plateCompact")
        or (hit or {}).get("rawText")
        or ""
    ).strip()


def asymmetric_smart_rescan(
    parent_bgr: np.ndarray,
    plate_box: Optional[dict[str, Any]],
    pass1: dict[str, Any],
) -> dict[str, Any]:
    """
    Second FastALPR pass with asymmetric expand when LTO looks truncated
    (2 letters or 3 digits). Arbitrate vs pass-1; repair via ph_soft_confusion.
    """
    if not isinstance(pass1, dict) or parent_bgr is None or getattr(parent_bgr, "size", 0) == 0:
        return pass1
    if not isinstance(plate_box, dict):
        return pass1

    text1 = _hit_text(pass1)
    if not text1:
        return pass1
    missing_left, missing_right, prefix1, suffix1 = truncation_missing_flags(text1)
    if not missing_left and not missing_right:
        return pass1

    fh, fw = parent_bgr.shape[:2]
    expanded = expand_box_asymmetric(
        plate_box, fw, fh, missing_left=missing_left, missing_right=missing_right
    )
    if expanded is None:
        return pass1
    x0, y0, x1, y1 = expanded
    crop2 = parent_bgr[y0:y1, x0:x1]
    if crop2 is None or getattr(crop2, "size", 0) == 0:
        return pass1
    if is_blown_out_glare(crop2):
        return pass1

    pass2 = engine_a_fastlpr(np.ascontiguousarray(crop2.copy()))
    text2 = _hit_text(pass2)
    conf1 = _hit_conf01(pass1)
    conf2 = _hit_conf01(pass2)
    prefix2, suffix2 = parse_plate_prefix_suffix(text2)

    recovered_right = missing_right and len(suffix2) == 4
    recovered_left = missing_left and len(prefix2) == 3
    use_pass2 = False
    if (recovered_right or recovered_left) and conf2 >= 0.60 and text2:
        use_pass2 = True
    elif text2 and conf2 > conf1:
        use_pass2 = True

    chosen = pass2 if use_pass2 else pass1
    chosen_text = _hit_text(chosen)
    if not chosen_text:
        return pass1

    repaired = ph_soft_confusion(chosen_text)
    # Prefer LTO-valid repaired string when available
    try:
        from pipeline import validate_lto_plate_syntax, format_display

        locked = validate_lto_plate_syntax(repaired) or validate_lto_plate_syntax(chosen_text)
        if locked:
            repaired = locked
            display = format_display(locked)
        else:
            display = repaired
    except Exception:  # noqa: BLE001
        display = repaired
        locked = repaired if len(_compact_plate(repaired)) >= 5 else None

    out = dict(pass1)
    out["asymmetricRescan"] = {
        "triggered": True,
        "missingLeft": missing_left,
        "missingRight": missing_right,
        "pass1": {"text": text1, "conf": round(conf1, 4), "prefix": prefix1, "suffix": suffix1},
        "pass2": {
            "text": text2,
            "conf": round(conf2, 4),
            "prefix": prefix2,
            "suffix": suffix2,
            "box": [x0, y0, x1, y1],
        },
        "usedPass": 2 if use_pass2 else 1,
        "recoveredLeft": bool(recovered_left and use_pass2),
        "recoveredRight": bool(recovered_right and use_pass2),
    }
    if locked or (use_pass2 and repaired):
        plate = _compact_plate(locked or repaired)
        out["ok"] = True
        out["unclear"] = False
        out["plate"] = plate
        out["plateCompact"] = plate
        out["plateText"] = display if isinstance(display, str) else plate
        out["rawText"] = text2 if use_pass2 else text1
        out["conf"] = conf2 if use_pass2 else conf1
        out["confidence"] = out["conf"]
        out["error"] = None
        out["reviewStatus"] = None
        out["uiMicro"] = np.ascontiguousarray(crop2.copy()) if use_pass2 else pass1.get("uiMicro")
        # Keep expanded det for debug / Node mapping
        out["det"] = {
            "x": x0,
            "y": y0,
            "w": x1 - x0,
            "h": y1 - y0,
            "x1": x0,
            "y1": y0,
            "x2": x1,
            "y2": y1,
            "source": "asymmetric-rescan-v1",
            "score": conf2 if use_pass2 else conf1,
        }
    return out


def ph_soft_confusion(compact: str) -> str:
    """
    Position-aware PH soft fix after char vote:
      letter block: 1→I, 0→O
      digit block:  I→1, O→0, L→1
    """
    c = _compact_plate(compact)
    m = re.match(r"^([A-Z0-9]{2,3})(\d{3,4})$", c)
    if not m:
        # Try split: leading letters then digits
        m2 = re.match(r"^([A-Z]{2,3})([A-Z0-9]{3,4})$", c)
        if not m2:
            return c
        letters, digits = m2.group(1), m2.group(2)
    else:
        letters, digits = m.group(1), m.group(2)
    # Normalize letter block to A–Z only for soft pass
    letters = re.sub(r"[^A-Z0-9]", "", letters)
    digits = re.sub(r"[^A-Z0-9]", "", digits)
    letters = letters.replace("1", "I").replace("0", "O")
    letters = re.sub(r"[^A-Z]", "", letters) or letters
    digits = digits.replace("I", "1").replace("O", "0").replace("L", "1")
    digits = re.sub(r"[^0-9]", "", digits) or digits
    out = letters + digits
    return out if len(out) >= 5 else c


def _split_ph_blocks(compact: str) -> Optional[tuple[str, str]]:
    c = _compact_plate(compact)
    c = ph_soft_confusion(c)
    m = re.match(r"^([A-Z]{2,3})(\d{3,4})$", c)
    if m:
        return m.group(1), m.group(2)
    m2 = re.match(r"^([A-Z]{2,3})([0-9]{3,4})$", c)
    if m2:
        return m2.group(1), m2.group(2)
    return None


def char_majority_plate(plates: list[str]) -> Optional[str]:
    """
    Per-character majority across OCR votes (same track).
    Digits voted first; letters voted among samples that agree on digits.
    """
    from collections import Counter

    comps = [_compact_plate(p) for p in plates if _compact_plate(p)]
    comps = [c for c in comps if len(c) >= 5]
    if not comps:
        return None
    if len(comps) == 1:
        return ph_soft_confusion(comps[0])

    blocks: list[tuple[str, str]] = []
    for c in comps:
        sp = _split_ph_blocks(c)
        if sp:
            blocks.append(sp)
    if not blocks:
        # Fall back: raw char columns on modal length
        len_counts = Counter(len(c) for c in comps)
        target_len = len_counts.most_common(1)[0][0]
        pool = [c for c in comps if len(c) == target_len] or comps
        chars = []
        for i in range(max(len(c) for c in pool)):
            col = [c[i] for c in pool if len(c) > i]
            if not col:
                break
            chars.append(Counter(col).most_common(1)[0][0])
        return ph_soft_confusion("".join(chars)) if chars else None

    # Digit-block majority (prefer length 4 then 3)
    dig_lens = Counter(len(d) for _, d in blocks)
    dig_len = 4 if dig_lens.get(4, 0) >= dig_lens.get(3, 0) else (
        dig_lens.most_common(1)[0][0]
    )
    dig_pool = [d for _, d in blocks if len(d) == dig_len]
    if not dig_pool:
        dig_pool = [d for _, d in blocks]
        dig_len = len(dig_pool[0])
    digits = "".join(
        Counter([d[i] for d in dig_pool if len(d) > i]).most_common(1)[0][0]
        for i in range(dig_len)
    )

    # Letters among samples whose digits match majority (or share ≥2 digit chars)
    letter_pool = [lett for lett, d in blocks if d == digits or (
        len(d) == len(digits) and sum(a == b for a, b in zip(d, digits)) >= max(2, len(digits) - 1)
    )]
    if not letter_pool:
        letter_pool = [lett for lett, _ in blocks]
    let_len = 3 if sum(1 for L in letter_pool if len(L) == 3) >= sum(
        1 for L in letter_pool if len(L) == 2
    ) else (2 if any(len(L) == 2 for L in letter_pool) else 3)
    letter_pool = [L for L in letter_pool if len(L) == let_len] or letter_pool
    letters = "".join(
        Counter([L[i] for L in letter_pool if len(L) > i]).most_common(1)[0][0]
        for i in range(min(let_len, max(len(L) for L in letter_pool)))
    )
    return ph_soft_confusion(letters + digits)


def temporal_push(
    track_id: Optional[str],
    plate: Optional[str],
    *,
    fm: float = 0.0,
    force_flush: Optional[bool] = None,
) -> dict[str, Any]:
    """
    Temporal lock — keep TEMPORAL_N sharpest samples; lock via character majority vote.
    Does not publish on first wrong whole-string alone (needs TEMPORAL_MIN_LOCK samples).
    """
    tid = str(track_id or "").strip()
    compact = _compact_plate(plate or "")
    do_force = TEMPORAL_FORCE_FLUSH if force_flush is None else bool(force_flush)
    fm_v = float(fm or 0.0)
    if not tid or not compact:
        return {
            "temporalLocked": False,
            "lockedPlate": None,
            "votes": [],
            "trackId": tid or None,
            "forceFlushed": False,
            "bestFm": fm_v,
            "voteMode": "char_majority",
        }
    with _lock:
        lst = list(_temporal.get(tid) or [])
        lst.append((compact, fm_v))
        lst.sort(key=lambda x: x[1], reverse=True)
        _temporal[tid] = lst[:TEMPORAL_N]
        votes = list(_temporal[tid])
    plates = [p for p, _ in votes]
    counts: dict[str, int] = {}
    for v in plates:
        counts[v] = counts.get(v, 0) + 1
    sharpest = votes[0]
    char_voted = char_majority_plate(plates)
    locked = False
    force_flushed = False
    locked_plate: Optional[str] = None
    n = len(votes)
    if n >= TEMPORAL_MIN_LOCK and char_voted:
        locked = True
        locked_plate = char_voted
        if do_force and n < TEMPORAL_N:
            force_flushed = True
    elif n >= TEMPORAL_N and char_voted:
        locked = True
        locked_plate = char_voted
    elif do_force and n >= 1:
        # Preview only — not locked until MIN_LOCK (avoids KAD/WAI/XA spam)
        force_flushed = True
        locked_plate = char_voted or ph_soft_confusion(sharpest[0])
        locked = n >= TEMPORAL_MIN_LOCK and bool(locked_plate)
    return {
        "temporalLocked": locked,
        "lockedPlate": locked_plate if locked else None,
        "previewPlate": locked_plate,
        "votes": plates,
        "voteFm": [{"plate": p, "fm": round(f, 2)} for p, f in votes],
        "voteCounts": counts,
        "charVoted": char_voted,
        "trackId": tid,
        "temporalN": TEMPORAL_N,
        "temporalMinLock": TEMPORAL_MIN_LOCK,
        "forceFlushed": force_flushed,
        "bestFm": round(float(sharpest[1]), 2) if votes else 0.0,
        "voteMode": "char_majority",
    }


def temporal_clear(track_id: Optional[str]) -> None:
    tid = str(track_id or "").strip()
    if not tid:
        return
    with _lock:
        _temporal.pop(tid, None)
        _plate_rank.pop(tid, None)
        _plate_ocr_cache.pop(tid, None)


def dual_infer_micro(
    micro_bgr: np.ndarray,
    *,
    track_id: Optional[str] = None,
    stabilize: bool = True,
    force_flush: Optional[bool] = None,
    path: Optional[str] = None,
    skip_gates: bool = False,
) -> dict[str, Any]:
    """
    Path-routed OCR on Micro-Crop + consensus + temporal lock.
      live  → FastALPR only, blur < MICRO_BLUR_LIVE (35)
      heavy → FastALPR + HyperLPR, blur < MICRO_BLUR_HEAVY (100)
    skip_gates=True (Stage-2 force): bypass sliver/aspect/glare pre-rejects.
    """
    ocr_path = resolve_ocr_path(path)
    blur_floor = micro_blur_floor_for(ocr_path)

    if micro_bgr is None or getattr(micro_bgr, "size", 0) == 0:
        return {
            "ok": False,
            "unclear": True,
            "error": "bad_file",
            "engine": "dual-lpr-v1",
            "ocrPath": ocr_path,
            "reviewStatus": "Unclear / Manual Review",
        }

    src = stabilize_frame(micro_bgr) if stabilize else np.ascontiguousarray(micro_bgr.copy())
    sh, sw = src.shape[:2]
    if not skip_gates and not is_valid_micro_size(sw, sh):
        return {
            "ok": False,
            "unclear": True,
            "error": "sliver_reject",
            "engine": "dual-lpr-v1",
            "ocrPath": ocr_path,
            "reviewStatus": "Unclear / Manual Review",
            "message": f"Micro-crop {sw}x{sh} below {MIN_MICRO_W}x{MIN_MICRO_H} — OCR skipped",
            "sliverReject": {"w": sw, "h": sh, "minW": MIN_MICRO_W, "minH": MIN_MICRO_H},
            "plateText": "UNCLEAR",
        }
    if not skip_gates and not is_valid_plate_aspect(sw, sh):
        return {
            "ok": False,
            "unclear": True,
            "error": "aspect_reject",
            "engine": "dual-lpr-v1",
            "ocrPath": ocr_path,
            "reviewStatus": "Unclear / Manual Review",
            "message": f"Micro aspect {sw/max(sh,1):.2f} outside [{PLATE_ASPECT_MIN},{PLATE_ASPECT_MAX}] — decal reject",
            "plate": None,
            "plateCompact": None,
            "plateText": "UNCLEAR",
        }
    if not skip_gates and is_blown_out_glare(src):
        return {
            "ok": False,
            "unclear": True,
            "error": "glare_blown_out",
            "engine": "dual-lpr-v1",
            "ocrPath": ocr_path,
            "reviewStatus": "Unclear / Manual Review",
            "message": "Crop >75% pixels >240 — OCR skipped",
            "plate": None,
            "plateCompact": None,
            "plateText": "UNCLEAR",
            "rawText": "",
        }

    # Blur gate runs inside engine_a after 80px resize (not on raw micro)
    fm = micro_laplacian_fm(src)
    # Always raw micro into engine (prep/binarize happens in engine_a)
    micro_crop = src

    # Independent buffers so engines never share mutable state
    buf_a = np.ascontiguousarray(micro_crop.copy())
    buf_b = np.ascontiguousarray(micro_crop.copy())

    eng_a: dict[str, Any] = {}
    eng_b: dict[str, Any] = {
        "engineId": "B-off",
        "ok": False,
        "plate": None,
        "conf": 0,
        "regexOk": False,
    }

    if ocr_path == "live":
        # Live/BWC single-engine fast-path — FastALPR only (no HyperLPR, no PP-OCR)
        eng_a = engine_a_fastlpr(buf_a, allow_blurry=skip_gates)
        if eng_a.get("status") == "blurry":
            eng_a["engine"] = "dual-lpr-v1"
            eng_a["ocrPath"] = ocr_path
            eng_a["microBlurFloor"] = BLUR_REJECT_FM
            return eng_a
        if eng_a.get("drop") is True or not ocr_text_is_publishable(
            eng_a.get("rawText") or eng_a.get("plate") or ""
        ):
            return {
                "ok": False,
                "drop": True,
                "unclear": False,
                "error": "ocr_empty_or_short",
                "engine": "dual-lpr-v1",
                "ocrPath": ocr_path,
                "rawText": str(eng_a.get("rawText") or ""),
                "conf": float(eng_a.get("conf") or 0),
                "plate": None,
                "plateCompact": None,
                "plateText": None,
            }
        consensus = consensus_arbitrate(
            eng_a,
            {"plate": None, "conf": 0, "regexOk": False, "engineId": "B-off"},
        )
        # No Engine B — accept soft-locked FastALPR at live floor 0.50
        if eng_a.get("plate") and not consensus.get("approved"):
            ca = float(eng_a.get("conf") or 0)
            if ca > 1.0:
                ca = ca / 100.0
            if eng_a.get("regexOk") or eng_a.get("ok") or ca >= 0.50:
                consensus["approved"] = True
                consensus["plate"] = eng_a.get("plate")
                consensus["plateCompact"] = eng_a.get("plate")
                consensus["conf"] = ca
                consensus["winner"] = "A"
                consensus["consensusMode"] = "live_single"
        ocr_model = "FastALPR-live-fast-path"
    elif not DUAL_ENABLED:
        eng_a = engine_a_fastlpr(buf_a, allow_blurry=skip_gates)
        consensus = consensus_arbitrate(
            eng_a,
            {"plate": None, "conf": 0, "regexOk": False, "engineId": "B-off"},
        )
        ocr_model = "FastALPR-heavy-single"
    else:
        # Static / hi-res / CCTV heavy-path — FastALPR + HyperLPR
        with ThreadPoolExecutor(max_workers=2, thread_name_prefix="dual-lpr") as pool:
            fut_a = pool.submit(engine_a_fastlpr, buf_a, allow_blurry=skip_gates)
            fut_b = pool.submit(engine_b_hyperlpr, buf_b)
            for fut in as_completed([fut_a, fut_b]):
                if fut is fut_a:
                    eng_a = fut.result()
                else:
                    eng_b = fut.result()
        consensus = consensus_arbitrate(eng_a, eng_b)
        ocr_model = "dual-FastALPR+HyperLPR3"

    plate = consensus.get("plate")
    if plate and not track_id:
        plate = ph_soft_confusion(str(plate))
    conf = float(consensus.get("conf") or 0)
    do_force = TEMPORAL_FORCE_FLUSH if force_flush is None else bool(force_flush)
    temporal = temporal_push(
        track_id,
        plate if consensus.get("approved") else None,
        fm=fm,
        force_flush=do_force,
    )

    # Prefer character-majority temporal lock; no track → soft-confused consensus
    final_plate = temporal.get("lockedPlate")
    if not final_plate and not track_id and consensus.get("approved") and plate:
        final_plate = ph_soft_confusion(str(plate))
    final_locked = bool(temporal.get("temporalLocked")) or (
        bool(consensus.get("approved")) and consensus.get("consensusMode") == "match" and not track_id
    )
    # With track_id: publish only when char-majority lock ready (min 2 votes)
    if track_id:
        ok = bool(final_plate) and bool(temporal.get("temporalLocked"))
    else:
        ok = bool(final_plate) and bool(consensus.get("approved"))

    # Pick det meta from winning engine raw
    winner = consensus.get("winner")
    raw_src = (eng_b if winner == "B" else eng_a) if winner in ("A", "B") else (eng_a or eng_b)
    if consensus.get("consensusMode") == "match":
        raw_src = eng_b if float(eng_b.get("conf") or 0) >= float(eng_a.get("conf") or 0) else eng_a
    det = None
    raw_blob = (raw_src or {}).get("raw") or {}
    if isinstance(raw_blob, dict):
        det = raw_blob.get("det")

    unclear = not ok or not final_plate
    return {
        "ok": bool(ok and final_plate),
        "unclear": unclear,
        "reviewStatus": "Unclear / Manual Review" if unclear else None,
        "rawText": final_plate or str((eng_a or {}).get("rawText") or (eng_b or {}).get("rawText") or ""),
        "conf": conf,
        "confidence": conf,
        "plate": final_plate,
        "plateCompact": final_plate,
        "engine": "dual-lpr-v1",
        "ocrModel": ocr_model,
        "ocrPath": ocr_path,
        "sharpness": round(fm, 2),
        "microBlurFloor": BLUR_REJECT_FM,
        "det": det,
        "dual": {
            "path": ocr_path,
            "consensus": consensus,
            "temporal": temporal,
            "temporalLocked": bool(temporal.get("temporalLocked")),
            "forceFlushed": bool(temporal.get("forceFlushed")),
            "intraApproved": bool(consensus.get("approved")),
            "finalLocked": final_locked,
            "sharpness": round(fm, 2),
        },
        "temporalLocked": bool(temporal.get("temporalLocked")),
        "error": None if (ok and final_plate) else ("temporal_pending" if plate and track_id and not temporal.get("temporalLocked") else "plate_not_found"),
    }
