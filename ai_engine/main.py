"""
Axiom RF-DETR Weapon Detection Engine — LOCAL CPU INFERENCE ONLY.

Lab: Intel i9 / 32GB RAM / no NVIDIA GPU.
Do not train here — use ai_engine/train.py on Colab or a cloud GPU, then copy
weapon_rfdetr_best.pt into ai_engine/weights/.
"""
from __future__ import annotations

import io
import os
import threading
from typing import Any, Optional

# Force CPU before importing heavy torch / rfdetr stacks
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ.setdefault("FM_WEAPON_AI_ENGINE_DEVICE", "cpu")

import torch
from fastapi import FastAPI, File, UploadFile
from PIL import Image

app = FastAPI(title="Axiom RF-DETR Weapon Detection Engine (CPU Mode)")

# FORCE CPU
DEVICE = torch.device("cpu")
print(f"[*] Hardware set to: {DEVICE}")

HERE = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_PATH = os.path.join(HERE, "weights", "weapon_rfdetr_best.pt")
CONF_FLOOR = float(os.environ.get("FM_AI_ENGINE_CONF", "0.65") or "0.65")

_model = None
_model_err: Optional[str] = None
_load_lock = threading.Lock()
_weights_kind = "base"  # custom | base


def _move_model_to_cpu(model: Any) -> None:
    """Best-effort: pin RF-DETR inner modules to CPU."""
    try:
        inner = getattr(model, "model", None)
        if inner is None:
            return
        if hasattr(inner, "model") and hasattr(inner.model, "to"):
            inner.model = inner.model.to(DEVICE)
        if hasattr(inner, "device"):
            try:
                inner.device = DEVICE
            except Exception:
                pass
        # Common: Model wraps .device as string
        if hasattr(inner, "device"):
            try:
                inner.device = "cpu"
            except Exception:
                pass
    except Exception as e:
        print(f"[!] CPU move warn: {e}")


def _load_model():
    global _model, _model_err, _weights_kind
    if _model is not None:
        return _model
    with _load_lock:
        if _model is not None:
            return _model
        from rfdetr import RFDETRMedium, RFDETRNano

        print("[*] Initializing RF-DETR Weapon Model...")
        try:
            if os.path.exists(WEIGHTS_PATH) and os.path.getsize(WEIGHTS_PATH) > 100000:
                print(f"[+] Loading custom fine-tuned weights from: {WEIGHTS_PATH}")
                # Custom fine-tune: 7-class weapon head (Handgun, Knife, Missile, Rifle, Shotgun, Sword, Tank)
                m = RFDETRMedium(
                    resolution=640,
                    num_classes=7,
                    pretrain_weights=WEIGHTS_PATH,
                    device="cpu",
                )
                _weights_kind = "custom"
            else:
                print("[!] Custom weights not found yet. Loading base RF-DETR pipeline...")
                m = RFDETRNano(resolution=640, device="cpu")
                _weights_kind = "base"
            _move_model_to_cpu(m)
            _model = m
            _model_err = None
            print(f"[+] Model ready on {DEVICE} (kind={_weights_kind})")
            return _model
        except Exception as e:
            _model_err = str(e)[:240]
            print(f"[!] Model load failed: {_model_err}")
            raise


@app.on_event("startup")
def _warm() -> None:
    try:
        _load_model()
    except Exception:
        pass


@app.get("/health")
def health() -> dict:
    ready = _model is not None
    return {
        "ok": ready,
        "ready": ready,
        "device": str(DEVICE),
        "weights_kind": _weights_kind,
        "weights_path": WEIGHTS_PATH,
        "weights_present": os.path.isfile(WEIGHTS_PATH),
        "conf_floor": CONF_FLOOR,
        "error": _model_err,
    }


@app.post("/api/v1/detect")
async def detect_weapons(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    try:
        model = _load_model()
    except Exception as e:
        return {
            "success": False,
            "error": "engine_not_ready",
            "message": _model_err or str(e)[:240],
            "detections": [],
        }

    # Run on CPU model; filter confidence > 0.65 (env override FM_AI_ENGINE_CONF)
    detections = model.predict(image, threshold=max(0.25, min(0.95, CONF_FLOOR)))
    out = []
    class_ids = getattr(detections, "class_id", None)
    confs = getattr(detections, "confidence", None)
    xys = getattr(detections, "xyxy", None)
    n = len(class_ids) if class_ids is not None else 0

    # Custom 1-class → weapon; base COCO / multi-class → map common weapon-ish ids if present
    for i in range(n):
        conf = float(confs[i]) if confs is not None else 0.0
        if conf < CONF_FLOOR:
            continue
        cid = int(class_ids[i]) if class_ids is not None else -1
        if _weights_kind == "custom":
            label = "weapon"
        else:
            # Base RF-DETR is COCO-style; keep generic label only when class looks weapon-related
            # (RF-DETR base has no dedicated gun class — return class id string for lab visibility)
            label = f"class_{cid}"
        box = None
        if xys is not None:
            row = xys[i]
            box = [float(row[0]), float(row[1]), float(row[2]), float(row[3])]
        out.append({
            "label": label,
            "confidence": round(conf, 4),
            "box": box,
        })

    return {"success": True, "detections": out, "device": str(DEVICE), "weights_kind": _weights_kind}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("FM_AI_ENGINE_PORT", "8770") or "8770")
    uvicorn.run(app, host="127.0.0.1", port=port)
