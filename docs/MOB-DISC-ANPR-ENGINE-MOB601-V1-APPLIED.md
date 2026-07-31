# MOB DISC — ANPR-ENGINE-MOB601-V1 APPLIED

**Date:** 2026-07-29  
**Status:** **APPLIED** — operator **shell PASS** 2026-07-29; **field quality FAIL** (see `MOB-DISC-ANPR-MOB601-SHELL-PASS-FIELD-QUALITY-FAIL-20260729.md`)  
**APPLY:** `ANPR-ENGINE-MOB601-V1`  
**Parent:** `MOB-DISC-ANPR-MOB601-CONSOLIDATE-YOLO-PADDLE-20260729.md`  
**Next:** `ANPR-PLATE-DETECT-ROI-V1` (plate box first — bumper text must not win)

---

## Shipped

| Piece | Location |
|-------|----------|
| Pipeline | `anpr-sidecar/pipeline.py` — OpenCV gray+medianBlur → PaddleOCR → region regex → ≥80% floor; optional YOLO11 if `models/plate_yolo11n.pt` |
| HTTP | `anpr-sidecar/app.py` — `GET /health`, `POST /read` on **8768** |
| Node | `lib/anprSidecarClient.js` + `lib/anprPlateRead.js` (Tesseract **removed** as ship path) |
| Start | `START-ANPR.bat` + `anpr-sidecar/INSTALL.ps1` |
| Errors | `anpr.format_reject` / soft fail UI (no wrong plate on card) |
| Region | `FM_ANPR_REGION=ph` default (`^[A-Z]{3}\d{3,4}$`) |

## Operator check

1. Run `anpr-sidecar\INSTALL.ps1` once (long).  
2. Run `START-ANPR.bat` — leave open (or set `FM_ANPR_SIDECAR_AUTO=1`).  
3. Restart Fleet; hard-refresh Analytics → **ANPR**.  
4. Status should say plate reading ready.  
5. Re-test **AAJ 8008** crop: must show **AAJ 8008** (or soft fail — never **AAJ 80584**).  

**Lab smoke (agent):** synthetic `AAJ 8008` (+ NCR) → **`AAJ 8008` @ 100%** via pipeline (regex strips NCR; 5-digit garbage rejected).  

**PASS rule:** clear PH plate crop → correct compact format or “No reliable plate read…” — never garbage digits.

## Notes

- First PaddleOCR run may download EN detect/rec models into `%USERPROFILE%\.paddleocr` — **ship pack must vendor these later** (`ANPR-SHIP-PACK-PARITY-V1`).  
- YOLO11 weights optional (`models/plate_yolo11n.pt`); snapshot uses operator crop (`skip_yolo`). Do **not** pip-install ultralytics on Windows until torch is verified — it broke Paddle imports in lab.  
- Ultralytics removed from default `requirements.txt` for that reason.

## Still later

Lists · offline video · live ZLM worker · ship pack parity · public notice after weapons.
