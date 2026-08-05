# MOB DISC — ANPR-LIVE-FAST-PATH-RESTORE-V1 (2026-08-02)

**Status:** APPLIED — await operator PASS  
**Scope:** Sidecar + Node OCR client + ANPR live tile chrome. CCPD pose geometry untouched.

## Done

| Item | Change |
|------|--------|
| Micro blur floor | default **35** (`FM_ANPR_MICRO_BLUR_FLOOR`) |
| Engine B | default **ppocrv4** — HyperLPR hatch only (`FM_ANPR_ENGINE_B=hyperlpr3`) |
| OCR timeout | **2.5s** on `/read-macro` (Python + Node `FM_ANPR_OCR_TIMEOUT_MS`) |
| Live overlay | hide tile label + “Live” placeholder when tile `.is-live` |
| Detection | CCPD YOLOv8-pose native warp **kept** |

## PASS

1. Restart `START-ANPR.bat` **and** ME8 (Node timeout).  
2. Hard refresh ANPR Live.  
3. Video FOV has **no** corner “Live” / label chrome.  
4. Vehicle past cam → crops on rail within ~1–2s; no ~30s hang.
