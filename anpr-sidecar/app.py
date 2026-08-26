"""
Ubitron Mobility Axiom — ANPR sidecar (static image OCR only).
Bind 127.0.0.1. Live VideoCapture /watch/* removed — Snapshot & Offline Match only.
"""
from __future__ import annotations

# Anti-deadlock: OpenCV ↔ ONNX Runtime C++ thread-pool collision (RapidOCR hang).
# Must run before any cv2 / onnx / numpy BLAS import in this process.
import os

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import cv2

cv2.setNumThreads(0)

from typing import Any, Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from pipeline import health_payload, read_plate_path, _json_safe

HOST_HINT = "127.0.0.1"
app = FastAPI(title="Ubitron ANPR Static", version="3.0.0-static")

_LIVE_GONE = {
    "ok": False,
    "error": "live_ingest_removed",
    "message": "Live stream watch removed — use POST /read or /image-scan for static images",
}


@app.on_event("startup")
def _boot_require_stage2() -> None:
    """Load Stage-2 Ultralytics ph_id (default) for static crop-in-crop."""
    from plate_yolo import require_stage2_ready

    require_stage2_ready()


class ReadBody(BaseModel):
    path: str = Field(..., min_length=1)
    region: Optional[str] = None
    skip_yolo: bool = False
    skip_detect: Optional[bool] = None
    ocr_path: Optional[str] = "heavy"


class WatchStartBody(BaseModel):
    camId: Optional[str] = None
    streamUrl: Optional[str] = None
    sessionId: Optional[str] = None


class WatchStopBody(BaseModel):
    camId: Optional[str] = None
    sessionId: Optional[str] = None


def _static_read_node_compat(path: str, *, region: Optional[str], skip: bool) -> dict[str, Any]:
    """
    Crop-in-crop: Stage1 vehicle → Stage2 YOLO plate (+30% pad) → RapidOCR.
    Node/UI need ok + plate (+ plateCompact); also expose text + confidence.
    """
    raw = read_plate_path(
        path,
        region=region,
        skip_yolo=bool(skip),
        skip_detect=bool(skip),
    )
    if not isinstance(raw, dict):
        return {
            "ok": False,
            "error": "failed",
            "text": "",
            "plate": None,
            "plateCompact": None,
            "confidence": 0.0,
        }
    out = _json_safe(raw)
    if not isinstance(out, dict):
        out = {"ok": False, "error": "bad_payload"}
    text = str(
        out.get("plate")
        or out.get("plateCompact")
        or out.get("plateText")
        or out.get("rawText")
        or out.get("text")
        or ""
    ).strip()
    conf = out.get("confidence")
    if conf is None:
        conf = out.get("conf")
    try:
        conf_f = float(conf or 0.0)
    except (TypeError, ValueError):
        conf_f = 0.0
    # Node/UI Snapshot expect 0–100 percent (not 0–1). RapidOCR often returns 0–1.
    if 0.0 < conf_f <= 1.0:
        conf_pct = conf_f * 100.0
    else:
        conf_pct = max(0.0, min(100.0, conf_f))
    out["text"] = text
    out["confidence"] = round(conf_pct, 1)
    out["conf"] = conf_pct / 100.0
    if text:
        if not out.get("plate"):
            out["plate"] = text
        if not out.get("plateCompact"):
            out["plateCompact"] = "".join(ch for ch in text.upper() if ch.isalnum())
        if out.get("ok") is None:
            out["ok"] = True
    elif out.get("ok") is None:
        out["ok"] = False
    return out


@app.get("/health")
def health() -> dict[str, Any]:
    """Never 500 — packaging / license / UI engine badge."""
    try:
        payload = _json_safe(health_payload())
        payload["nativeWatch"] = {"ok": False, "disabled": True, "reason": "live_ingest_removed"}
        payload["liveIngest"] = False
        payload["staticOnly"] = True
        return payload
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "health_exc",
            "message": str(exc)[:200],
            "engine": "dual-lpr-v1",
            "staticOnly": True,
        }


@app.post("/watch/start")
def watch_start(_body: WatchStartBody) -> JSONResponse:
    return JSONResponse(status_code=410, content=_LIVE_GONE)


@app.post("/watch/stop")
def watch_stop(_body: WatchStopBody) -> JSONResponse:
    return JSONResponse(status_code=410, content=_LIVE_GONE)


@app.get("/watch/status")
def watch_status_route() -> JSONResponse:
    return JSONResponse(status_code=410, content=_LIVE_GONE)


@app.get("/watch/events")
def watch_events(max: int = 16) -> dict[str, Any]:
    """200 + empty — Node live poller still ticks; avoid 410 log spam."""
    return {
        "ok": True,
        "disabled": True,
        "reason": "live_ingest_removed",
        "events": [],
        "count": 0,
    }


@app.post("/track")
def track_vehicle(_body: dict[str, Any] = None) -> JSONResponse:
    return JSONResponse(status_code=410, content=_LIVE_GONE)


@app.post("/read-macro")
def read_macro(body: ReadBody) -> dict[str, Any]:
    """Static path: same crop-in-crop as /read (live deferred OCR removed)."""
    skip = body.skip_detect if body.skip_detect is not None else body.skip_yolo
    return _static_read_node_compat(body.path, region=body.region, skip=bool(skip))


@app.post("/read")
def read_plate(body: ReadBody) -> dict[str, Any]:
    skip = body.skip_detect if body.skip_detect is not None else body.skip_yolo
    return _static_read_node_compat(body.path, region=body.region, skip=bool(skip))


@app.post("/image-scan")
def image_scan(body: ReadBody) -> dict[str, Any]:
    """Offline Match static scan — same pipeline as /read."""
    skip = body.skip_detect if body.skip_detect is not None else body.skip_yolo
    return _static_read_node_compat(body.path, region=body.region, skip=bool(skip))


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "anpr-sidecar",
        "mode": "static-only",
        "hint": HOST_HINT,
        "endpoints": ["/health", "/read", "/image-scan"],
    }


if __name__ == "__main__":
    import uvicorn
    _port = int(os.environ.get("FM_ANPR_SIDECAR_PORT", "8768") or "8768")
    uvicorn.run(app, host="127.0.0.1", port=_port, log_level="info")
