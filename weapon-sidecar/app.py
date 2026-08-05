"""
Mobility Axiom — Weapon sidecar (RF-DETR Threat, Apache-2.0).
Gun + knife only. Bind 127.0.0.1. No FR / ANPR engines.
"""
from __future__ import annotations

import base64
import io
import os
from typing import Any, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field
from PIL import Image

HOST_HINT = "127.0.0.1"
PORT_HINT = int(os.environ.get("FM_WEAPON_SIDECAR_PORT", "8769") or "8769")
WEIGHTS_URL = os.environ.get(
    "FM_WEAPON_WEIGHTS_URL",
    "https://huggingface.co/Subh775/Threat-Detection-RFDETR/resolve/main/checkpoint_best_total.pth",
)
WEIGHTS_NAME = "checkpoint_best_total.pth"
CONF_FLOOR = float(os.environ.get("FM_WEAPON_CONF", "0.50") or "0.50")
ALLOW = {"gun", "knife"}

app = FastAPI(title="Ubitron Weapon RF-DETR", version="1.0.0")

_model = None
_model_err: Optional[str] = None
_THREAT = {1: "gun", 2: "explosive", 3: "grenade", 4: "knife"}


def _weights_path() -> str:
    root = os.path.dirname(os.path.abspath(__file__))
    models = os.path.join(root, "models")
    os.makedirs(models, exist_ok=True)
    return os.path.join(models, WEIGHTS_NAME)


def _ensure_weights() -> str:
    path = _weights_path()
    if os.path.isfile(path) and os.path.getsize(path) > 100000:
        return path
    import requests

    tmp = path + ".part"
    r = requests.get(WEIGHTS_URL, stream=True, timeout=120)
    r.raise_for_status()
    with open(tmp, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 256):
            if chunk:
                f.write(chunk)
    os.replace(tmp, path)
    return path


def _load_model():
    global _model, _model_err
    if _model is not None:
        return _model
    try:
        from rfdetr import RFDETRNano

        w = _ensure_weights()
        m = RFDETRNano(resolution=640, pretrain_weights=w)
        try:
            m.optimize_for_inference()
        except Exception:
            pass
        _model = m
        _model_err = None
        return _model
    except Exception as e:
        _model_err = str(e)[:240]
        raise


def health_payload() -> dict[str, Any]:
    try:
        _load_model()
        return {
            "ok": True,
            "engine": "rfdetr-threat-apache",
            "classes": sorted(ALLOW),
            "host": HOST_HINT,
            "port": PORT_HINT,
        }
    except Exception as e:
        return {
            "ok": False,
            "engine": "rfdetr-threat-apache",
            "error": "engine_not_ready",
            "message": _model_err or str(e)[:240],
            "hint": "Run START-WEAPON.bat once (first install downloads Apache RF-DETR weights).",
        }


class DetectBody(BaseModel):
    path: str = Field(..., min_length=1)
    cam_id: Optional[str] = None


@app.get("/health")
def health() -> dict[str, Any]:
    return health_payload()


@app.post("/detect")
def detect(body: DetectBody) -> dict[str, Any]:
    if not os.path.isfile(body.path):
        return {"ok": False, "error": "bad_file"}
    try:
        model = _load_model()
    except Exception as e:
        return {
            "ok": False,
            "error": "engine_not_ready",
            "message": _model_err or str(e)[:240],
        }
    image = Image.open(body.path).convert("RGB")
    detections = model.predict(image, threshold=max(0.25, min(0.9, CONF_FLOOR)))
    hits = []
    crop_b64 = None
    class_ids = getattr(detections, "class_id", None)
    confs = getattr(detections, "confidence", None)
    xys = getattr(detections, "xyxy", None)
    n = 0
    if class_ids is not None:
        n = len(class_ids)
    for i in range(n):
        cid = int(class_ids[i])
        name = _THREAT.get(cid) or _THREAT.get(cid + 1) or str(cid).lower()
        name = str(name).strip().lower()
        if name not in ALLOW:
            continue
        conf = float(confs[i]) if confs is not None else 0.0
        box = None
        if xys is not None:
            row = xys[i]
            box = [float(row[0]), float(row[1]), float(row[2]), float(row[3])]
        hits.append({"cls": name, "conf": round(conf, 4), "box": box})
        if crop_b64 is None and box:
            x1, y1, x2, y2 = [int(max(0, v)) for v in box]
            w, h = image.size
            x1 = min(x1, w - 1)
            x2 = min(max(x2, x1 + 1), w)
            y1 = min(y1, h - 1)
            y2 = min(max(y2, y1 + 1), h)
            pad_x = int((x2 - x1) * 0.12)
            pad_y = int((y2 - y1) * 0.12)
            crop = image.crop((
                max(0, x1 - pad_x),
                max(0, y1 - pad_y),
                min(w, x2 + pad_x),
                min(h, y2 + pad_y),
            ))
            buf = io.BytesIO()
            crop.save(buf, format="JPEG", quality=85)
            crop_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return {
        "ok": True,
        "engine": "rfdetr-threat-apache",
        "cam_id": body.cam_id,
        "hits": hits,
        "crop_jpeg_b64": crop_b64,
    }
