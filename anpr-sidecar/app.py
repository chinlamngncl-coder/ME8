"""
Ubitron Mobility Axiom — ANPR sidecar (FastALPR ship default).
Bind 127.0.0.1 only. Read-only CV; does not route ZLM.
"""
from __future__ import annotations

import os
from typing import Any, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

from pipeline import health_payload, read_plate_path

HOST_HINT = "127.0.0.1"
app = FastAPI(title="Ubitron ANPR FastALPR", version="2.0.0")


class ReadBody(BaseModel):
    path: str = Field(..., min_length=1)
    region: Optional[str] = None
    skip_yolo: bool = False
    skip_detect: Optional[bool] = None


@app.get("/health")
def health() -> dict[str, Any]:
    return health_payload()


@app.post("/read")
def read_plate(body: ReadBody) -> dict[str, Any]:
    skip = body.skip_detect if body.skip_detect is not None else body.skip_yolo
    return read_plate_path(
        body.path,
        region=body.region,
        skip_yolo=bool(skip),
        skip_detect=bool(skip),
    )


@app.get("/")
def root() -> dict[str, str]:
    eng = (os.environ.get("FM_ANPR_ENGINE") or "fastalpr").strip().lower()
    return {"service": "anpr-fastalpr-ship-v1", "engine": eng, "hint": f"bind {HOST_HINT}; POST /read"}
