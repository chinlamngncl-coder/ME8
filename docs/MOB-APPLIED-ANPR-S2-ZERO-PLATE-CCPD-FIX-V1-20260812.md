# MOB-APPLIED ANPR-S2-ZERO-PLATE-CCPD-FIX-V1

**Date:** 2026-08-12  
**Symptom:** `S1_vehicles>0` but `S2_plates_raw=0` / `OCR_sent=0` under native ingest + `ccpd_pose`.

## Root causes addressed

1. **Color:** CCPD now does explicit `cv2.cvtColor(..., BGR2RGB)` then letterbox — **no second `::-1`** (was BGR letterbox + channel flip; now RGB once).  
2. **Conf:** `FM_ANPR_CCPD_POSE_CONF` / `FM_ANPR_STAGE2_CONF` default **0.05** (was **0.25** — killed motion plates).  
3. **Debug:** `[ANPR-S2-RAW]` logs crop shape/dtype, max raw conf, hits after thr.  
4. **Fallback:** If CCPD returns no keypoints → OCR **whole vehicle macro** (`vehicle-macro-ocr-fallback`).  
5. Funnel: CCPD hits bump `s2_plates_raw`.

## You do

Restart **`START-ANPR.bat`**, keep Fleet up, Live ANPR.  
Watch sidecar log for `[ANPR-S2-RAW] CCPD max_conf=...` and `S2_fallback→OCR` / `CCPD_crop→OCR`.
