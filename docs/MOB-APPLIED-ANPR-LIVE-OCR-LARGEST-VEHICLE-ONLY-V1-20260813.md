# MOB-APPLIED ANPR-LIVE-OCR-LARGEST-VEHICLE-ONLY-V1 (2026-08-13)

## APPLY
`MOB-APPLY ANPR-LIVE-OCR-LARGEST-VEHICLE-ONLY-V1`

## Change
`anpr-sidecar/native_watch.py` — live native path OCRs **one** Stage-1 vehicle per tick: max `w*h`. Log `[ANPR-NATIVE] largest_only … skip=N`.

## Operator
Restart **START-ANPR.bat** only. Same scene: expect one OCR path (large macro), not three. Camry foreground should be the pick; red-only sticky without attempting Camry = FAIL.
