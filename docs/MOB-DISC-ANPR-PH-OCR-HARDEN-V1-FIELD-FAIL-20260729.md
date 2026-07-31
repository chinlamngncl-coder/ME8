# MOB DISC — ANPR-PH-OCR-HARDEN-V1 field FAIL

**Date:** 2026-07-29  
**Status:** **LOCKED** — operator **FAIL** after APPLY  
**MOB:** `ANPR-PH-OCR-HARDEN-V1`  
**Related:**  
- `MOB-DISC-ANPR-PH-OCR-HARDEN-V1-APPLIED.md`  
- `MOB-DISC-ANPR-NIGHT-LOCALIZATION-GOOGLE-PACK-20260729.md`  
- `MOB-DISC-ANPR-ROI-V1-FIELD-FAIL-YELLOW-PUV-20260729.md`

---

## Plain English

1. Operator verdict: **FAIL** on **both** field photos (yellow PUV + night van). Human eye can read plates clearly on a big monitor; ANPR cannot.  
2. **Root cause of this FAIL session (proven):** harden sidecar **never bound**. Port **8768** was held by an **old** process (`engine: mob601-plate-roi`). New `START-ANPR.bat` exited with **Errno 10048**. Operator tested the **pre-harden** engine.  
3. Lab synthetic smoke was **4/4 PASS** — still not field readiness. **Retest required** after one clean harden start (`engine: mob601-ph-harden-v1`).

---

## What we already know (pre-FAIL evidence)

| Class | Target | Pre-harden | Harden lab |
|-------|--------|------------|------------|
| Yellow PUV tight (`RP07032017-tuch.jpg`) | **WOO 185** | format_reject | synthetic PASS |
| Night van (`image_8c9366` class) | **WZT 539** or safe soft fail | **HWZ 1539** @ 82% | synthetic soft-fail PASS (not true OCR PASS) |

Synthetic bumper scenes do **not** prove night glare OCR.

---

## Operator evidence needed (one reply)

Reply with three lines (or a screenshot):

1. **Which photo** — yellow PUV / night van / both / other  
2. **What card showed** — plate text + % **or** soft-fail message  
3. **Restarted `START-ANPR.bat`?** — yes / no  

Optional lab: set `FM_ANPR_DEBUG=1`, restart sidecar, one Read, paste JSON `error` / `rawText` / `preprocessProfile` / `det.source`.

---

## Likely buckets (until evidence)

| If you saw… | Likely cause |
|-------------|--------------|
| Still **format_reject** on yellow | Main-band / O0 / yellow profile miss on real font |
| Still **wrong plate** @ ≥80% (e.g. HWZ) | Harm lock miss or ROI still too big |
| Soft fail (no plate / low conf) on both | Safer than wrong — but ops still FAIL |
| Service / engine missing | Sidecar not restarted after APPLY |

---

## Next path (after evidence)

**One recommendation:** name a follow-on MOB from the evidence — not invent a third preprocess pass blind.

Default placeholder (refine after your three lines):

- **`ANPR-FIELD-OCR-PASS-V2`** — fix only the failing class first (yellow **or** night), then the other.

**Do not:** lower regex / 80% floor · lists · live ZLM.

**No code** until you reply with evidence + **`MOB-APPLY …`**.

---

## Lock record

| Item | Decision |
|------|----------|
| Harden V1 field | **FAIL** |
| Lab smoke | Not field gate |
| Code | **None** until evidence + APPLY |
