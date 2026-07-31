"""
ANPR plate ROI — detect plate rectangle(s) before OCR.
ANPR-PH-OCR-HARDEN-V1: hard aspect/area gates, prefer smallest valid ROI.
"""
from __future__ import annotations

import os
import re
from typing import Any, Optional

import cv2
import numpy as np

# Bumper / slogan noise that must not become "the plate"
BAN_TEXT = re.compile(
    r"UV\s*EXP|EXPRESS|SERVICE|TOUCH|DON'?T|METROMALL|ANTIPOLO|PILIPINAS|"
    r"NCR\s*UV|PHONE|HTTP|WWW|\d{4}[- ]?\d{3}[- ]?\d{4}",
    re.I,
)

MIN_ASPECT = float(os.environ.get("FM_ANPR_ROI_MIN_ASPECT", "1.5") or "1.5")
MAX_ASPECT = float(os.environ.get("FM_ANPR_ROI_MAX_ASPECT", "5.5") or "5.5")
MIN_AREA_FRAC = float(os.environ.get("FM_ANPR_ROI_MIN_AREA", "0.0015") or "0.0015")
MAX_AREA_FRAC = float(os.environ.get("FM_ANPR_ROI_MAX_AREA", "0.06") or "0.06")
MIN_CROP_H = max(8, int(os.environ.get("FM_ANPR_MIN_CROP_H", "20") or "20"))
MAX_ROIS = max(1, min(5, int(os.environ.get("FM_ANPR_ROI_MAX", "3") or "3")))
PAD_FRAC = float(os.environ.get("FM_ANPR_ROI_PAD", "0.12") or "0.12")


def _clip_box(x0: int, y0: int, x1: int, y1: int, w: int, h: int) -> Optional[tuple[int, int, int, int]]:
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    if x1 - x0 < 12 or y1 - y0 < 8:
        return None
    return x0, y0, x1, y1


def _pad_box(x0: int, y0: int, x1: int, y1: int, w: int, h: int, pad: float = PAD_FRAC) -> tuple[int, int, int, int]:
    bw, bh = x1 - x0, y1 - y0
    px, py = int(bw * pad), int(bh * pad * 1.2)
    return (
        max(0, x0 - px),
        max(0, y0 - py),
        min(w, x1 + px),
        min(h, y1 + py),
    )


def roi_area(roi: dict[str, Any]) -> int:
    return max(1, (roi["x1"] - roi["x0"]) * (roi["y1"] - roi["y0"]))


def box_hard_gate(x0: int, y0: int, x1: int, y1: int, img_w: int, img_h: int) -> bool:
    """Hard reject van-sized / non-plate boxes before OCR."""
    bw, bh = max(1, x1 - x0), max(1, y1 - y0)
    aspect = bw / float(bh)
    area = (bw * bh) / float(max(1, img_w * img_h))
    if aspect < MIN_ASPECT or aspect > MAX_ASPECT:
        return False
    if area > MAX_AREA_FRAC:
        return False
    if bh < MIN_CROP_H:
        return False
    return True


def roi_passes_hard_gate(roi: dict[str, Any], img_w: int, img_h: int) -> bool:
    source = str(roi.get("source") or "")
    if source in ("full_tight", "full_skip"):
        bw = roi["x1"] - roi["x0"]
        bh = max(1, roi["y1"] - roi["y0"])
        aspect = bw / float(bh)
        if aspect < MIN_ASPECT or aspect > MAX_ASPECT:
            return False
        return bh >= MIN_CROP_H
    # YOLO pack already class-filtered — allow larger plate fraction (up to 18%)
    if source == "yolo":
        bw = max(1, roi["x1"] - roi["x0"])
        bh = max(1, roi["y1"] - roi["y0"])
        aspect = bw / float(bh)
        area = (bw * bh) / float(max(1, img_w * img_h))
        if aspect < 1.2 or aspect > 6.5:
            return False
        if area > 0.18 or bh < 10:
            return False
        return True
    return box_hard_gate(roi["x0"], roi["y0"], roi["x1"], roi["y1"], img_w, img_h)


def crop_passes_hard_gate(crop_bgr: np.ndarray, frame_shape: tuple[int, ...]) -> bool:
    if crop_bgr is None or crop_bgr.size == 0:
        return False
    fh, fw = frame_shape[:2]
    ch, cw = crop_bgr.shape[:2]
    return box_hard_gate(0, 0, cw, ch, fw, fh)


def _score_box(x0: int, y0: int, x1: int, y1: int, img_w: int, img_h: int) -> float:
    if not box_hard_gate(x0, y0, x1, y1, img_w, img_h):
        return -1.0
    bw, bh = max(1, x1 - x0), max(1, y1 - y0)
    aspect = bw / float(bh)
    area = (bw * bh) / float(img_w * img_h)
    if area < MIN_AREA_FRAC:
        return -1.0
    aspect_score = 1.0 - min(1.0, abs(aspect - 4.0) / 3.0)
    cy = (y0 + y1) / 2.0 / img_h
    vert_score = max(0.0, min(1.0, 1.0 - abs(cy - 0.62) * 1.4))
    size_score = 1.0 - min(1.0, abs(area - 0.025) / 0.08)
    return aspect_score * 0.45 + vert_score * 0.35 + size_score * 0.20


def opencv_plate_rois(img_bgr: np.ndarray) -> list[dict[str, Any]]:
    """Morphology + contours → plate-like rectangles (torch-free)."""
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 7, 50, 50)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 5))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
    enh = cv2.add(blackhat, tophat)
    blur = cv2.GaussianBlur(enh, (5, 5), 0)
    edges = cv2.Canny(blur, 60, 160)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (21, 5)))
    edges = cv2.dilate(edges, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)), iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out: list[dict[str, Any]] = []
    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        score = _score_box(x, y, x + bw, y + bh, w, h)
        if score < 0.25:
            continue
        x0, y0, x1, y1 = _pad_box(x, y, x + bw, y + bh, w, h)
        clipped = _clip_box(x0, y0, x1, y1, w, h)
        if not clipped:
            continue
        xa, ya, xb, yb = clipped
        if not box_hard_gate(xa, ya, xb, yb, w, h):
            continue
        out.append({
            "x0": xa, "y0": ya, "x1": xb, "y1": yb,
            "score": round(score, 4),
            "source": "opencv",
        })
    out.sort(key=lambda r: r["score"], reverse=True)
    return _dedupe_rois(out)[:MAX_ROIS]


def _box_from_poly(poly: Any) -> Optional[tuple[int, int, int, int]]:
    try:
        pts = np.array(poly, dtype=np.float32).reshape(-1, 2)
        x0 = int(np.min(pts[:, 0]))
        y0 = int(np.min(pts[:, 1]))
        x1 = int(np.max(pts[:, 0]))
        y1 = int(np.max(pts[:, 1]))
        return x0, y0, x1, y1
    except Exception:  # noqa: BLE001
        return None


def paddle_line_rois(img_bgr: np.ndarray, ocr_engine) -> list[dict[str, Any]]:
    """Use Paddle det+rec lines, keep only plate-shaped lines, ban slogan text."""
    if ocr_engine is None:
        return []
    h, w = img_bgr.shape[:2]
    try:
        result = ocr_engine.ocr(img_bgr, cls=True)
    except TypeError:
        result = ocr_engine.ocr(img_bgr)
    if not result:
        return []
    lines = result[0] if isinstance(result, list) and result else result
    if not lines or isinstance(lines, dict):
        return []

    out: list[dict[str, Any]] = []
    for item in lines:
        if not item or not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        box = _box_from_poly(item[0])
        if not box:
            continue
        x0, y0, x1, y1 = box
        info = item[1]
        text = ""
        conf = 0.0
        if isinstance(info, (list, tuple)) and len(info) >= 2:
            text = str(info[0] or "")
            conf = float(info[1] or 0)
        elif isinstance(info, str):
            text = info
        if BAN_TEXT.search(text or ""):
            continue
        letters = re.sub(r"[^A-Za-z]", "", text)
        digits = re.sub(r"[^0-9]", "", text)
        if len(letters) >= 10 and len(digits) == 0:
            continue
        if len(digits) < 2:
            continue
        score = _score_box(x0, y0, x1, y1, w, h)
        if score < 0.2:
            continue
        compact = re.sub(r"[^A-Z0-9]", "", text.upper())
        if re.search(r"[A-Z]{2,3}\d{2,4}", compact):
            score += 0.35
        if conf >= 0.7:
            score += 0.1
        xa, ya, xb, yb = _pad_box(x0, y0, x1, y1, w, h, pad=0.18)
        clipped = _clip_box(xa, ya, xb, yb, w, h)
        if not clipped:
            continue
        xa, ya, xb, yb = clipped
        if not box_hard_gate(xa, ya, xb, yb, w, h):
            continue
        out.append({
            "x0": xa, "y0": ya, "x1": xb, "y1": yb,
            "score": round(score, 4),
            "source": "paddle_line",
            "hintText": text[:40],
            "hintConf": round(conf, 4),
        })
    out.sort(key=lambda r: r["score"], reverse=True)
    return _dedupe_rois(out)[:MAX_ROIS]


def _iou(a: dict[str, Any], b: dict[str, Any]) -> float:
    ax0, ay0, ax1, ay1 = a["x0"], a["y0"], a["x1"], a["y1"]
    bx0, by0, bx1, by1 = b["x0"], b["y0"], b["x1"], b["y1"]
    ix0, iy0 = max(ax0, bx0), max(ay0, by0)
    ix1, iy1 = min(ax1, bx1), min(ay1, by1)
    iw, ih = max(0, ix1 - ix0), max(0, iy1 - iy0)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = max(1, (ax1 - ax0) * (ay1 - ay0))
    area_b = max(1, (bx1 - bx0) * (by1 - by0))
    return inter / float(area_a + area_b - inter)


def _dedupe_rois(rois: list[dict[str, Any]], iou_thr: float = 0.45) -> list[dict[str, Any]]:
    kept: list[dict[str, Any]] = []
    for r in rois:
        if any(_iou(r, k) >= iou_thr for k in kept):
            continue
        kept.append(r)
    return kept


def yolo_plate_rois(img_bgr: np.ndarray, yolo_model) -> list[dict[str, Any]]:
    """ANPR-PLATE-YOLO-PACK — boxes from ONNX/Ultralytics plate engine."""
    if yolo_model is None:
        return []
    h, w = img_bgr.shape[:2]
    try:
        if hasattr(yolo_model, "predict_boxes"):
            raw = yolo_model.predict_boxes(img_bgr, conf_thr=0.22)
        else:
            # legacy ultralytics YOLO object
            results = yolo_model.predict(img_bgr, verbose=False, conf=0.22)
            raw = []
            if results and getattr(results[0], "boxes", None) is not None:
                boxes = results[0].boxes
                for i in range(len(boxes)):
                    xyxy = boxes.xyxy[i].tolist()
                    conf = float(boxes.conf[i].item()) if boxes.conf is not None else 0.5
                    raw.append({
                        "x0": int(xyxy[0]), "y0": int(xyxy[1]),
                        "x1": int(xyxy[2]), "y1": int(xyxy[3]),
                        "conf": conf,
                    })
        out: list[dict[str, Any]] = []
        for b in raw:
            x0, y0, x1, y1 = int(b["x0"]), int(b["y0"]), int(b["x1"]), int(b["y1"])
            conf = float(b.get("conf") or 0.5)
            # YOLO pack: softer gate — model already plate-class; still kill van-sized
            bw, bh = max(1, x1 - x0), max(1, y1 - y0)
            aspect = bw / float(bh)
            area = (bw * bh) / float(max(1, w * h))
            if aspect < 1.2 or aspect > 6.5:
                continue
            if area > 0.18 or bh < 10:
                continue
            score = _score_box(x0, y0, x1, y1, w, h)
            if score < 0:
                score = 0.45 + conf * 0.5
            else:
                score = score + conf * 0.55
            xa, ya, xb, yb = _pad_box(x0, y0, x1, y1, w, h, pad=0.08)
            clipped = _clip_box(xa, ya, xb, yb, w, h)
            if not clipped:
                continue
            xa, ya, xb, yb = clipped
            out.append({
                "x0": xa, "y0": ya, "x1": xb, "y1": yb,
                "score": round(score, 4),
                "source": "yolo",
                "detConf": round(conf, 4),
            })
        out.sort(key=lambda r: (-float(r.get("detConf") or 0), roi_area(r)))
        return _dedupe_rois(out)[:MAX_ROIS]
    except Exception:  # noqa: BLE001
        return []


def dedupe_rois(rois: list[dict[str, Any]], iou_thr: float = 0.45) -> list[dict[str, Any]]:
    return _dedupe_rois(rois, iou_thr=iou_thr)


def merge_detect_rois(
    img_bgr: np.ndarray,
    *,
    ocr_engine=None,
    yolo_model=None,
) -> list[dict[str, Any]]:
    """
    ANPR-PLATE-YOLO-PACK-AND-READ-V1:
    If plate YOLO hits → OCR those crops only (no OpenCV/Paddle-line mix).
    Else fall back to OpenCV + paddle lines + yellow hint caller.
    """
    h, w = img_bgr.shape[:2]
    yolo = yolo_plate_rois(img_bgr, yolo_model)
    if yolo:
        return yolo[:MAX_ROIS]
    rois: list[dict[str, Any]] = []
    rois.extend(opencv_plate_rois(img_bgr))
    rois.extend(paddle_line_rois(img_bgr, ocr_engine))
    rois = _dedupe_rois(rois)
    rois = [r for r in rois if roi_passes_hard_gate(r, w, h)]
    rois.sort(key=lambda r: (roi_area(r), -float(r.get("score") or 0)))
    return rois[:MAX_ROIS]


def crop_roi(img_bgr: np.ndarray, roi: dict[str, Any]) -> np.ndarray:
    return img_bgr[roi["y0"]:roi["y1"], roi["x0"]:roi["x1"]].copy()


def looks_like_tight_plate_crop(img_bgr: np.ndarray) -> bool:
    """Operator already cropped tightly on the plate."""
    h, w = img_bgr.shape[:2]
    aspect = w / float(max(1, h))
    return MIN_ASPECT <= aspect <= MAX_ASPECT and h <= 420 and w <= 900 and h >= MIN_CROP_H


def yellow_hint_roi(img_bgr: np.ndarray) -> Optional[dict[str, Any]]:
    """
    ANPR-YELLOW-PUV-LOCK-V1 — if mid-lower band is yellow PUV paint, propose that band as ROI.
    Used when wide rear shots miss OpenCV/Paddle plate box.
    """
    if img_bgr is None or img_bgr.size == 0 or len(img_bgr.shape) < 3:
        return None
    h, w = img_bgr.shape[:2]
    y0, y1 = int(h * 0.45), int(h * 0.85)
    x0, x1 = int(w * 0.20), int(w * 0.80)
    band = img_bgr[y0:y1, x0:x1]
    if band.size == 0:
        return None
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV)
    mean_h = float(np.mean(hsv[:, :, 0]))
    mean_s = float(np.mean(hsv[:, :, 1]))
    if not (mean_s > 70 and 12 <= mean_h <= 50):
        return None
    # Tighten to yellow mask centroid box if possible
    mask = cv2.inRange(hsv, (12, 80, 80), (50, 255, 255))
    ys, xs = np.where(mask > 0)
    if len(xs) < 80:
        return {"x0": x0, "y0": y0, "x1": x1, "y1": y1, "score": 0.35, "source": "opencv"}
    bx0 = x0 + int(np.min(xs))
    bx1 = x0 + int(np.max(xs)) + 1
    by0 = y0 + int(np.min(ys))
    by1 = y0 + int(np.max(ys)) + 1
    pad = 8
    bx0, by0 = max(0, bx0 - pad), max(0, by0 - pad)
    bx1, by1 = min(w, bx1 + pad), min(h, by1 + pad)
    if not box_hard_gate(bx0, by0, bx1, by1, w, h):
        # Yellow blob may be plate-shaped after pad fail — still try mid band if aspect ok
        aspect = (bx1 - bx0) / float(max(1, by1 - by0))
        if aspect < 1.2 or aspect > 6.5:
            return {"x0": x0, "y0": y0, "x1": x1, "y1": y1, "score": 0.3, "source": "opencv"}
    return {"x0": bx0, "y0": by0, "x1": bx1, "y1": by1, "score": 0.55, "source": "opencv"}


def main_line_band_crop(crop_bgr: np.ndarray, *, band_frac: float = 0.6, trim_top: float = 0.08) -> np.ndarray:
    """OCR top band only — drops NCR UV EXP footer on tight yellow PUV crops."""
    if crop_bgr is None or crop_bgr.size == 0:
        return crop_bgr
    h, w = crop_bgr.shape[:2]
    y0 = int(h * trim_top) if trim_top > 0 else 0
    y1 = max(y0 + 12, int(h * band_frac))
    if y1 >= h - 4:
        return crop_bgr
    band = crop_bgr[y0:y1, :]
    return band if band.size > 0 else crop_bgr
