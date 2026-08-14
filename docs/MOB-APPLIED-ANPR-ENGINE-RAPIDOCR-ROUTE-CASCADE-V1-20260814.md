# MOB-APPLIED ANPR-ENGINE-RAPIDOCR-ROUTE-CASCADE-V1 — 2026-08-14

**APPLY:** `ANPR-ENGINE-RAPIDOCR-ROUTE-CASCADE-V1` (operator typed `OB-APPLY`)

## Change (`anpr-sidecar` only)

1. `pipeline.read_plate_bgr` — `FM_ANPR_ENGINE=rapidocr` (and dual*) uses the same cascade as FastALPR (not dead Paddle).
2. Health — `ok` / `ocr: ready` from Stage-2 + RapidOCR when not on FastALPR hatch.

## Strategy disc

`docs/MOB-DISC-ANPR-ENGINE-STRATEGY-STOP-WHACKAMOLE-20260814.md`
