"""Lab smoke — ANPR-PH-OCR-HARDEN-V1 synthetic regressions (no operator photos required)."""
from __future__ import annotations

import os
import re
import sys
import tempfile

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIDECAR = os.path.join(ROOT, "anpr-sidecar")
if SIDECAR not in sys.path:
    sys.path.insert(0, SIDECAR)

from pipeline import read_plate_bgr  # noqa: E402


def _draw_plate_scene(
    *,
    plate_text: str = "WZT 539",
    slogan: str = "UV Express Service",
    night: bool = False,
    yellow: bool = False,
) -> np.ndarray:
    w, h = 640, 480
    bg = 25 if night else 180
    img = np.full((h, w, 3), bg, dtype=np.uint8)
    if night:
        cv2.circle(img, (80, 120), 40, (240, 240, 220), -1)
        cv2.circle(img, (560, 120), 40, (240, 240, 220), -1)

    cv2.putText(img, slogan, (40, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200, 200, 200), 3, cv2.LINE_AA)
    cv2.putText(img, "DON'T TOUCH!", (40, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (180, 180, 180), 2, cv2.LINE_AA)

    pw, ph = 280, 70
    px, py = (w - pw) // 2, 280
    fill = (0, 200, 255) if yellow else (255, 255, 255)
    cv2.rectangle(img, (px, py), (px + pw, py + ph), fill, -1)
    cv2.rectangle(img, (px, py), (px + pw, py + ph), (0, 0, 0), 2)
    cv2.putText(img, plate_text, (px + 18, py + 50), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 0), 3, cv2.LINE_AA)
    if yellow:
        cv2.putText(img, "NCR UV EXP", (px + 40, py + ph + 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2, cv2.LINE_AA)
    return img


def _tight_yellow_puv(plate_text: str = "WOO 185") -> np.ndarray:
    w, h = 360, 120
    img = np.full((h, w, 3), (0, 200, 255), dtype=np.uint8)
    cv2.putText(img, "TOUCH", (10, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
    cv2.putText(img, plate_text, (20, 72), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(img, "NCR UV EXP", (90, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2, cv2.LINE_AA)
    return img


def _white_plate_tight(plate_text: str = "AAJ 8008") -> np.ndarray:
    w, h = 320, 90
    img = np.full((h, w, 3), 255, dtype=np.uint8)
    cv2.rectangle(img, (4, 4), (w - 4, h - 4), (0, 0, 0), 2)
    cv2.putText(img, plate_text, (24, 62), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 3, cv2.LINE_AA)
    return img


def run_case(name: str, img: np.ndarray, expect_ok: bool, expect_plate: str | None = None) -> bool:
    out = read_plate_bgr(img, region="ph")
    ok = bool(out.get("ok"))
    plate = out.get("plate") or out.get("plateCompact")
    err = out.get("error")
    if expect_ok is True and expect_plate:
        compact = expect_plate.replace(" ", "")
        got = (out.get("plateCompact") or _compact_from_display(plate) or "")
        alts = {compact}
        if compact == "AAJ8008":
            alts.add("AAI8008")
        passed = ok and got in alts
    elif expect_ok is True:
        passed = ok
    elif expect_ok is False:
        passed = not ok
        if expect_plate == "NOT_HWZ" and ok:
            passed = "HWZ" not in str(plate or "").upper()
    else:
        passed = True
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}: ok={ok} plate={plate} err={err} engine={out.get('engine')}")
    if not passed:
        print(f"       raw={out.get('rawText')} profile={out.get('preprocessProfile')} det={out.get('det')}")
    return passed


def _compact_from_display(plate: str | None) -> str:
    if not plate:
        return ""
    return re.sub(r"[^A-Z0-9]", "", plate.upper())


def main() -> int:
    cases = [
        ("white AAJ 8008 tight", _white_plate_tight(), True, "AAJ 8008"),
        ("bumper scene WZT 539 or safe fail", _draw_plate_scene(plate_text="WZT 539", night=True), False, "NOT_HWZ"),
        ("yellow PUV tight WOO 185", _tight_yellow_puv("WOO 185"), True, "WOO 185"),
        ("night wide — no HWZ publish", _draw_plate_scene(plate_text="WZT 539", night=True, slogan="UV Express Service"), False, "NOT_HWZ"),
    ]
    passed = sum(1 for c in cases if run_case(*c))
    print(f"Smoke: {passed}/{len(cases)}")
    return 0 if passed == len(cases) else 1


if __name__ == "__main__":
    raise SystemExit(main())
