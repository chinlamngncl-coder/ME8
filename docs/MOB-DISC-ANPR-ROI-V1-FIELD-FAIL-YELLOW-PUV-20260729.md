# MOB DISC — ANPR ROI V1 field FAIL: yellow PUV tight crop (WOO/W00 185)

**Date:** 2026-07-29  
**Status:** **LOCKED** — `ANPR-PLATE-DETECT-ROI-V1` **field FAIL** on operator photo  
**Search:** yellow PUV plate, WOO 185, W00 185, NCR UV EXP, format reject, tight crop  
**Evidence:** Operator screenshot `RP07032017-tuch.jpg` — format reject, “Awaiting read”  
**Related:**  
- `MOB-DISC-ANPR-PLATE-DETECT-ROI-V1-APPLIED.md`  
- `MOB-DISC-ANPR-MOB601-SHELL-PASS-FIELD-QUALITY-FAIL-20260729.md`  
- `MOB-DISC-ANPR-MOB601-CONSOLIDATE-YOLO-PADDLE-20260729.md`

---

## Plain English

1. **Operator verdict: FAIL** — yellow PUV crop still does not read. UI correctly **does not** show a wrong plate (soft fail), but ops need a **correct read**, not another “try again.”  
2. **ROI V1 did not fix this class** — photo is **already a tight plate crop**. Bumper-ROI logic does not apply; the failure is **inside the plate band** (font, colour, footer, O/0, PH badge).  
3. Next work is **`ANPR-PH-OCR-HARDEN-V1`**, not another ROI MOB and not lists/live until this photo class PASSes.

---

## Evidence (this FAIL)

| Item | Value |
|------|--------|
| File | `RP07032017-tuch.jpg` |
| Plate type | **Yellow PUV** (NCR UV EXP footer) |
| Human read (approx) | **WOO 185** / **W00 185** (3 letters + 3 digits) |
| Crop | Operator-tight on plate; **TOUCH** trim still above; **NCR UV EXP** below main line |
| UI | *“No reliable plate read — the text did not match a valid plate format”* |
| Card | **Awaiting read** (good — no garbage published) |
| Error class | **`format_reject`** (OCR ran; PH regex did not lock a valid `AAA`+`###(#)`) |

---

## Why ROI V1 did not help here

| Expectation | Reality |
|-------------|---------|
| ROI stops bumper slogans | Crop is **already plate-only** — no UV EXPRESS band in frame |
| Paddle line picks plate row | Main row competes with **NCR UV EXP** footer and **TOUCH** chrome |
| OpenCV ROI finds plate box | Whole image **is** the plate — inner ROI often picks **footer** or wrong band |
| Synthetic Case B PASS | Proves bumper scene path — **not** yellow PUV tight crop |

**Conclusion:** ROI V1 is **partial PASS** (bumper scene synthetic) · **FAIL** on operator yellow PUV tight crop.

---

## Likely root causes (this photo)

| Cause | Effect |
|-------|--------|
| **Yellow PUV + grain + low res** | Generic EN Paddle weak on embossed yellow/black font |
| **O / 0 confusion** | `WOO` read as `W00` → regex sees 1 letter + digits, or illegal compact |
| **PH centre badge / colon artifact** | `W00:185` style split breaks `([A-Z]{3})(\d{3,4})` lock |
| **Footer “NCR UV EXP” in crop** | OCR merges or picks footer line; ban filters may leave no valid main line |
| **Preprocess tuned for white plates** | Gray + medianBlur alone insufficient for yellow PUV |
| **No main-line band split** | Engine OCRs entire crop including footer — not “top plate line only” |

Regex and 80% floor are **working as designed** (reject). The **read never becomes lockable**.

---

## What still works (keep)

| Piece | Keep |
|-------|------|
| Soft fail UI | Yes — never show wrong plate on card |
| PH regex + ≥80% floor | Yes |
| OpenCV clean before OCR | Yes — extend for yellow |
| ROI for **wide** rear shots | Yes — Case B class |
| MOB-601 ZLM-read-only rule | Yes for later live |

---

## Recommended fix path (one path)

### Next MOB: `ANPR-PH-OCR-HARDEN-V1`

| # | Change | Why |
|---|--------|-----|
| 1 | **Main-line band** — on tight crop, OCR **top ~55–65%** of plate ROI only; ignore footer band (NCR / UV EXP) | Direct fix for this screenshot |
| 2 | **Yellow PUV preprocess** — HSV/luminance normalize, CLAHE, optional upscale 2× before OCR | Field font class |
| 3 | **PH O/0 post** — after OCR, try bounded O↔0 variants **only** when regex almost matches (e.g. `W00`+`185` → test `WOO185`) | WOO/W00 class |
| 4 | **Regression set** — operator photos: yellow PUV (`RP07032017-tuch.jpg`), night van (WZT 539), white AAJ 8008 | PASS gate |
| 5 | Optional lab: show **raw OCR** one line under error (super-admin / lab only) | Faster field debug — not customer default |

### Do not do first

| Idea | Why |
|------|-----|
| Another ROI-only MOB | This crop is already tight |
| Plate lists | Lists on bad reads = false hits |
| Live ZLM worker | Same bad OCR at scale |
| Lower regex / remove floor | Brings back HWZ 1539 garbage class |

### Still need later (unchanged)

- Packed **YOLO plate weights** + ship parity (FR-style)  
- Offline video / live ZLM after PH harden PASS  
- Public notice after weapons (existing disc)

---

## PASS / FAIL (updated)

| Layer | Status |
|-------|--------|
| MOB-601 shell | PASS |
| ROI V1 — bumper/wide scene | Partial (synthetic PASS) |
| ROI V1 — **yellow PUV tight crop** | **FAIL** (this photo) |
| Field quality overall | **FAIL** |
| Ship | Not ready |

**Operator PASS for PH harden:** `RP07032017-tuch.jpg` → **WOO 185** or **W00 185** (normalized display `WOO 185` if O/0 resolved) — not format reject.

---

## Operator decide

When ready:

- Say **go ahead** / `MOB-APPLY ANPR-PH-OCR-HARDEN-V1`

No code in this disc.

---

## Lock record

| Item | Decision |
|------|----------|
| ROI V1 field result | **FAIL** on yellow PUV tight crop |
| Root story | Inside-plate OCR + footer/badge/O0 — not bumper ROI |
| Next default MOB | **`ANPR-PH-OCR-HARDEN-V1`** |
| Code | **None** until APPLY |
