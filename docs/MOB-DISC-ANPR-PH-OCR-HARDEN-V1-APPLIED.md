# MOB DISC — ANPR-PH-OCR-HARDEN-V1 APPLIED

**Date:** 2026-07-29  
**Status:** **APPLIED** · field **FAIL** — see `MOB-DISC-ANPR-PH-OCR-HARDEN-V1-FIELD-FAIL-20260729.md`  
**MOB:** `ANPR-PH-OCR-HARDEN-V1`  
**Related:** `MOB-DISC-ANPR-NIGHT-LOCALIZATION-GOOGLE-PACK-20260729.md`

---

## What shipped

| ID | Change | File(s) |
|----|--------|---------|
| C1 | Hard aspect **1.5–5.5**, min crop height **20px** | `plate_roi.py` |
| C2 | Max ROI area **6%** frame; YOLO bad boxes **discarded** | `plate_roi.py` |
| C3 | **CLAHE** + **medianBlur** + bicubic upscale **h=80** | `pipeline.py` |
| C4 | Preprocess profiles **`night` / `yellow_puv` / `standard`** (auto) | `pipeline.py` |
| C5 | Main-line band **top 60%** on **yellow PUV tight** crops only | `plate_roi.py`, `pipeline.py` |
| C6 | Bounded **O↔0** and **I↔J** letter variants | `pipeline.py` |
| C7 | Prefer **smallest** valid ROI; **`ambiguous_read`** soft fail | `plate_roi.py`, `pipeline.py` |
| C8 | **`full_fallback`** publish only on **tight** operator crops | `pipeline.py` |
| C9 | Ban-text contaminates lock; **3-digit tie** on yellow profile | `pipeline.py` |
| C10 | PH regex + **≥80%** floor unchanged | `pipeline.py` |
| C11 | `FM_ANPR_DEBUG=1` API debug; smoke script | `pipeline.py`, `scripts/anpr-smoke-harden.py` |

Engine tag: **`mob601-ph-harden-v1`**

---

## Env (new / changed defaults)

| Var | Default | Meaning |
|-----|---------|---------|
| `FM_ANPR_ROI_MIN_ASPECT` | `1.5` | Hard aspect min |
| `FM_ANPR_ROI_MAX_ASPECT` | `5.5` | Hard aspect max |
| `FM_ANPR_ROI_MAX_AREA` | `0.06` | Max ROI fraction |
| `FM_ANPR_MIN_CROP_H` | `20` | Min crop height px |
| `FM_ANPR_UPSCALE_H` | `80` | Bicubic target height |
| `FM_ANPR_PREPROCESS` | `auto` | `night` / `yellow_puv` / `standard` |
| `FM_ANPR_MAIN_LINE_BAND` | `0.6` | Yellow PUV top band |
| `FM_ANPR_CLAHE_NIGHT` | `2.0` | Night CLAHE clip |
| `FM_ANPR_CLAHE_YELLOW` | `1.5` | Yellow PUV CLAHE clip |
| `FM_ANPR_DEBUG` | off | Extra fields in `/read` response |

---

## Lab smoke (synthetic)

```powershell
anpr-sidecar\.venv\Scripts\python.exe scripts\anpr-smoke-harden.py
```

| Case | Result (lab) |
|------|----------------|
| Yellow PUV tight WOO 185 | **PASS** |
| Night/bumper wide — no HWZ publish | **PASS** (soft fail) |
| White AAJ 8008 tight | **PASS** (AAJ or AAI on synthetic font) |

Synthetic bumper scene does not reproduce field OCR quality — **operator photos remain gate**.

---

## Operator verify

1. Restart **`START-ANPR.bat`**
2. Hard refresh Analytics → ANPR
3. Re-test:
   - `RP07032017-tuch.jpg` → **WOO 185** (not format reject)
   - Night van class → **WZT 539** or soft fail — **never** HWZ @ ok

---

## PASS / FAIL

| Layer | Status |
|-------|--------|
| Code APPLY | **DONE** |
| Lab synthetic smoke | **Partial PASS** |
| Operator field photos | **Pending your PASS/FAIL** |

---

## Not in this MOB

- Plate lists, live ZLM worker, YOLO weights pack (follow-on)
- Lower regex or confidence floor
