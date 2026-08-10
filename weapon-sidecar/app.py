"""
Mobility Axiom — Weapon sidecar (RF-DETR Threat, Apache-2.0).
Gun + knife only. Bind 127.0.0.1. No FR / ANPR engines.
"""
from __future__ import annotations

import base64
import io
import os
import threading
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
SMOKE_WEIGHTS_NAME = "checkpoint_pistol_smoke.pth"
COLAB_B_NAME = "weapon_rfdetr_best.pt"  # WEAPON-B-COLAB-WIRE-SIDECAR-V1
COLAB_B_SLIM_NAME = "checkpoint_colab_b.pth"
# WEAPON-LONG-GUN-RECALL-V1 + WEAPON-KNIFE-RECALL-LAB-V1 + WEAPON-GUN-FLOOR-SHOTGUN-LAB-V1:
# gun 0.35 (shotgun / awkward carry); knife 0.42 lab
CONF_GUN = float(os.environ.get("FM_WEAPON_CONF_GUN", os.environ.get("FM_WEAPON_CONF", "0.35")) or "0.35")
CONF_KNIFE = float(os.environ.get("FM_WEAPON_CONF_KNIFE", "0.42") or "0.42")
CONF_FLOOR = min(CONF_GUN, CONF_KNIFE)  # model predict floor (per-class filter below)
ALLOW = {"gun", "knife"}
_CLS_FLOOR = {"gun": CONF_GUN, "knife": CONF_KNIFE}

app = FastAPI(title="Ubitron Weapon RF-DETR", version="1.0.0")

_model = None
_model_err: Optional[str] = None
_model_loading = False
_weights_kind = "threat"  # colab_b | pistol_smoke | threat
_THREAT = {1: "gun", 2: "explosive", 3: "grenade", 4: "knife"}
_THREAT_SMOKE = {1: "gun"}
# Colab B RFDETRMedium class_names (0-based class_id from predict)
_COLAB_B_NAMES = ["Handgun", "Knife", "Missile", "Rifle", "Shotgun", "Sword", "Tank"]
_load_lock = threading.Lock()


def _me8_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _models_dir() -> str:
    root = os.path.dirname(os.path.abspath(__file__))
    models = os.path.join(root, "models")
    os.makedirs(models, exist_ok=True)
    return models


def _colab_b_src() -> str:
    return os.path.join(_me8_root(), "ai_engine", "weights", COLAB_B_NAME)


def _weights_path() -> str:
    """Prefer Colab B, then lab smoke A, then Threat. Keep A on disk until B PASS."""
    models = _models_dir()
    colab = _colab_b_src()
    if os.path.isfile(colab) and os.path.getsize(colab) > 100000:
        return colab
    smoke = os.path.join(models, SMOKE_WEIGHTS_NAME)
    if os.path.isfile(smoke) and os.path.getsize(smoke) > 100000:
        return smoke
    return os.path.join(models, WEIGHTS_NAME)


def _ensure_weights() -> str:
    path = _weights_path()
    if os.path.isfile(path) and os.path.getsize(path) > 100000:
        return path
    # Only auto-download public Threat weights — never invent smoke/colab
    path = os.path.join(_models_dir(), WEIGHTS_NAME)
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


def _colab_product_label(raw_name: str) -> Optional[str]:
    n = str(raw_name or "").strip().lower()
    if n in ("handgun", "rifle", "shotgun"):
        return "gun"
    if n in ("knife", "sword"):
        return "knife"
    return None


def _class_map() -> dict:
    if _weights_kind == "pistol_smoke":
        return _THREAT_SMOKE
    if _weights_kind == "colab_b":
        # 0-based ids → product labels applied in detect()
        return {i: _COLAB_B_NAMES[i] for i in range(len(_COLAB_B_NAMES))}
    return _THREAT


def _export_colab_slim(src_pt: str) -> str:
    """RF-DETR loader wants {'model': state_dict}; Colab .pt is a full Lightning ckpt."""
    import torch

    slim = os.path.join(_models_dir(), COLAB_B_SLIM_NAME)
    obj = torch.load(src_pt, map_location="cpu", weights_only=False)
    if not isinstance(obj, dict) or "model" not in obj:
        raise RuntimeError("colab_b checkpoint missing model state_dict")
    torch.save({"model": obj["model"]}, slim)
    return slim


def _load_colab_b(src_pt: str):
    import torch
    from rfdetr import RFDETRMedium

    obj = torch.load(src_pt, map_location="cpu", weights_only=False)
    mc = obj.get("model_config") or {}
    slim = _export_colab_slim(src_pt)
    num_classes = int(mc.get("num_classes") or 7)
    m = RFDETRMedium(
        resolution=int(mc.get("resolution") or 576),
        num_classes=num_classes,
        pretrain_weights=slim,
        device="cpu",
        dec_layers=int(mc.get("dec_layers") or 4),
        positional_encoding_size=int(mc.get("positional_encoding_size") or 36),
        patch_size=int(mc.get("patch_size") or 16),
        num_windows=int(mc.get("num_windows") or 2),
    )
    return m


def _load_model():
    global _model, _model_err, _model_loading, _weights_kind
    if _model is not None:
        return _model
    with _load_lock:
        if _model is not None:
            return _model
        _model_loading = True
        try:
            from rfdetr import RFDETRNano

            w = _ensure_weights()
            base = os.path.basename(w)
            if base == COLAB_B_NAME or w.replace("\\", "/").endswith("ai_engine/weights/" + COLAB_B_NAME):
                try:
                    m = _load_colab_b(w)
                    _weights_kind = "colab_b"
                except Exception as e_b:
                    # Keep A until B PASS — fall back to smoke then Threat
                    smoke = os.path.join(_models_dir(), SMOKE_WEIGHTS_NAME)
                    if os.path.isfile(smoke) and os.path.getsize(smoke) > 100000:
                        _weights_kind = "pistol_smoke"
                        m = RFDETRNano(resolution=640, num_classes=1, pretrain_weights=smoke, device="cpu")
                        _model_err = "colab_b_load_failed:" + str(e_b)[:120]
                    else:
                        raise
            elif base == SMOKE_WEIGHTS_NAME:
                _weights_kind = "pistol_smoke"
                m = RFDETRNano(resolution=640, num_classes=1, pretrain_weights=w, device="cpu")
            else:
                _weights_kind = "threat"
                m = RFDETRNano(resolution=640, pretrain_weights=w, device="cpu")
            try:
                m.optimize_for_inference(compile=False)
            except Exception:
                pass
            _model = m
            if _weights_kind == "colab_b":
                _model_err = None
            return _model
        except Exception as e:
            _model_err = str(e)[:240]
            raise
        finally:
            _model_loading = False


def _warm_background() -> None:
    try:
        _load_model()
    except Exception:
        pass


@app.on_event("startup")
def _on_startup() -> None:
    threading.Thread(target=_warm_background, name="weapon-warm", daemon=True).start()


def health_payload() -> dict[str, Any]:
    # WEAPON-LIVE-KEEP-AND-FAST-OPEN-V1: never block HTTP on cold load
    base = {
        "engine": "rfdetr-threat-apache",
        "classes": sorted(ALLOW),
        "conf_gun": CONF_GUN,
        "conf_knife": CONF_KNIFE,
        "weights_kind": _weights_kind,
        "host": HOST_HINT,
        "port": PORT_HINT,
    }
    if _model is not None:
        return {
            "ok": True,
            "ready": True,
            **base,
        }
    if _model_err:
        return {
            "ok": False,
            "ready": False,
            "error": "engine_not_ready",
            "message": _model_err,
            "hint": "Run START-WEAPON.bat once (first install downloads Apache RF-DETR weights).",
            **base,
        }
    if not _model_loading:
        threading.Thread(target=_warm_background, name="weapon-warm", daemon=True).start()
    return {
        "ok": True,
        "ready": False,
        "warming": True,
        "hint": "Weapon engine is warming — Start watch is OK; detect starts when ready.",
        **base,
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
        cmap = _class_map()
        raw = cmap.get(cid) or cmap.get(cid + 1) or str(cid)
        if _weights_kind == "colab_b":
            name = _colab_product_label(str(raw))
            if not name:
                continue
        else:
            name = str(raw).strip().lower()
            if name not in ALLOW:
                continue
        conf = float(confs[i]) if confs is not None else 0.0
        floor = float(_CLS_FLOOR.get(name, CONF_FLOOR))
        if conf < floor:
            continue
        box = None
        if xys is not None:
            row = xys[i]
            box = [float(row[0]), float(row[1]), float(row[2]), float(row[3])]
        hits.append({"cls": name, "conf": round(conf, 4), "box": box})
        if crop_b64 is None and box:
            x1, y1, x2, y2 = [float(v) for v in box]
            w, h = image.size
            bw = max(1.0, x2 - x1)
            bh = max(1.0, y2 - y1)
            cx = (x1 + x2) * 0.5
            cy = (y1 + y2) * 0.5
            # Context crop (not weapon-only): ~3x box + min ~40% of short side
            side = max(bw * 3.0, bh * 3.0, min(w, h) * 0.40)
            half_w = max(side * 0.55, bw * 1.6)
            half_h = max(side * 0.55, bh * 1.6)
            left = int(max(0, cx - half_w))
            top = int(max(0, cy - half_h))
            right = int(min(w, cx + half_w))
            bottom = int(min(h, cy + half_h))
            if right - left < 8 or bottom - top < 8:
                left, top, right, bottom = 0, 0, w, h
            crop = image.crop((left, top, right, bottom))
            buf = io.BytesIO()
            crop.save(buf, format="JPEG", quality=88)
            crop_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    if crop_b64 is None:
        # No box — keep full still so Recent is still useful
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=85)
        crop_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return {
        "ok": True,
        "engine": "rfdetr-threat-apache",
        "cam_id": body.cam_id,
        "hits": hits,
        "crop_jpeg_b64": crop_b64,
    }
