"""
Ubitron Mobility Axiom — ANPR sidecar (FastALPR ship default).
Bind 127.0.0.1 only. Read-only CV; does not route ZLM.
"""
from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from typing import Any, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

from pipeline import health_payload, read_macro_crop_path, read_plate_path, track_frame_path, _json_safe
from drop_oldest_queue import put_live_frame, take_live_frame

HOST_HINT = "127.0.0.1"
app = FastAPI(title="Ubitron ANPR FastALPR", version="2.2.0")

# Hard OCR budget — never let harvest hang ~30s (ANPR-LIVE-FAST-PATH-RESTORE-V1)
OCR_TIMEOUT_S = float(os.environ.get("FM_ANPR_OCR_TIMEOUT_S", "2.5") or "2.5")
OCR_TIMEOUT_S = max(0.8, min(8.0, OCR_TIMEOUT_S))
_ocr_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="anpr-ocr")


class ReadBody(BaseModel):
    path: str = Field(..., min_length=1)
    region: Optional[str] = None
    skip_yolo: bool = False
    skip_detect: Optional[bool] = None
    # Static / snapshot / CCTV → heavy (FastALPR + HyperLPR)
    ocr_path: Optional[str] = "heavy"


class TrackBody(BaseModel):
    path: str = Field(..., min_length=1)
    stream_id: Optional[str] = None
    cam_id: Optional[str] = None


class MacroBody(BaseModel):
    path: str = Field(..., min_length=1)
    region: Optional[str] = None
    track_id: Optional[str] = None
    # Live / BWC → FastALPR-only fast-path
    ocr_path: Optional[str] = "live"


@app.get("/health")
def health() -> dict[str, Any]:
    return health_payload()


@app.post("/track")
def track_vehicle(body: TrackBody) -> dict[str, Any]:
    """
    Lightweight Stage-1 only — drop-oldest maxsize=1 per stream so inference
    never processes a backlog ahead of time.now().
    """
    import re

    sid = (body.stream_id or body.cam_id or "").strip()
    if not sid:
        m = re.search(r"anpr_live_tmp_([A-Za-z0-9]+)_", body.path or "")
        sid = m.group(1) if m else "default"
    put_live_frame(sid, body.path)
    latest = take_live_frame(sid, timeout=0)
    path = latest if isinstance(latest, str) and latest else body.path
    return _json_safe(track_frame_path(path, cam_id=sid))


@app.post("/read-macro")
def read_macro(body: MacroBody) -> dict[str, Any]:
    """Deferred OCR on vehicle macro — default live FastALPR-only path."""
    fut = _ocr_pool.submit(
        read_macro_crop_path,
        body.path,
        region=body.region,
        track_id=body.track_id,
        ocr_path=body.ocr_path or "live",
    )
    try:
        return _json_safe(fut.result(timeout=OCR_TIMEOUT_S))
    except FuturesTimeout:
        return {
            "ok": False,
            "unclear": True,
            "error": "ocr_timeout",
            "engine": "dual-lpr-v1",
            "ocrTimeoutS": OCR_TIMEOUT_S,
            "message": f"OCR exceeded {OCR_TIMEOUT_S:.1f}s — skipped for live latency",
            "reviewStatus": "Unclear / Manual Review",
        }


@app.post("/read")
def read_plate(body: ReadBody) -> dict[str, Any]:
    skip = body.skip_detect if body.skip_detect is not None else body.skip_yolo
    return _json_safe(read_plate_path(
        body.path,
        region=body.region,
        skip_yolo=bool(skip),
        skip_detect=bool(skip),
    ))


@app.get("/")
def root() -> dict[str, str]:
    eng = (os.environ.get("FM_ANPR_ENGINE") or "fastalpr").strip().lower()
    return {"service": "anpr-sidecar", "engine": eng, "hint": HOST_HINT}
