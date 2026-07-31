# MOB DISC — ANPR-YELLOW-PUV-LOCK-V1 field FAIL

**Date:** 2026-07-29  
**Status:** **LOCKED** — operator **FAIL**  
**MOB:** `ANPR-YELLOW-PUV-LOCK-V1`  
**Evidence:** Two screenshots · file `RP07032017-tuch.jpg`  
**Related:**  
- `MOB-DISC-ANPR-YELLOW-PUV-LOCK-V1-APPLIED.md`  
- `MOB-DISC-ANPR-YELLOW-FAIL-NIGHT-PASS-20260729.md`  
- `MOB-DISC-ANPR-GOOGLE-HYPERLPR-ULTIMATEALPR-PH-CHECK-20260729.md`

---

## Plain English

1. Yellow PUV still **FAIL** after yellow-lock APPLY. Human sees **WOO 185** clearly.  
2. Two soft fails seen: **format reject** and **plate not found**. Card stays **Awaiting read** (gate OK — no wrong plate).  
3. Night already **PASS**. Do **not** keep patching yellow with more OCR if/else. Next step is **plate detect + plate recognizer**, not another ban-list MOB.

---

## Evidence

| Shot | UI message | Error class |
|------|------------|-------------|
| A | *text did not match a valid plate format* | `format_reject` |
| B | *No plate found… Crop tighter…* | `plate_not_found` |

| Item | Value |
|------|--------|
| File | `RP07032017-tuch.jpg` |
| Plate | Yellow · **WOO 185** · footer NCR UV EXP · PH badge |
| Frame | Wide rear UV Express (TOUCH, stickers, bumper text) |
| Night class | Still **PASS** (do not regress) |

---

## Why yellow-lock V1 failed

| Cause | Effect |
|-------|--------|
| **No real plate YOLO weights** | OpenCV/yellow-hint often miss or box wrong → `plate_not_found` |
| **Generic OCR on hard yellow+badge** | String never locks → `format_reject` |
| Ban-per-line / badge / W00 fixes | Helped unit strings · **not enough** on this field photo |
| Wide rear + slogan soup | Detector/OCR still loses to noise |

Lab unit locks (`WOO:185` + footer) ≠ this camera JPEG.

---

## What still works

| Keep |
|------|
| Soft fail UI |
| Night harden path |
| ≥80% floor + PH regex as **validator** |
| Strategy: detect → crop → plate-native rec (not HyperLPR3 for PH) |

---

## Next MOB (one path)

### `ANPR-PLATE-YOLO-PACK-AND-READ-V1`

| # | Work |
|---|------|
| 1 | Pack or fine-tune **plate YOLO** weights into `anpr-sidecar/models/` |
| 2 | OCR/rec **only** on YOLO plate crop (CLAHE/upscale keep) |
| 3 | Keep yellow-lock line ban + badge normalize as post |
| 4 | PASS gate: this `RP07032017-tuch.jpg` → **WOO 185** · night still PASS |

**Do not:** EasyOCR primary · HyperLPR3 as PH core · lower regex/floor · more colour hardcodes.

Follow-on after YOLO PASS: **`ANPR-PLATE-RECOGNIZER-V1`** (LPRNet/CRNN) or paid **`ANPR-ULTIMATEALPR-EVAL-V1`**.

---

## PASS / FAIL

| Layer | Status |
|-------|--------|
| Yellow-lock V1 field | **FAIL** |
| Night | PASS |
| Overall yellow class | **FAIL** |

---

## Operator decide

Say **`MOB-APPLY ANPR-PLATE-YOLO-PACK-AND-READ-V1`** when ready.

Optional now: crop **only** the yellow plate once — if still FAIL, proves OCR/rec; if PASS, proves detect. Not required for APPLY.

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Yellow-lock V1 | **Field FAIL** |
| Next | **`ANPR-PLATE-YOLO-PACK-AND-READ-V1`** |
| Code | **None** until APPLY |
