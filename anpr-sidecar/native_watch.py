"""
ANPR native stream watch — DISABLED (static Snapshot / Offline only).

Live cv2.VideoCapture + FLV decode threads removed. HTTP /watch/* returns 410 from app.py.
This module stays import-safe so accidental imports cannot open streams.
"""
from __future__ import annotations

from typing import Any, Optional

_DISABLED = {
    "ok": False,
    "error": "live_ingest_removed",
    "message": "Native VideoCapture watch disabled — use POST /read or /image-scan",
}


def start_watch(
    cam_id: str,
    stream_url: str,
    *,
    session_id: Optional[str] = None,
) -> dict[str, Any]:
    return dict(_DISABLED)


def stop_watch(
    cam_id: Optional[str] = None,
    *,
    session_id: Optional[str] = None,
) -> dict[str, Any]:
    return {**_DISABLED, "stopped": True}


def status() -> dict[str, Any]:
    return {
        "ok": False,
        "disabled": True,
        "reason": "live_ingest_removed",
        "sessions": [],
        "count": 0,
    }


def drain_events(max_n: int = 16) -> list[dict[str, Any]]:
    return []


def shutdown_all() -> None:
    return None
