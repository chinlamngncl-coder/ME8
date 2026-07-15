"""
Ubitron FR sidecar — local REST for 1:1 verify (and represent for enroll later).

Legal: DeepFace (MIT) + Facenet or SFace only. VGG-Face is forbidden (non-commercial).
Bind 127.0.0.1 only when started by ME8. No live wall coupling.
"""
from __future__ import annotations

import base64
import os
import tempfile
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Hard allow-list — never VGG-Face
ALLOWED_MODELS = ("Facenet", "Facenet512", "SFace")
DEFAULT_MODEL = os.environ.get("FM_FR_MODEL", "Facenet").strip() or "Facenet"
if DEFAULT_MODEL not in ALLOWED_MODELS:
    DEFAULT_MODEL = "Facenet"

DETECTOR = os.environ.get("FM_FR_DETECTOR", "opencv").strip() or "opencv"

# Blacklist enroll quality (DISC A2 / industry-aligned) — hard reject before embedding
# Face min 160px ≈ Facenet input + toward ICAO head-width / IED spirit (we do not measure IED).
ENROLL_MIN_FACE_PX = int(os.environ.get("FM_FR_ENROLL_MIN_FACE_PX", "160") or "160")
# Soft quality: only reject obvious mush / black / blown (MOB-DISC-FR-ENROLL-SOFT-QUALITY)
ENROLL_MIN_SHARPNESS = float(os.environ.get("FM_FR_ENROLL_MIN_SHARPNESS", "25") or "25")
ENROLL_MIN_FACE_AREA_FRAC = float(os.environ.get("FM_FR_ENROLL_MIN_FACE_AREA_FRAC", "0.03") or "0.03")
# If face box edge >= this, skip %-of-image rule (absolute size is what FR needs)
ENROLL_FACE_AREA_SKIP_PX = int(os.environ.get("FM_FR_ENROLL_FACE_AREA_SKIP_PX", "160") or "160")
ENROLL_MIN_LUMA = float(os.environ.get("FM_FR_ENROLL_MIN_LUMA", "15") or "15")
ENROLL_MAX_LUMA = float(os.environ.get("FM_FR_ENROLL_MAX_LUMA", "245") or "245")

# Live / offline probe quality (mob-fr-probe-quality-gate) — softer than enroll; reject mush only
PROBE_MIN_SHARPNESS = float(os.environ.get("FM_FR_PROBE_MIN_SHARPNESS", "15") or "15")
PROBE_MIN_FACE_PX = int(os.environ.get("FM_FR_PROBE_MIN_FACE_PX", "48") or "48")
# mob-fr-reject-clipped-face + mob-fr-snap-half-face-strict: edge margin → half face / cut-off
PROBE_CLIP_EDGE_PX = int(os.environ.get("FM_FR_CLIP_EDGE_PX", "16") or "16")
PROBE_CLIP_EDGE_FRAC = float(os.environ.get("FM_FR_CLIP_EDGE_FRAC", "0.045") or "0.045")
# mob-fr-snap-full-face-only: symmetric portrait pad — never bust / shoulders
PROBE_FACE_PAD_TOP = float(os.environ.get("FM_FR_FACE_PAD_TOP", os.environ.get("FM_FR_BUST_PAD_TOP", "0.55")) or "0.55")
PROBE_FACE_PAD_SIDE = float(os.environ.get("FM_FR_FACE_PAD_SIDE", os.environ.get("FM_FR_BUST_PAD_SIDE", "0.55")) or "0.55")
PROBE_FACE_PAD_BOTTOM = float(os.environ.get("FM_FR_FACE_PAD_BOTTOM", "0.55") or "0.55")
PROBE_FACE_MIN_H_MULT = float(os.environ.get("FM_FR_FACE_MIN_H_MULT", "1.45") or "1.45")
PROBE_FACE_MIN_W_MULT = float(os.environ.get("FM_FR_FACE_MIN_W_MULT", "1.35") or "1.35")
# mob-fr-snap-rail-scene-display: wider scene context for rail (face + background)
PROBE_SCENE_PAD_TOP = float(os.environ.get("FM_FR_SCENE_PAD_TOP", "0.85") or "0.85")
PROBE_SCENE_PAD_SIDE = float(os.environ.get("FM_FR_SCENE_PAD_SIDE", "1.35") or "1.35")
PROBE_SCENE_PAD_BOTTOM = float(os.environ.get("FM_FR_SCENE_PAD_BOTTOM", "1.15") or "1.15")
PROBE_SCENE_MIN_H_MULT = float(os.environ.get("FM_FR_SCENE_MIN_H_MULT", "2.00") or "2.00")
PROBE_SCENE_MIN_W_MULT = float(os.environ.get("FM_FR_SCENE_MIN_W_MULT", "2.20") or "2.20")
PROBE_SCENE_MAX_FACE_H_FRAC = float(os.environ.get("FM_FR_SCENE_MAX_FACE_H_FRAC", "0.52") or "0.52")
PROBE_SCENE_MAX_FACE_W_FRAC = float(os.environ.get("FM_FR_SCENE_MAX_FACE_W_FRAC", "0.48") or "0.48")
PROBE_BUST_MIN_PAD_KEPT = float(os.environ.get("FM_FR_BUST_MIN_PAD_KEPT", "0.55") or "0.55")
PROBE_BUST_MAX_FACE_H_FRAC = float(os.environ.get("FM_FR_BUST_MAX_FACE_H_FRAC", "0.66") or "0.66")
PROBE_BUST_MAX_FACE_W_FRAC = float(os.environ.get("FM_FR_BUST_MAX_FACE_W_FRAC", "0.70") or "0.70")

app = FastAPI(title="Ubitron FR Sidecar", version="0.1.0")


def _facial_area_wh(area: Any) -> tuple[int, int]:
    if not isinstance(area, dict):
        return 0, 0
    try:
        w = int(area.get("w") or area.get("width") or 0)
        h = int(area.get("h") or area.get("height") or 0)
        if w > 0 and h > 0:
            return w, h
        # DeepFace sometimes returns left/top/right/bottom
        left = int(area.get("left") or 0)
        top = int(area.get("top") or 0)
        right = int(area.get("right") or 0)
        bottom = int(area.get("bottom") or 0)
        if right > left and bottom > top:
            return right - left, bottom - top
        return 0, 0
    except (TypeError, ValueError):
        return 0, 0


def _facial_area_box(area: Any) -> Optional[tuple[int, int, int, int]]:
    """Return (x0, y0, x1, y1) for face box, or None."""
    if not isinstance(area, dict):
        return None
    try:
        w = int(area.get("w") or area.get("width") or 0)
        h = int(area.get("h") or area.get("height") or 0)
        if w > 0 and h > 0:
            x = int(area.get("x") or 0)
            y = int(area.get("y") or 0)
            return x, y, x + w, y + h
        left = int(area.get("left") or 0)
        top = int(area.get("top") or 0)
        right = int(area.get("right") or 0)
        bottom = int(area.get("bottom") or 0)
        if right > left and bottom > top:
            return left, top, right, bottom
        return None
    except (TypeError, ValueError):
        return None


def _face_clipped_edge(path: str, facial_area: Any) -> bool:
    """True when face box touches / nearly touches frame edge (half-face / cut-off)."""
    box = _facial_area_box(facial_area)
    if not box:
        return False
    iw, ih = _image_wh(path)
    if iw < 16 or ih < 16:
        return False
    x0, y0, x1, y1 = box
    margin = max(PROBE_CLIP_EDGE_PX, int(min(iw, ih) * PROBE_CLIP_EDGE_FRAC))
    if x0 <= margin or y0 <= margin or x1 >= (iw - margin) or y1 >= (ih - margin):
        return True
    return False


def _bust_padding_ok(
    fx0: int,
    fy0: int,
    fx1: int,
    fy1: int,
    cx0: int,
    cy0: int,
    cx1: int,
    cy1: int,
    pad_top: int,
    pad_side: int,
    pad_bottom: int,
    max_h_frac: Optional[float] = None,
    max_w_frac: Optional[float] = None,
) -> bool:
    """True when clamped crop kept enough pad and face is not skin-tight."""
    kept = PROBE_BUST_MIN_PAD_KEPT
    if pad_top > 0 and (fy0 - cy0) / pad_top < kept:
        return False
    if pad_side > 0:
        if (fx0 - cx0) / pad_side < kept:
            return False
        if (cx1 - fx1) / pad_side < kept:
            return False
    if pad_bottom > 0 and (cy1 - fy1) / pad_bottom < kept:
        return False
    ch = max(1, cy1 - cy0)
    cw = max(1, cx1 - cx0)
    fh = max(1, fy1 - fy0)
    fw = max(1, fx1 - fx0)
    lim_h = max_h_frac if max_h_frac is not None else PROBE_BUST_MAX_FACE_H_FRAC
    lim_w = max_w_frac if max_w_frac is not None else PROBE_BUST_MAX_FACE_W_FRAC
    if fh / ch > lim_h:
        return False
    if fw / cw > lim_w:
        return False
    return True


def _full_face_crop_box(
    iw: int, ih: int, facial_area: Any
) -> Optional[tuple[int, int, int, int, str]]:
    """Symmetric portrait pad — fallback when scene crop cannot be composed."""
    box = _facial_area_box(facial_area)
    if not box:
        return None
    fx0, fy0, fx1, fy1 = box
    fw = max(1, fx1 - fx0)
    fh = max(1, fy1 - fy0)

    pad_top = int(fh * PROBE_FACE_PAD_TOP)
    pad_side = int(fw * PROBE_FACE_PAD_SIDE)
    pad_bottom = int(fh * PROBE_FACE_PAD_BOTTOM)
    bx0 = fx0 - pad_side
    by0 = fy0 - pad_top
    bx1 = fx1 + pad_side
    by1 = fy1 + pad_bottom

    cx0 = max(0, bx0)
    cy0 = max(0, by0)
    cx1 = min(iw, bx1)
    cy1 = min(ih, by1)
    cw = cx1 - cx0
    ch = cy1 - cy0
    if cw < 8 or ch < 8:
        return None

    if ch >= int(fh * PROBE_FACE_MIN_H_MULT) and cw >= int(fw * PROBE_FACE_MIN_W_MULT):
        if not _bust_padding_ok(
            fx0, fy0, fx1, fy1, cx0, cy0, cx1, cy1, pad_top, pad_side, pad_bottom
        ):
            return None
        return cx0, cy0, cx1, cy1, "full_face"
    return None


def _scene_crop_box(
    iw: int, ih: int, facial_area: Any
) -> Optional[tuple[int, int, int, int, str]]:
    """Wider crop: face + shoulders/background for snapshot rail context."""
    box = _facial_area_box(facial_area)
    if not box:
        return None
    fx0, fy0, fx1, fy1 = box
    fw = max(1, fx1 - fx0)
    fh = max(1, fy1 - fy0)

    pad_top = int(fh * PROBE_SCENE_PAD_TOP)
    pad_side = int(fw * PROBE_SCENE_PAD_SIDE)
    pad_bottom = int(fh * PROBE_SCENE_PAD_BOTTOM)
    bx0 = fx0 - pad_side
    by0 = fy0 - pad_top
    bx1 = fx1 + pad_side
    by1 = fy1 + pad_bottom

    cx0 = max(0, bx0)
    cy0 = max(0, by0)
    cx1 = min(iw, bx1)
    cy1 = min(ih, by1)
    cw = cx1 - cx0
    ch = cy1 - cy0
    if cw < 8 or ch < 8:
        return None

    if ch >= int(fh * PROBE_SCENE_MIN_H_MULT) and cw >= int(fw * PROBE_SCENE_MIN_W_MULT):
        if not _bust_padding_ok(
            fx0, fy0, fx1, fy1, cx0, cy0, cx1, cy1,
            pad_top, pad_side, pad_bottom,
            PROBE_SCENE_MAX_FACE_H_FRAC, PROBE_SCENE_MAX_FACE_W_FRAC,
        ):
            return None
        return cx0, cy0, cx1, cy1, "scene"
    return None


def _bust_crop_box(
    iw: int, ih: int, facial_area: Any
) -> Optional[tuple[int, int, int, int, str]]:
    """
    Display crop for rail/ledger: prefer scene (context), else full_face portrait.
    Returns (x0, y0, x1, y1, mode) or None if composition cannot be satisfied.
    """
    if not _facial_area_box(facial_area) or iw < 16 or ih < 16:
        return None
    scene = _scene_crop_box(iw, ih, facial_area)
    if scene:
        return scene
    return _full_face_crop_box(iw, ih, facial_area)


def _crop_bust_bgr(path: str, facial_area: Any):
    """Display crop: bust / padded full face. None if composition fails."""
    import cv2  # noqa: PLC0415

    img = cv2.imread(path)
    if img is None:
        return None, None
    ih, iw = img.shape[:2]
    box = _bust_crop_box(iw, ih, facial_area)
    if not box:
        return None, None
    x0, y0, x1, y1, mode = box
    crop = img[y0:y1, x0:x1]
    if crop is None or crop.size == 0:
        return None, None
    return crop, mode


def _crop_face_bgr(path: str, area: Any):
    import cv2  # noqa: PLC0415 — optional until represent

    if not isinstance(area, dict):
        return None
    img = cv2.imread(path)
    if img is None:
        return None
    try:
        w = int(area.get("w") or area.get("width") or 0)
        h = int(area.get("h") or area.get("height") or 0)
        if w > 0 and h > 0:
            x = int(area.get("x") or 0)
            y = int(area.get("y") or 0)
        else:
            left = int(area.get("left") or 0)
            top = int(area.get("top") or 0)
            right = int(area.get("right") or 0)
            bottom = int(area.get("bottom") or 0)
            x, y = left, top
            w, h = max(0, right - left), max(0, bottom - top)
    except (TypeError, ValueError):
        return None
    if w < 8 or h < 8:
        return None
    ih, iw = img.shape[:2]
    x0 = max(0, x)
    y0 = max(0, y)
    x1 = min(iw, x + w)
    y1 = min(ih, y + h)
    if x1 <= x0 or y1 <= y0:
        return None
    return img[y0:y1, x0:x1]


def _laplacian_variance(bgr) -> float:
    import cv2  # noqa: PLC0415
    import numpy as np  # noqa: PLC0415

    if bgr is None or bgr.size == 0:
        return 0.0
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _mean_luma(bgr) -> float:
    import cv2  # noqa: PLC0415

    if bgr is None or bgr.size == 0:
        return 0.0
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return float(gray.mean())


def _image_wh(path: str) -> tuple[int, int]:
    import cv2  # noqa: PLC0415

    img = cv2.imread(path)
    if img is None:
        return 0, 0
    h, w = img.shape[:2]
    return int(w), int(h)


def _enroll_quality_gate(path: str, facial_area: Any) -> Optional[dict[str, Any]]:
    """Return error payload if enroll photo fails A2; else None."""
    fw, fh = _facial_area_wh(facial_area)
    face_short = min(fw, fh) if fw and fh else 0
    iw, ih = _image_wh(path)
    if face_short < ENROLL_MIN_FACE_PX:
        return {
            "ok": False,
            "error": "face_too_small",
            "gate": "face",
            "message": f"Face box {face_short}px < {ENROLL_MIN_FACE_PX}px",
            "faceWidth": fw,
            "faceHeight": fh,
            "imageWidth": iw,
            "imageHeight": ih,
        }

    # %-of-image only when face is still modest; large absolute face → OK even on wide scenes
    if face_short < ENROLL_FACE_AREA_SKIP_PX and iw > 0 and ih > 0 and fw > 0 and fh > 0:
        frac = (fw * fh) / float(iw * ih)
        if frac < ENROLL_MIN_FACE_AREA_FRAC:
            return {
                "ok": False,
                "error": "face_too_small",
                "gate": "face",
                "message": f"Face area {frac:.3f} of image < {ENROLL_MIN_FACE_AREA_FRAC}",
                "faceWidth": fw,
                "faceHeight": fh,
                "imageWidth": iw,
                "imageHeight": ih,
            }

    crop = _crop_face_bgr(path, facial_area)
    sharp = _laplacian_variance(crop)
    if (sharp < ENROLL_MIN_SHARPNESS):
        return {
            "ok": False,
            "error": "quality_blur",
            "gate": "sharpness",
            "message": f"Sharpness {sharp:.1f} < {ENROLL_MIN_SHARPNESS}",
            "sharpness": round(sharp, 1),
            "faceWidth": fw,
            "faceHeight": fh,
        }

    luma = _mean_luma(crop)
    if luma < ENROLL_MIN_LUMA or luma > ENROLL_MAX_LUMA:
        return {
            "ok": False,
            "error": "quality_lighting",
            "gate": "lighting",
            "message": f"Face lighting mean {luma:.1f} out of range",
            "luma": round(luma, 1),
            "faceWidth": fw,
            "faceHeight": fh,
        }
    return None


def _resolve_model(name: Optional[str]) -> str:
    m = (name or DEFAULT_MODEL).strip()
    if m.lower() in ("vgg-face", "vgg_face", "vggface"):
        raise HTTPException(status_code=400, detail="VGG-Face is not allowed for commercial use")
    if m not in ALLOWED_MODELS:
        raise HTTPException(
            status_code=400,
            detail="model must be one of: " + ", ".join(ALLOWED_MODELS),
        )
    return m


def _distance_to_score_pct(distance: float, threshold: float) -> float:
    """
    Provisional mapping (calibrate on real BWC faces later).
    distance 0 → ~100%; at model threshold → ~75%; worse → lower.
    """
    try:
        d = float(distance)
        t = float(threshold) if threshold and float(threshold) > 0 else 0.4
    except (TypeError, ValueError):
        return 0.0
    # Linear: score = 100 * (1 - d / (t / 0.25)) capped — at d=t → 75
    # 75 = 100 * (1 - t / span) => span = t / 0.25
    span = t / 0.25
    if span <= 0:
        return 0.0
    pct = 100.0 * (1.0 - (d / span))
    if pct < 0:
        pct = 0.0
    if pct > 100:
        pct = 100.0
    return round(pct, 1)


def _write_upload(data: bytes, suffix: str) -> str:
    fd, path = tempfile.mkstemp(prefix="fr_", suffix=suffix)
    os.close(fd)
    with open(path, "wb") as f:
        f.write(data)
    return path


def _path_from_b64(b64: str, suffix: str = ".jpg") -> str:
    raw = base64.b64decode(b64.split(",")[-1], validate=False)
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="image too large (max 20MB)")
    return _write_upload(raw, suffix)


def _run_verify(path1: str, path2: str, model_name: str) -> dict[str, Any]:
    # Import late so /health works before TF loads
    from deepface import DeepFace

    try:
        result = DeepFace.verify(
            img1_path=path1,
            img2_path=path2,
            model_name=model_name,
            detector_backend=DETECTOR,
            enforce_detection=True,
            align=True,
        )
    except ValueError as exc:
        # Typical: face could not be detected
        msg = str(exc)
        return {
            "ok": False,
            "verified": False,
            "error": "face_not_detected",
            "message": msg[:300],
            "model": model_name,
        }
    except Exception as exc:  # noqa: BLE001 — surface to operator API
        return {
            "ok": False,
            "verified": False,
            "error": "verify_failed",
            "message": str(exc)[:300],
            "model": model_name,
        }

    distance = float(result.get("distance", 0))
    threshold = float(result.get("threshold", 0.4))
    verified = bool(result.get("verified"))
    score_pct = _distance_to_score_pct(distance, threshold)
    return {
        "ok": True,
        "verified": verified,
        "scorePct": score_pct,
        "distance": round(distance, 6),
        "threshold": threshold,
        "model": model_name,
        "detector": DETECTOR,
        "scoreNote": "Provisional mapping — calibrate before operational use",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "ready": True,
        "service": "fr-sidecar",
        "engine": "deepface",
        "fallback": "deepface",
        "defaultModel": DEFAULT_MODEL,
        "allowedModels": list(ALLOWED_MODELS),
        "detector": DETECTOR,
        "vggFaceAllowed": False,
    }


class VerifyJson(BaseModel):
    image1_b64: Optional[str] = Field(None, description="Base64 or data-URL")
    image2_b64: Optional[str] = None
    path1: Optional[str] = Field(None, description="Server-local path (Node only)")
    path2: Optional[str] = None
    model: Optional[str] = None


@app.post("/verify")
async def verify_json(body: VerifyJson) -> JSONResponse:
    model = _resolve_model(body.model)
    p1 = p2 = None
    cleanup: list[str] = []
    try:
        if body.path1 and body.path2:
            if not os.path.isfile(body.path1) or not os.path.isfile(body.path2):
                raise HTTPException(status_code=400, detail="path1/path2 not found")
            p1, p2 = body.path1, body.path2
        elif body.image1_b64 and body.image2_b64:
            p1 = _path_from_b64(body.image1_b64)
            p2 = _path_from_b64(body.image2_b64)
            cleanup.extend([p1, p2])
        else:
            raise HTTPException(status_code=400, detail="Provide path1+path2 or image1_b64+image2_b64")
        out = _run_verify(p1, p2, model)
        return JSONResponse(out)
    finally:
        for p in cleanup:
            try:
                os.remove(p)
            except OSError:
                pass


@app.post("/verify-upload")
async def verify_upload(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    model: str = Form(DEFAULT_MODEL),
) -> JSONResponse:
    model_name = _resolve_model(model)
    cleanup: list[str] = []
    try:
        b1 = await file1.read()
        b2 = await file2.read()
        if len(b1) > 20 * 1024 * 1024 or len(b2) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="image too large (max 20MB)")
        s1 = os.path.splitext(file1.filename or "")[1] or ".jpg"
        s2 = os.path.splitext(file2.filename or "")[1] or ".jpg"
        p1 = _write_upload(b1, s1.lower())
        p2 = _write_upload(b2, s2.lower())
        cleanup.extend([p1, p2])
        out = _run_verify(p1, p2, model_name)
        return JSONResponse(out)
    finally:
        for p in cleanup:
            try:
                os.remove(p)
            except OSError:
                pass


def _embedding_to_list(emb: Any) -> Optional[list[float]]:
    if emb is None:
        return None
    try:
        return [float(x) for x in list(emb)]
    except (TypeError, ValueError):
        return None


def _run_represent(path: str, model_name: str) -> dict[str, Any]:
    from deepface import DeepFace

    try:
        reps = DeepFace.represent(
            img_path=path,
            model_name=model_name,
            detector_backend=DETECTOR,
            enforce_detection=True,
            align=True,
        )
    except ValueError as exc:
        return {
            "ok": False,
            "error": "face_not_detected",
            "message": str(exc)[:300],
            "model": model_name,
        }
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)[:300]
        err = "represent_failed"
        low = msg.lower()
        if "numpy" in low or "tensorflow" in low or "_array_api" in low:
            err = "engine_broken"
        return {
            "ok": False,
            "error": err,
            "message": msg,
            "model": model_name,
        }

    if not reps or not isinstance(reps, list):
        return {"ok": False, "error": "face_not_detected", "model": model_name}
    if len(reps) > 1:
        return {
            "ok": False,
            "error": "multiple_faces",
            "message": "More than one face found — use a single-face photo",
            "model": model_name,
            "faceCount": len(reps),
        }
    facial_area = reps[0].get("facial_area")
    try:
        qfail = _enroll_quality_gate(path, facial_area)
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "quality_low",
            "gate": "sharpness",
            "message": str(exc)[:200],
            "model": model_name,
        }
    if qfail:
        qfail["model"] = model_name
        return qfail
    emb = _embedding_to_list(reps[0].get("embedding"))
    if not emb or len(emb) < 64:
        return {"ok": False, "error": "represent_failed", "model": model_name}
    fw, fh = _facial_area_wh(facial_area)
    return {
        "ok": True,
        "embedding": emb,
        "dims": len(emb),
        "model": model_name,
        "detector": DETECTOR,
        "facialArea": facial_area,
        "faceWidth": fw,
        "faceHeight": fh,
    }


def _face_area_px(area: Any) -> int:
    w, h = _facial_area_wh(area)
    return w * h


def _crop_jpeg_b64(path: str, facial_area: Any) -> Optional[str]:
    """Tight face crop — used for sharpness / legacy; prefer bust for display."""
    import cv2  # noqa: PLC0415
    import base64 as b64mod  # noqa: PLC0415

    crop = _crop_face_bgr(path, facial_area)
    if crop is None or crop.size == 0:
        return None
    ok, buf = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    if not ok:
        return None
    return b64mod.b64encode(buf.tobytes()).decode("ascii")


def _crop_bust_jpeg_b64(path: str, facial_area: Any) -> tuple[Optional[str], Optional[str]]:
    """mob-fr-snap-bust-crop: display jpeg = full face / half-body. Returns (b64, mode)."""
    import cv2  # noqa: PLC0415
    import base64 as b64mod  # noqa: PLC0415

    crop, mode = _crop_bust_bgr(path, facial_area)
    if crop is None or crop.size == 0:
        return None, None
    ok, buf = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    if not ok:
        return None, None
    return b64mod.b64encode(buf.tobytes()).decode("ascii"), mode


def _run_represent_probe(path: str, model_name: str) -> dict[str, Any]:
    """Live / inbox probe: largest face, no enroll A2 gate, optional multi-face pick."""
    from deepface import DeepFace

    try:
        reps = DeepFace.represent(
            img_path=path,
            model_name=model_name,
            detector_backend=DETECTOR,
            enforce_detection=True,
            align=True,
        )
    except ValueError as exc:
        return {
            "ok": False,
            "error": "face_not_detected",
            "message": str(exc)[:300],
            "model": model_name,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "represent_failed",
            "message": str(exc)[:300],
            "model": model_name,
        }

    if not reps or not isinstance(reps, list):
        return {"ok": False, "error": "face_not_detected", "model": model_name}

    best = max(reps, key=lambda r: _face_area_px(r.get("facial_area")))
    facial_area = best.get("facial_area")
    emb = _embedding_to_list(best.get("embedding"))
    if not emb or len(emb) < 64:
        return {"ok": False, "error": "represent_failed", "model": model_name}
    fw, fh = _facial_area_wh(facial_area)
    face_short = min(fw, fh) if fw and fh else 0
    crop_bgr = _crop_face_bgr(path, facial_area)
    sharp = _laplacian_variance(crop_bgr)
    if face_short < PROBE_MIN_FACE_PX:
        return {
            "ok": False,
            "error": "face_too_small",
            "gate": "face",
            "message": f"Probe face {face_short}px < {PROBE_MIN_FACE_PX}px",
            "sharpness": round(sharp, 1),
            "faceWidth": fw,
            "faceHeight": fh,
            "faceCount": len(reps),
            "probe": True,
            "model": model_name,
        }
    if sharp < PROBE_MIN_SHARPNESS:
        return {
            "ok": False,
            "error": "quality_blur",
            "gate": "sharpness",
            "message": f"Probe sharpness {sharp:.1f} < {PROBE_MIN_SHARPNESS}",
            "sharpness": round(sharp, 1),
            "faceWidth": fw,
            "faceHeight": fh,
            "faceCount": len(reps),
            "probe": True,
            "model": model_name,
        }
    # mob-fr-reject-clipped-face: skip half / edge-cut faces (rail + ledger)
    if _face_clipped_edge(path, facial_area):
        iw, ih = _image_wh(path)
        return {
            "ok": False,
            "error": "face_clipped",
            "gate": "clip",
            "message": "Face box touches frame edge — half face / cut-off",
            "sharpness": round(sharp, 1),
            "faceWidth": fw,
            "faceHeight": fh,
            "imageWidth": iw,
            "imageHeight": ih,
            "faceCount": len(reps),
            "probe": True,
            "model": model_name,
        }
    # mob-fr-snap-bust-crop: display = padded full face / half-body (not tight detector box)
    crop_b64, crop_mode = _crop_bust_jpeg_b64(path, facial_area)
    if not crop_b64:
        iw, ih = _image_wh(path)
        return {
            "ok": False,
            "error": "face_composition",
            "gate": "composition",
            "message": "Cannot compose full-face / bust crop — skip ugly tight face",
            "sharpness": round(sharp, 1),
            "faceWidth": fw,
            "faceHeight": fh,
            "imageWidth": iw,
            "imageHeight": ih,
            "faceCount": len(reps),
            "probe": True,
            "model": model_name,
        }
    return {
        "ok": True,
        "embedding": emb,
        "dims": len(emb),
        "model": model_name,
        "detector": DETECTOR,
        "facialArea": facial_area,
        "faceWidth": fw,
        "faceHeight": fh,
        "faceCount": len(reps),
        "cropJpegB64": crop_b64,
        "cropMode": crop_mode or "bust",
        "sharpness": round(sharp, 1),
        "probe": True,
    }


class RepresentJson(BaseModel):
    path: Optional[str] = None
    image_b64: Optional[str] = None
    model: Optional[str] = None


@app.post("/represent")
async def represent_json(body: RepresentJson) -> JSONResponse:
    model = _resolve_model(body.model)
    cleanup: list[str] = []
    try:
        if body.path:
            if not os.path.isfile(body.path):
                raise HTTPException(status_code=400, detail="path not found")
            path = body.path
        elif body.image_b64:
            path = _path_from_b64(body.image_b64)
            cleanup.append(path)
        else:
            raise HTTPException(status_code=400, detail="Provide path or image_b64")
        return JSONResponse(_run_represent(path, model))
    finally:
        for p in cleanup:
            try:
                os.remove(p)
            except OSError:
                pass


@app.post("/represent-probe")
async def represent_probe_json(body: RepresentJson) -> JSONResponse:
    model = _resolve_model(body.model)
    cleanup: list[str] = []
    try:
        if body.path:
            if not os.path.isfile(body.path):
                raise HTTPException(status_code=400, detail="path not found")
            path = body.path
        elif body.image_b64:
            path = _path_from_b64(body.image_b64)
            cleanup.append(path)
        else:
            raise HTTPException(status_code=400, detail="Provide path or image_b64")
        return JSONResponse(_run_represent_probe(path, model))
    finally:
        for p in cleanup:
            try:
                os.remove(p)
            except OSError:
                pass


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("FM_FR_SIDECAR_HOST", "127.0.0.1")
    port = int(os.environ.get("FM_FR_SIDECAR_PORT", "8765"))
    uvicorn.run(app, host=host, port=port)
