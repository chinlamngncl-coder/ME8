"""
ANPR funnel debug counters — Stage1 vehicles / Stage2 plates / OCR sends.
Print every N increments (default 25) or force.
"""
from __future__ import annotations

import os
import threading
import time
from typing import Any

_lock = threading.Lock()
_counts = {
    "s1_vehicles": 0,
    "s2_plates_raw": 0,
    "s2_plates_accepted": 0,
    "ocr_sent": 0,
    "s2_no_plate": 0,
    "s2_geom_drop": 0,
}
_last_print = 0.0
_PRINT_EVERY = max(1, int(os.environ.get("FM_ANPR_FUNNEL_LOG_EVERY", "25") or "25"))
_PRINT_MIN_SEC = float(os.environ.get("FM_ANPR_FUNNEL_LOG_SEC", "5") or "5")


def bump(key: str, n: int = 1) -> None:
    with _lock:
        if key not in _counts:
            _counts[key] = 0
        _counts[key] += int(n)
        total = (
            _counts["s1_vehicles"]
            + _counts["s2_plates_raw"]
            + _counts["ocr_sent"]
        )
        now = time.time()
        global _last_print
        if total > 0 and (
            total % _PRINT_EVERY == 0 or (now - _last_print) >= _PRINT_MIN_SEC
        ):
            _last_print = now
            snap = dict(_counts)
            print(
                "[ANPR-FUNNEL] "
                f"S1_vehicles={snap['s1_vehicles']} | "
                f"S2_plates_raw={snap['s2_plates_raw']} | "
                f"S2_accepted={snap['s2_plates_accepted']} | "
                f"S2_no_plate={snap['s2_no_plate']} | "
                f"OCR_sent={snap['ocr_sent']} | "
                f"S2_geom_drop={snap.get('s2_geom_drop', 0)}",
                flush=True,
            )


def snapshot() -> dict[str, Any]:
    with _lock:
        return dict(_counts)
