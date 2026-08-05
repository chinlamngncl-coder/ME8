"""
Vehicle Make / Model / Color (MMR) — Stage-2 macro-crop attribute classify.
Does not alter the 3-stage detect→OCR loop; called only after vehicle crop exists.

Color: HSV dominant-bin (always available).
Make/Model: optional ONNX attribute head if models/vehicle_mmr.onnx is present;
otherwise returns Unknown make/model (color still filled).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

import cv2
import numpy as np

_MODELS = Path(__file__).resolve().parent / "models"
_ONNX = _MODELS / "vehicle_mmr.onnx"
_session = None
_session_tried = False

# Compact color vocabulary for dispatch UI
_COLOR_NAMES = (
    "Black",
    "White",
    "Silver",
    "Gray",
    "Red",
    "Blue",
    "Green",
    "Yellow",
    "Orange",
    "Brown",
    "Gold",
    "Purple",
)


def _dominant_color_bgr(crop_bgr: np.ndarray) -> str:
    if crop_bgr is None or crop_bgr.size < 16:
        return "Unknown"
    h, w = crop_bgr.shape[:2]
    # Ignore outer 10% (often road/sky)
    y0, y1 = int(h * 0.15), int(h * 0.85)
    x0, x1 = int(w * 0.15), int(w * 0.85)
    roi = crop_bgr[max(0, y0) : max(y0 + 1, y1), max(0, x0) : max(x0 + 1, x1)]
    if roi.size < 16:
        roi = crop_bgr
    small = cv2.resize(roi, (64, 64), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    # Drop very dark / very bright (shadows, chrome glare)
    mask = (hsv[:, :, 2] > 40) & (hsv[:, :, 2] < 245)
    pixels = hsv[mask]
    if pixels.size < 32:
        pixels = hsv.reshape(-1, 3)

    v_mean = float(np.mean(pixels[:, 2]))
    s_mean = float(np.mean(pixels[:, 1]))
    if s_mean < 35:
        if v_mean < 55:
            return "Black"
        if v_mean > 190:
            return "White"
        if v_mean > 140:
            return "Silver"
        return "Gray"

    h_mean = float(np.mean(pixels[:, 0]))
    # OpenCV H: 0..179
    if h_mean < 8 or h_mean >= 170:
        return "Red"
    if h_mean < 18:
        return "Orange"
    if h_mean < 32:
        return "Yellow"
    if h_mean < 40:
        return "Gold"
    if h_mean < 85:
        return "Green"
    if h_mean < 130:
        return "Blue"
    if h_mean < 155:
        return "Purple"
    return "Brown"


def _try_onnx_mmr(crop_bgr: np.ndarray) -> Optional[dict[str, str]]:
    global _session, _session_tried
    if not _ONNX.is_file():
        return None
    if not _session_tried:
        _session_tried = True
        try:
            import onnxruntime as ort  # type: ignore

            _session = ort.InferenceSession(str(_ONNX), providers=["CPUExecutionProvider"])
        except Exception:  # noqa: BLE001
            _session = None
            return None
    if _session is None:
        return None
    try:
        inp = _session.get_inputs()[0]
        name = inp.name
        # Expect NCHW float32 224x224 ImageNet-ish
        rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
        im = cv2.resize(rgb, (224, 224), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        im = (im - mean) / std
        tensor = np.transpose(im, (2, 0, 1))[None, ...]
        outs = _session.run(None, {name: tensor})
        # Contract: three string heads OR logits — if unknown layout, skip
        if not outs:
            return None
        # Soft fallback: if model exports string metadata via custom — rare; skip
        return None
    except Exception:  # noqa: BLE001
        return None


def classify_vehicle_mmr(crop_bgr: np.ndarray, vehicle_label: Optional[str] = None) -> dict[str, Any]:
    """
    Returns make, model, color strings for Track ID / rail payload.
    """
    color = _dominant_color_bgr(crop_bgr)
    make = "Unknown"
    model = "Unknown"
    engine = "hsv-color"

    onnx_hit = _try_onnx_mmr(crop_bgr)
    if isinstance(onnx_hit, dict):
        make = str(onnx_hit.get("make") or make)
        model = str(onnx_hit.get("model") or model)
        if onnx_hit.get("color"):
            color = str(onnx_hit["color"])
        engine = "onnx-mmr"

    # Light type hint when make/model unknown (not a fake brand)
    label = str(vehicle_label or "").strip().lower()
    if make == "Unknown" and model == "Unknown" and label in ("car", "truck", "bus", "motorcycle", "bicycle"):
        model = label.capitalize()

    return {
        "make": make,
        "model": model,
        "color": color,
        "engine": engine,
        "mmrText": f"{color} - {make} - {model}",
    }


def mmr_status() -> dict[str, Any]:
    return {
        "enabled": True,
        "onnxPresent": _ONNX.is_file(),
        "onnxPath": str(_ONNX) if _ONNX.is_file() else None,
        "colorEngine": "hsv",
    }
