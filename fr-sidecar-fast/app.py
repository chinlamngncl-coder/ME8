"""
Ubitron FR primary sidecar (POC) — InsightFace ONNX.

mob-fr-sidecar-primary-poc: load-once FaceAnalysis, same REST shape as DeepFace
sidecar + /represent-probe-batch + timing fields.
mob-fr-onnx-pack-off: lab default pack back to buffalo_sc (heavy buffalo_l removed).
  Next quality path = SeetaFace6 — not DeepFace, not more InsightFace pack chasing.
  Pretrained buffalo_* remain research-only for customer ship unless commercially licensed
  (docs/MOB-DISC-FR-ONNX-PACK-COMMERCIAL-LICENSE.md).

Bind 127.0.0.1 only. No live wall / PTT / SOS coupling.
Seeta path is reserved (FM_FR_ENGINE=seeta) — not implemented here.
"""
from __future__ import annotations

import base64
import os
import time
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

ENGINE_NAME = "onnx"
# mob-fr-onnx-pack-off — small lab pack. Override with FM_FR_ONNX_PACK if needed.
MODEL_PACK = os.environ.get("FM_FR_ONNX_PACK", "buffalo_sc").strip() or "buffalo_sc"
DET_SIZE = int(os.environ.get("FM_FR_ONNX_DET_SIZE", "640") or "640")
PROBE_MIN_FACE_PX = int(os.environ.get("FM_FR_PROBE_MIN_FACE_PX", "48") or "48")

app = FastAPI(title="Ubitron FR Primary Sidecar", version="0.1.0-poc")

_face_app = None
_load_error: Optional[str] = None
_load_ms: float = 0.0
_license_note_logged = False


def _get_face_app():
    """Load InsightFace once per process."""
    global _face_app, _load_error, _load_ms, _license_note_logged
    if _face_app is not None:
        return _face_app
    if _load_error:
        return None
    try:
        from insightface.app import FaceAnalysis

        if not _license_note_logged:
            _license_note_logged = True
            print(
                "[fr-sidecar-fast] loading pack=%s — InsightFace pretrained models are "
                "non-commercial research unless commercially licensed; lab use only until "
                "ship gate cleared (MOB-DISC-FR-ONNX-PACK-COMMERCIAL-LICENSE)."
                % (MODEL_PACK,),
                flush=True,
            )

        t0 = time.perf_counter()
        fa = FaceAnalysis(name=MODEL_PACK, providers=["CPUExecutionProvider"])
        fa.prepare(ctx_id=-1, det_size=(DET_SIZE, DET_SIZE))
        _load_ms = (time.perf_counter() - t0) * 1000.0
        _face_app = fa
        return _face_app
    except Exception as exc:  # noqa: BLE001
        _load_error = str(exc)[:400]
        return None


def _embedding_list(face: Any) -> Optional[list[float]]:
    emb = getattr(face, "normed_embedding", None)
    if emb is None:
        emb = getattr(face, "embedding", None)
    if emb is None:
        return None
    try:
        return [float(x) for x in list(emb)]
    except (TypeError, ValueError):
        return None


def _face_box(face: Any) -> dict[str, int]:
    bbox = getattr(face, "bbox", None)
    if bbox is None or len(bbox) < 4:
        return {"x": 0, "y": 0, "w": 0, "h": 0}
    x0, y0, x1, y1 = [int(v) for v in bbox[:4]]
    return {"x": x0, "y": y0, "w": max(0, x1 - x0), "h": max(0, y1 - y0)}


def _largest_face(faces: list) -> Any:
    def area(f: Any) -> float:
        b = getattr(f, "bbox", None)
        if b is None or len(b) < 4:
            return 0.0
        return float(max(0, b[2] - b[0]) * max(0, b[3] - b[1]))

    return max(faces, key=area)


def _crop_jpeg_b64(img_bgr, face: Any) -> Optional[str]:
    import cv2

    b = getattr(face, "bbox", None)
    if b is None or len(b) < 4:
        return None
    h, w = img_bgr.shape[:2]
    x0, y0, x1, y1 = [int(v) for v in b[:4]]
    pad_x = int((x1 - x0) * 0.55)
    pad_y = int((y1 - y0) * 0.55)
    x0 = max(0, x0 - pad_x)
    y0 = max(0, y0 - pad_y)
    x1 = min(w, x1 + pad_x)
    y1 = min(h, y1 + pad_y)
    if x1 <= x0 or y1 <= y0:
        return None
    crop = img_bgr[y0:y1, x0:x1]
    if crop is None or crop.size == 0:
        return None
    ok, buf = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    if not ok:
        return None
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _cosine_distance(a: list[float], b: list[float]) -> float:
    import math

    if len(a) != len(b) or not a:
        return 1.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    sim = dot / (na * nb)
    return float(1.0 - sim)


def _run_probe(path: str, enroll_gate: bool = False) -> dict[str, Any]:
    import cv2

    fa = _get_face_app()
    if fa is None:
        return {
            "ok": False,
            "error": "engine_broken",
            "message": _load_error or "onnx_not_loaded",
            "engine": ENGINE_NAME,
            "model": MODEL_PACK,
        }
    t0 = time.perf_counter()
    img = cv2.imread(path)
    if img is None:
        return {"ok": False, "error": "imread_failed", "engine": ENGINE_NAME, "model": MODEL_PACK}
    t_det0 = time.perf_counter()
    faces = fa.get(img)
    t_det1 = time.perf_counter()
    detect_ms = (t_det1 - t_det0) * 1000.0
    if not faces:
        total_ms = (time.perf_counter() - t0) * 1000.0
        return {
            "ok": False,
            "error": "face_not_detected",
            "engine": ENGINE_NAME,
            "model": MODEL_PACK,
            "detector": "scrfd",
            "detectMs": round(detect_ms, 2),
            "embedMs": 0.0,
            "totalMs": round(total_ms, 2),
        }
    face = _largest_face(faces)
    t_emb0 = time.perf_counter()
    emb = _embedding_list(face)
    embed_ms = (time.perf_counter() - t_emb0) * 1000.0
    total_ms = (time.perf_counter() - t0) * 1000.0
    if not emb or len(emb) < 64:
        return {
            "ok": False,
            "error": "represent_failed",
            "engine": ENGINE_NAME,
            "model": MODEL_PACK,
            "detectMs": round(detect_ms, 2),
            "embedMs": round(embed_ms, 2),
            "totalMs": round(total_ms, 2),
        }
    area = _face_box(face)
    fw, fh = int(area["w"]), int(area["h"])
    if enroll_gate and min(fw, fh) < 80:
        return {
            "ok": False,
            "error": "face_too_small",
            "gate": "face",
            "message": f"Enroll face {min(fw, fh)}px too small",
            "faceWidth": fw,
            "faceHeight": fh,
            "engine": ENGINE_NAME,
            "model": MODEL_PACK,
            "detectMs": round(detect_ms, 2),
            "embedMs": round(embed_ms, 2),
            "totalMs": round(total_ms, 2),
        }
    if min(fw, fh) < PROBE_MIN_FACE_PX and not enroll_gate:
        return {
            "ok": False,
            "error": "face_too_small",
            "gate": "face",
            "faceWidth": fw,
            "faceHeight": fh,
            "engine": ENGINE_NAME,
            "model": MODEL_PACK,
            "detectMs": round(detect_ms, 2),
            "embedMs": round(embed_ms, 2),
            "totalMs": round(total_ms, 2),
            "probe": True,
        }
    crop_b64 = _crop_jpeg_b64(img, face)
    out: dict[str, Any] = {
        "ok": True,
        "embedding": emb,
        "dims": len(emb),
        "engine": ENGINE_NAME,
        "model": MODEL_PACK,
        "detector": "scrfd",
        "facialArea": area,
        "faceWidth": fw,
        "faceHeight": fh,
        "faceCount": len(faces),
        "detectMs": round(detect_ms, 2),
        "embedMs": round(embed_ms, 2),
        "totalMs": round(total_ms, 2),
        "loadOnceMs": round(_load_ms, 2),
    }
    if not enroll_gate:
        out["probe"] = True
        out["cropJpegB64"] = crop_b64
        out["cropMode"] = "bust"
    return out


@app.on_event("startup")
def _warmup() -> None:
    # Fail soft — health reports load error; do not crash uvicorn
    _get_face_app()


@app.get("/health")
def health() -> dict[str, Any]:
    fa = _get_face_app()
    ready = fa is not None
    return {
        "ok": ready,
        "ready": ready,
        "service": "fr-sidecar-fast",
        "engine": ENGINE_NAME,
        "fallback": "deepface",
        "model": MODEL_PACK,
        "detector": "scrfd",
        "loadOnceMs": round(_load_ms, 2) if ready else None,
        "error": None if ready else (_load_error or "not_loaded"),
        "vggFaceAllowed": False,
        # Pretrained buffalo_* = non-commercial research unless commercially licensed
        "modelLicenseLabOnly": True,
    }


class RepresentJson(BaseModel):
    path: Optional[str] = None
    image_b64: Optional[str] = None
    model: Optional[str] = None


class RepresentBatchJson(BaseModel):
    paths: list[str] = Field(default_factory=list)
    model: Optional[str] = None


class VerifyJson(BaseModel):
    path1: Optional[str] = None
    path2: Optional[str] = None
    image1_b64: Optional[str] = None
    image2_b64: Optional[str] = None
    model: Optional[str] = None


def _path_or_400(body: RepresentJson) -> str:
    if body.path:
        if not os.path.isfile(body.path):
            raise HTTPException(status_code=400, detail="path not found")
        return body.path
    raise HTTPException(status_code=400, detail="Provide path (POC path-only; use DeepFace for b64 enroll UI if needed)")


@app.post("/represent")
async def represent_json(body: RepresentJson) -> JSONResponse:
    path = _path_or_400(body)
    return JSONResponse(_run_probe(path, enroll_gate=True))


@app.post("/represent-probe")
async def represent_probe_json(body: RepresentJson) -> JSONResponse:
    path = _path_or_400(body)
    return JSONResponse(_run_probe(path, enroll_gate=False))


@app.post("/represent-probe-batch")
async def represent_probe_batch(body: RepresentBatchJson) -> JSONResponse:
    """Batch probe — one HTTP call, load-once engine (mob-fr-sidecar-primary-poc)."""
    if not body.paths:
        raise HTTPException(status_code=400, detail="paths required")
    if len(body.paths) > 32:
        raise HTTPException(status_code=400, detail="max 32 paths per batch")
    t0 = time.perf_counter()
    results = []
    for p in body.paths:
        if not os.path.isfile(p):
            results.append({"ok": False, "error": "path_not_found", "path": p, "engine": ENGINE_NAME})
            continue
        row = _run_probe(p, enroll_gate=False)
        row["path"] = p
        results.append(row)
    batch_ms = (time.perf_counter() - t0) * 1000.0
    return JSONResponse(
        {
            "ok": True,
            "engine": ENGINE_NAME,
            "model": MODEL_PACK,
            "count": len(results),
            "batchTotalMs": round(batch_ms, 2),
            "results": results,
        }
    )


@app.post("/verify")
async def verify_json(body: VerifyJson) -> JSONResponse:
    if not body.path1 or not body.path2:
        raise HTTPException(status_code=400, detail="path1+path2 required for ONNX POC")
    if not os.path.isfile(body.path1) or not os.path.isfile(body.path2):
        raise HTTPException(status_code=400, detail="path1/path2 not found")
    a = _run_probe(body.path1, enroll_gate=True)
    b = _run_probe(body.path2, enroll_gate=True)
    if not a.get("ok") or not b.get("ok"):
        return JSONResponse(
            {
                "ok": False,
                "error": "verify_embed_failed",
                "a": {k: a.get(k) for k in ("ok", "error", "message")},
                "b": {k: b.get(k) for k in ("ok", "error", "message")},
                "engine": ENGINE_NAME,
            }
        )
    dist = _cosine_distance(a["embedding"], b["embedding"])
    # Provisional — calibrate; ~0.4 distance ≈ weak ArcFace threshold class
    threshold = float(os.environ.get("FM_FR_ONNX_VERIFY_DISTANCE", "0.45") or "0.45")
    verified = dist <= threshold
    score_pct = max(0.0, min(100.0, (1.0 - dist) * 100.0))
    return JSONResponse(
        {
            "ok": True,
            "verified": verified,
            "scorePct": round(score_pct, 2),
            "distance": round(dist, 6),
            "threshold": threshold,
            "engine": ENGINE_NAME,
            "model": MODEL_PACK,
            "detector": "scrfd",
            "dims": a.get("dims"),
            "detectMs": round(float(a.get("detectMs") or 0) + float(b.get("detectMs") or 0), 2),
            "embedMs": round(float(a.get("embedMs") or 0) + float(b.get("embedMs") or 0), 2),
            "totalMs": round(float(a.get("totalMs") or 0) + float(b.get("totalMs") or 0), 2),
            "scoreNote": "ONNX POC mapping — re-enroll gallery before operational use",
        }
    )


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("FM_FR_SIDECAR_HOST", "127.0.0.1")
    port = int(os.environ.get("FM_FR_SIDECAR_FAST_PORT", os.environ.get("FM_FR_SIDECAR_PORT", "8766")))
    uvicorn.run(app, host=host, port=port)
