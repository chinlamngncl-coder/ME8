# MOB-APPLIED ANPR-RAPID-OCR-BEST-LTO-LINE-V1 — 2026-08-13

**APPLY:** `ANPR-RAPID-OCR-BEST-LTO-LINE-V1`  
**Disc:** `docs/MOB-DISC-ANPR-SNAPSHOT-FORMAT-REJECT-BUMPER-MERGE-20260813.md`

## What changed (`anpr-sidecar` only)

1. **`rapid_ocr_engine.py`** — pick the OCR **line** that passes PH LTO (`AAA123` / `AAA1234`) instead of blind-joining bumper + plate (fixes format_reject on `NDC 5447` + bumper text).
2. **`pipeline.py` `_read_plate_fastalpr`** — if Stage-1 finds **no vehicle** (common Snapshot bumper/plate crop), still run Stage-2 → RapidOCR on the **full image** (`static-fullframe-fallback`). Fixes `no_plate` on clear plates like `NBO 7026` when YOLO sees no car.

## Operator

Restart `START-ANPR.bat` → Snapshot → Read plate again. Bat should show `best_lto_line=…` and/or `no_vehicle — fallback`.
