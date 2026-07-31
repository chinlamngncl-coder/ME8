# MOB DISC — Yellow PUV FAIL while night PASS (why clearer loses)

**Date:** 2026-07-29  
**Status:** **LOCKED** — open for discussion · no code until APPLY  
**Evidence:** Operator screenshot `RP07032017-tuch.jpg` — soft fail *format reject* · card **Awaiting read**  
**Night class:** Operator **PASS** after harden sidecar live (`mob601-ph-harden-v1`)  
**Related:**  
- `MOB-DISC-ANPR-PH-OCR-HARDEN-V1-APPLIED.md`  
- `MOB-DISC-ANPR-PH-OCR-HARDEN-V1-FIELD-FAIL-20260729.md`  
- `MOB-DISC-ANPR-ROI-V1-FIELD-FAIL-YELLOW-PUV-20260729.md`

---

## Plain English

1. **Night van = PASS.** Harden (aspect gate + CLAHE + upscale + harm locks) fixed that class.  
2. **Yellow PUV = still FAIL** — clear daylight photo, human reads the plate easily on a big monitor; ANPR returns *“did not match a valid plate format.”* Soft fail is correct (no wrong plate on card). Ops still cannot use it.  
3. **Why “clearer” loses:** Human clarity ≠ OCR class. Night was a **localization + glare** problem. Yellow is a **PH plate-layout + colour + ban-filter** problem. Harden solved the first; the second is still open.

---

## What the yellow photo actually is

| Item | Value |
|------|--------|
| File | `RP07032017-tuch.jpg` |
| Frame | **Wide rear of UV Express** — not a tight plate-only crop |
| Plate | Yellow PUV · main line ~**WOO 185** / **W00 185** |
| PH badge | Centre emblem reads like a **colon `:`** between letters and digits (`WOO:185`) |
| Footer | **NCR UV EXP** under the number |
| Noise | **TOUCH** handle, stickers (**1584**), **UV Express Service**, route text, **TURBO** |

UI: format reject · **Awaiting read** (good gate).

---

## Why night PASS does not imply yellow should PASS

```
Human ranking:     yellow daylight  >>  night glare
OCR failure class: yellow layout    !=  night localization
```

| | Night van (PASS) | Yellow PUV (FAIL) |
|--|------------------|-------------------|
| Hard problem | Tiny plate in dark + headlight bloom + bumper slogans | Yellow paint + embossed font + **PH centre badge** + **footer line** + slogan soup |
| What harden fixed | Aspect kill van-box · CLAHE night · upscale · block wrong publish | Only partly (yellow profile + band exist) |
| Plate style | Typical dark-on-light reflective | **Public UV yellow** — different CV path |
| Frame | Wide rear (similar) | Wide rear **plus** strong competing text (`TOUCH`, `1584`, UV Express) |
| Outcome | Correct plate or usable read | OCR string never becomes lockable `AAA`+`###` |

**Night is harder for eyes; yellow is harder for this pipeline.** Different bugs.

---

## Likely root causes (yellow only) — ranked

### 1. Ban-text kills a good lock (high probability)

`lock_plate_from_raw` **rejects** if `BAN_TEXT` matches **anywhere** in `rawText`.

`BAN_TEXT` includes `UV EXP`, `EXPRESS`, `TOUCH`, etc.

If Paddle returns one blob or joined lines like:

`WOO 185` + `NCR UV EXP` · or · `TOUCH` near plate

→ even a correct `WOO185` regex hit becomes **`None`** → UI **format reject**.

Night PASS often means the **winning OCR line was plate-only** (no banned token in that string). Yellow footer is **on the plate itself** — ban hits more often.

### 2. Full rear frame — main-line band may not run

Main-band (top 60%) only when crop is **`looks_like_tight_plate_crop` AND yellow profile**.

This screenshot is a **wide vehicle rear**. Band gate may stay **off** → OCR sees footer + TOUCH + bumper → compact string illegal or ban-killed.

### 3. PH centre badge as `:` / junk between letters and digits

Human: `WOO 185`. OCR may emit `WOO:185`, `W00:185`, `WOO.185`.

Compact strip usually removes `:` → `WOO185` / `W00185`. **O↔0** variants should cover `W00`→`WOO` — **unless** ban (cause 1) or multi-line merge happens first.

### 4. Yellow colour / emboss — not the same as night CLAHE

CLAHE on V-channel helps yellow somewhat; it does **not** remove footer or badge. Synthetic yellow PASS ≠ field embossed yellow.

### 5. Competing digits (`1584` sticker)

Can invent illegal or wrong digit groups; regex may lock wrong fragment or fail.

---

## What still works (keep)

| Piece | Keep |
|-------|------|
| Night harden path | Yes — **PASS** locked |
| Soft fail UI (no garbage on card) | Yes |
| PH regex + ≥80% floor | Yes — do **not** lower |
| Ban slogans for ROI scoring | Yes |
| Ban on **whole raw string after lock** | **Change** — too aggressive for yellow footer |

---

## Recommended next MOB (one path)

### `ANPR-YELLOW-PUV-LOCK-V1`

| # | Change | Why |
|---|--------|-----|
| 1 | **Split lines before ban** — ban filters **per OCR line**; lock from **best plate-like line**; footer `NCR UV EXP` never poisons main-line lock | Fixes cause 1 |
| 2 | **Force main-band when yellow profile** on any ROI (not only “tight full frame”) | Fixes cause 2 |
| 3 | **PH badge separator** — treat `: . · \|` between letter and digit blocks as space before compact | Fixes cause 3 |
| 4 | **O↔0 on letter block only** after separator strip (keep bounded) | WOO/W00 |
| 5 | Regression: this screenshot + night van still PASS | Field gate |

**Do not:** lower regex/floor · another generic CLAHE-only MOB · lists/live until yellow PASS.

---

## PASS / FAIL (updated)

| Class | Status |
|-------|--------|
| Harden sidecar running | PASS (`mob601-ph-harden-v1`) |
| Night van field | **PASS** |
| Yellow PUV field (`RP07032017-tuch.jpg`) | **FAIL** (format reject) |
| Overall ANPR field | **FAIL** until yellow PASS |

---

## Operator decide

When ready:

- **`MOB-APPLY ANPR-YELLOW-PUV-LOCK-V1`**

Optional before APPLY: crop **only the yellow plate** (exclude bumper) once — if that PASSes, proves wide-frame + ban/footer; if still FAIL, proves inside-plate OCR/badge.

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Night | **PASS** |
| Yellow clearer-than-night | **FAIL** — different failure class |
| Paradox | Eyes ≠ OCR; night≠yellow pipeline |
| Next MOB | **`ANPR-YELLOW-PUV-LOCK-V1`** |
| Code | **None** until APPLY |
