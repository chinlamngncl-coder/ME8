# MOB-APPLIED ANPR-RAPID-OCR-MERGE-LINES-STRIP-CJK-V1 (2026-08-13)

## Change
`anpr-sidecar/rapid_ocr_engine.py` — merge all OCR lines L→R; Latin+digits only (strip 皖 etc.).

## Operator
Restart START-ANPR.bat. Expect `ATA5667` not endless `silent drop … 5667`.
