"""
Ubitron FR SeetaFace6 lab sidecar — Windows lab proof.

mob-fr-seeta-windows-lab-proof:
  Same REST shape as fr-sidecar-fast (/health, /represent, /represent-probe, /verify).
  Uses SeetaFace6Open via community ctypes wrapper (vendor/seetaFace6Python).
  Default bind 127.0.0.1:8767 — does not replace onnx :8766 until later wire MOB.

Legal: SeetaFace6 open edition — BSD-style + vendor free commercial/personal claim;
confirm with counsel before customer ship.
"""
from __future__ import annotations

import base64
import os
import sys
import time
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

ENGINE_NAME = "seeta"
MODEL_NAME = os.environ.get("FM_FR_SEETA_MODEL", "face_recognizer").strip() or "face_recognizer"
PORT = int(os.environ.get("FM_FR_SIDECAR_SEETA_PORT", "8767") or "8767")

ROOT = os.path.dirname(os.path.abspath(__file__))
VENDOR_SEETA = os.path.join(ROOT, "vendor", "seetaFace6Python")
MODEL_DIR = os.path.join(VENDOR_SEETA, "seetaface", "model")

REQUIRED_MODELS = (
    "face_detector.csta",
    "face_landmarker_pts5.csta",
    "face_recognizer.csta",
)
OPTIONAL_POSE_MODEL = "pose_estimation.csta"

app = FastAPI(title="Ubitron FR Seeta Lab", version="0.1.0-lab")

_face = None
_load_error: Optional[str] = None
_load_ms: float = 0.0
_feature_dims: int = 1024
_pose_enabled = False


def _models_present() -> tuple[bool, list[str]]:
    missing = []
    for name in REQUIRED_MODELS:
        p = os.path.join(MODEL_DIR, name)
        if not os.path.isfile(p):
            missing.append(name)
    return (len(missing) == 0, missing)


def _ensure_vendor_path() -> None:
    if VENDOR_SEETA not in sys.path:
        sys.path.insert(0, VENDOR_SEETA)


def _optional_model_present(name: str) -> bool:
    return os.path.isfile(os.path.join(MODEL_DIR, name))


def _get_face():
    global _face, _load_error, _load_ms, _feature_dims, _pose_enabled
    if _face is not None:
        return _face
    if _load_error:
        return None
    ok, missing = _models_present()
    if not ok:
        _load_error = "models_missing:" + ",".join(missing)
        return None
    win_dll = os.path.join(VENDOR_SEETA, "seetaface", "lib", "win", "libFaceAPI.dll")
    if not os.path.isfile(win_dll):
        _load_error = "windows_dll_missing"
        return None
    try:
        _ensure_vendor_path()
        from seetaface.api import (  # type: ignore
            FACE_DETECT,
            FACE_POSE_EX,
            FACERECOGNITION,
            LANDMARKER5,
            SeetaFace,
        )

        t0 = time.perf_counter()
        mask = FACE_DETECT | FACERECOGNITION | LANDMARKER5
        if _optional_model_present(OPTIONAL_POSE_MODEL):
            mask |= FACE_POSE_EX
        _face = SeetaFace(mask)
        _load_ms = (time.perf_counter() - t0) * 1000.0
        _feature_dims = 1024
        _pose_enabled = bool(mask & FACE_POSE_EX)
        return _face
    except Exception as exc:  # noqa: BLE001
        _load_error = str(exc)[:400]
        _face = None
        return None


def _feature_to_list(feature) -> list[float]:
    return [float(feature[i]) for i in range(len(feature))]


def _l2_normalize(vec: list[float]) -> list[float]:
    import math

    n = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / n for x in vec]


def _cosine_sim(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    return float(sum(x * y for x, y in zip(a, b)))


def _largest_detect(detect_result) -> Any:
    if detect_result is None or getattr(detect_result, "size", 0) <= 0:
        return None
    best = None
    best_area = -1.0
    for i in range(int(detect_result.size)):
        face = detect_result.data[i].pos
        w = float(getattr(face, "width", 0) or 0)
        h = float(getattr(face, "height", 0) or 0)
        area = w * h
        if area > best_area:
            best_area = area
            best = face
    return best


def _jpeg_b64(img_bgr, quality: int = 88) -> Optional[str]:
    import cv2

    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return None
    ok, buf = cv2.imencode(".jpg", img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        return None
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _crop_jpeg_b64(img_bgr, face) -> Optional[str]:
    x = int(getattr(face, "x", 0))
    y = int(getattr(face, "y", 0))
    w = int(getattr(face, "width", 0))
    h = int(getattr(face, "height", 0))
    if w <= 0 or h <= 0:
        return None
    ih, iw = img_bgr.shape[:2]
    pad_x = int(w * 0.55)
    pad_y = int(h * 0.55)
    x0 = max(0, x - pad_x)
    y0 = max(0, y - pad_y)
    x1 = min(iw, x + w + pad_x)
    y1 = min(ih, y + h + pad_y)
    if x1 <= x0 or y1 <= y0:
        return None
    crop = img_bgr[y0:y1, x0:x1]
    return _jpeg_b64(crop, 85)


def _normalized_aligned_chip(sf, img_bgr, points):
    import cv2

    try:
        chip = sf.CropFace(img_bgr, points)
    except Exception:  # noqa: BLE001
        chip = None
    if chip is None or getattr(chip, "size", 0) == 0:
        return None
    chip = cv2.resize(chip, (256, 256))
    # BWC crops are often backlit. CLAHE lifts face detail without changing geometry.
    lab = cv2.cvtColor(chip, cv2.COLOR_BGR2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_chan = clahe.apply(l_chan)
    return cv2.cvtColor(cv2.merge((l_chan, a_chan, b_chan)), cv2.COLOR_LAB2BGR)


def _quality_metrics(img_bgr, face, pose_status: Optional[int]) -> dict[str, Any]:
    import cv2
    import numpy as np

    x = int(getattr(face, "x", 0))
    y = int(getattr(face, "y", 0))
    w = int(getattr(face, "width", 0))
    h = int(getattr(face, "height", 0))
    ih, iw = img_bgr.shape[:2]
    x0 = max(0, x)
    y0 = max(0, y)
    x1 = min(iw, x + max(0, w))
    y1 = min(ih, y + max(0, h))
    roi = img_bgr[y0:y1, x0:x1] if x1 > x0 and y1 > y0 else img_bgr
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    mean = float(np.mean(gray)) if gray.size else 0.0
    contrast = float(np.std(gray)) if gray.size else 0.0
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var()) if gray.size else 0.0
    dark_pct = float(np.mean(gray < 45) * 100.0) if gray.size else 100.0
    bright_pct = float(np.mean(gray > 230) * 100.0) if gray.size else 0.0
    min_face = max(0, min(w, h))
    size_score = min(1.0, min_face / 140.0)
    sharp_score = min(1.0, sharpness / 1200.0)
    light_score = max(0.0, 1.0 - (dark_pct / 55.0) - (bright_pct / 80.0))
    contrast_score = min(1.0, contrast / 55.0)
    pose_score = 1.0
    if pose_status is not None:
        pose_score = {0: 0.35, 1: 0.72, 2: 1.0}.get(int(pose_status), 0.7)
    quality_score = (
        size_score * 0.25
        + sharp_score * 0.25
        + light_score * 0.25
        + contrast_score * 0.15
        + pose_score * 0.10
    )
    return {
        "sharpness": round(sharpness, 1),
        "brightness": round(mean, 1),
        "contrast": round(contrast, 1),
        "darkPct": round(dark_pct, 1),
        "brightPct": round(bright_pct, 1),
        "qualityScore": round(max(0.0, min(1.0, quality_score)), 4),
        "poseStatus": pose_status,
    }


def _run_probe(path: str, enroll_gate: bool = False, keep_feature: bool = False) -> dict[str, Any]:
    import cv2

    sf = _get_face()
    if sf is None:
        ok, missing = _models_present()
        return {
            "ok": False,
            "error": _load_error or "engine_broken",
            "modelsOk": ok,
            "missingModels": missing,
            "engine": ENGINE_NAME,
            "model": MODEL_NAME,
            "hint": "Run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1 and place *.csta models.",
        }
    t0 = time.perf_counter()
    img = cv2.imread(path)
    if img is None:
        return {"ok": False, "error": "imread_failed", "engine": ENGINE_NAME, "model": MODEL_NAME}
    t_det0 = time.perf_counter()
    detect_result = sf.Detect(img)
    face = _largest_detect(detect_result)
    t_det1 = time.perf_counter()
    detect_ms = (t_det1 - t_det0) * 1000.0
    if face is None:
        return {
            "ok": False,
            "error": "no_face",
            "engine": ENGINE_NAME,
            "model": MODEL_NAME,
            "detectMs": round(detect_ms, 2),
            "totalMs": round((time.perf_counter() - t0) * 1000.0, 2),
        }
    t_emb0 = time.perf_counter()
    points = sf.mark5(img, face)
    pose_status: Optional[int] = None
    if _pose_enabled:
        try:
            pose_status = int(sf.check(img, face, points))
        except Exception:  # noqa: BLE001
            pose_status = None
    quality = _quality_metrics(img, face, pose_status)
    aligned_chip = _normalized_aligned_chip(sf, img, points)
    # Seeta's native Extract(img, landmarks) already aligns internally and scored
    # higher on BWC A/B than feeding a normalized chip to ExtractCroppedFace.
    feature = sf.Extract(img, points)
    emb = _l2_normalize(_feature_to_list(feature))
    t_emb1 = time.perf_counter()
    embed_ms = (t_emb1 - t_emb0) * 1000.0
    out: dict[str, Any] = {
        "ok": True,
        "embedding": emb,
        "dims": len(emb),
        "engine": ENGINE_NAME,
        "model": MODEL_NAME,
        "detector": "seeta_face_detector",
        "faceWidth": int(getattr(face, "width", 0) or 0),
        "faceHeight": int(getattr(face, "height", 0) or 0),
        "faceCount": int(getattr(detect_result, "size", 1) or 1),
        "sharpness": quality["sharpness"],
        "brightness": quality["brightness"],
        "contrast": quality["contrast"],
        "darkPct": quality["darkPct"],
        "brightPct": quality["brightPct"],
        "qualityScore": quality["qualityScore"],
        "poseStatus": quality["poseStatus"],
        "chipMode": "landmark-extract",
        "detectMs": round(detect_ms, 2),
        "embedMs": round(embed_ms, 2),
        "totalMs": round((time.perf_counter() - t0) * 1000.0, 2),
        "enrollGate": bool(enroll_gate),
    }
    if keep_feature:
        out["_feature"] = feature
    if not enroll_gate:
        out["probe"] = True
        crop_b64 = _jpeg_b64(aligned_chip, 90) if aligned_chip is not None else _crop_jpeg_b64(img, face)
        if crop_b64:
            out["cropJpegB64"] = crop_b64
            out["cropMode"] = "aligned-face" if aligned_chip is not None else "bust"
    return out


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


def _write_temp_b64(b64: str, suffix: str = ".jpg") -> str:
    import tempfile

    raw = str(b64 or "").strip()
    if raw.startswith("data:") and "," in raw:
        raw = raw.split(",", 1)[1]
    data = base64.b64decode(raw)
    fd, path = tempfile.mkstemp(prefix="seeta-lab-", suffix=suffix)
    os.close(fd)
    with open(path, "wb") as f:
        f.write(data)
    return path


def _path_from_body(path: Optional[str], b64: Optional[str]) -> tuple[str, Optional[str]]:
    """Returns (path, cleanup_path_or_None)."""
    if path:
        if not os.path.isfile(path):
            raise HTTPException(status_code=400, detail="path not found")
        return path, None
    if b64:
        tmp = _write_temp_b64(b64)
        return tmp, tmp
    raise HTTPException(status_code=400, detail="Provide path or image_b64")


def _path_or_400(body: RepresentJson) -> tuple[str, Optional[str]]:
    return _path_from_body(body.path, body.image_b64)


@app.on_event("startup")
def _warmup() -> None:
    _get_face()


@app.get("/health")
def health() -> dict[str, Any]:
    ok_models, missing = _models_present()
    fa = _get_face()
    ready = fa is not None
    return {
        "ok": ready,
        "ready": ready,
        "service": "fr-sidecar-seeta",
        "engine": ENGINE_NAME,
        "fallback": "onnx",
        "model": MODEL_NAME,
        "dims": _feature_dims if ready else None,
        "loadOnceMs": round(_load_ms, 2) if ready else None,
        "error": None if ready else (_load_error or "not_loaded"),
        "modelsOk": ok_models,
        "missingModels": missing,
        "poseEnabled": bool(_pose_enabled),
        "optionalPoseModel": OPTIONAL_POSE_MODEL if _optional_model_present(OPTIONAL_POSE_MODEL) else None,
        "modelDir": MODEL_DIR,
        "labProof": True,
        "hint": None if ready else "INSTALL-SEETA-LAB.ps1 — download models into seetaface/model",
    }


@app.post("/represent")
async def represent_json(body: RepresentJson) -> JSONResponse:
    path, cleanup = _path_or_400(body)
    try:
        return JSONResponse(_run_probe(path, enroll_gate=True))
    finally:
        if cleanup:
            try:
                os.unlink(cleanup)
            except OSError:
                pass


@app.post("/represent-probe")
async def represent_probe_json(body: RepresentJson) -> JSONResponse:
    path, cleanup = _path_or_400(body)
    try:
        return JSONResponse(_run_probe(path, enroll_gate=False))
    finally:
        if cleanup:
            try:
                os.unlink(cleanup)
            except OSError:
                pass


@app.post("/represent-probe-batch")
async def represent_probe_batch(body: RepresentBatchJson) -> JSONResponse:
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
    return JSONResponse(
        {
            "ok": True,
            "engine": ENGINE_NAME,
            "model": MODEL_NAME,
            "count": len(results),
            "batchTotalMs": round((time.perf_counter() - t0) * 1000.0, 2),
            "results": results,
        }
    )


@app.post("/verify")
async def verify_json(body: VerifyJson) -> JSONResponse:
    cleanups: list[str] = []
    try:
        p1, c1 = _path_from_body(body.path1, body.image1_b64)
        p2, c2 = _path_from_body(body.path2, body.image2_b64)
        if c1:
            cleanups.append(c1)
        if c2:
            cleanups.append(c2)
        sf = _get_face()
        a = _run_probe(p1, enroll_gate=True, keep_feature=True)
        b = _run_probe(p2, enroll_gate=True, keep_feature=True)
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
        # Prefer Seeta's own similarity (demo face_recon_demo.py); cosine fallback.
        if sf is not None and a.get("_feature") is not None and b.get("_feature") is not None:
            sim = float(sf.CalculateSimilarity(a["_feature"], b["_feature"]))
        else:
            sim = _cosine_sim(a["embedding"], b["embedding"])
        score_pct = round(max(0.0, min(100.0, sim * 100.0)), 2)
        verified = score_pct >= 70.0
        return JSONResponse(
            {
                "ok": True,
                "verified": verified,
                "scorePct": score_pct,
                "similarity": round(sim, 6),
                "thresholdPct": 70,
                "engine": ENGINE_NAME,
                "model": MODEL_NAME,
                "dims": a.get("dims"),
                "detectMs": round(float(a.get("detectMs") or 0) + float(b.get("detectMs") or 0), 2),
                "embedMs": round(float(a.get("embedMs") or 0) + float(b.get("embedMs") or 0), 2),
            }
        )
    finally:
        for p in cleanups:
            try:
                os.unlink(p)
            except OSError:
                pass
