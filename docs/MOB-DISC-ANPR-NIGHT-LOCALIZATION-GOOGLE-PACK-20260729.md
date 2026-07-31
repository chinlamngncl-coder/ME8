# MOB DISC — ANPR PH harden: Google pack + agent method (joint)

**Date:** 2026-07-29  
**Status:** **APPLIED** — see `MOB-DISC-ANPR-PH-OCR-HARDEN-V1-APPLIED.md` · operator field verify pending  
**Search:** aspect ratio, CLAHE, bicubic upscale, main-line band, O/0, full_fallback, HWZ 1539, WOO 185  
**Evidence:**  
- Night van (`image_8c9366.png` class) — **HWZ 1539** @ 82% vs **WZT 539**  
- Yellow PUV (`RP07032017-tuch.jpg`) — **format_reject**  
**Related:**  
- `MOB-DISC-ANPR-MOB601-SHELL-PASS-FIELD-QUALITY-FAIL-20260729.md`  
- `MOB-DISC-ANPR-PLATE-DETECT-ROI-V1-APPLIED.md`  
- `MOB-DISC-ANPR-ROI-V1-FIELD-FAIL-YELLOW-PUV-20260729.md`  
- `MOB-DISC-ANPR-MOB601-CONSOLIDATE-YOLO-PADDLE-20260729.md`

---

## Purpose of this disc

Two inputs, **one merged APPLY**:

| Source | Focus |
|--------|--------|
| **Google pack** | Night glare + kill van-sized crops (aspect, CLAHE, upscale) |
| **Agent method** | ME8 field lessons — ROI bugs, yellow PUV band, harm locks, multi-pass OCR |

Use the **Discussion** section at the bottom to edit numbers, drop items, or split MOBs before APPLY.

---

## Acknowledgment (Google pack)

**Confirmed.** Aspect Ratio gating to block full-vehicle crops, Bicubic upscaling for low-res plates, CLAHE for nighttime glare — **when APPLY lands**.

---

## A — Google pack (external)

| Rule | Spec |
|------|------|
| **A1 Aspect hard gate** | `width/height` must be **1.5–5.5**; discard crop — no OCR |
| **A2 Upscale** | Bicubic to **height = 80px**, keep aspect: `cv2.INTER_CUBIC` |
| **A3 CLAHE** | `clipLimit=2.0`, `tileGridSize=(8,8)` → then `medianBlur(3)` |
| **A4 Keep locks** | PH regex + **≥80%** confidence floor unchanged |

**Lab note:** Root cause label “YOLO failed” is only half true today — weights missing; failure is **any** oversized ROI + `full_fallback`. Rules still apply on the shared preprocess path.

---

## B — Agent method (ME8 / field-driven)

These are **additions** Google did not specify. They target both Case B (wrong publish) and Case A (format reject).

### B1 — Localization hard stops (fix ROI V1 gaps)

| # | Rule | Why |
|---|------|-----|
| B1a | **Hard aspect reject everywhere** — `yolo_plate_rois`, `yolo_best_plate_crop`, and pre-OCR on **every** crop; remove “`score < 0` → still keep at 0.3+conf” path | Van box currently slips through YOLO scorer |
| B1b | **Max ROI area** — reject if box area **> 6%** of frame (env `FM_ANPR_ROI_MAX_AREA`, down from 12%) | Whole rear ≈ 10–30% |
| B1c | **Min ROI height** — reject if crop height **< 20px** before upscale (env `FM_ANPR_MIN_CROP_H`) | Upscale cannot invent missing pixels |
| B1d | **Prefer smallest valid ROI** — sort candidates by **area ascending** among passes that meet aspect+area gates, not highest YOLO conf alone | Big slogan box often wins today |
| B1e | **Gate `full_fallback`** — never `ok: true` from `full_fallback` on images where frame aspect looks like a **scene** (not tight plate); wide rear → **`plate_not_found`** or try next ROI only | Stops whole-frame HWZ class |

### B2 — Preprocess profiles (shared CLAHE hook)

One function, **profile picked from crop**:

| Profile | When | Steps |
|---------|------|--------|
| **`night`** | Low mean luminance OR high bright-pixel ratio (headlight bloom) | BGR→gray → **CLAHE** → medianBlur(3) → upscale h=80 |
| **`yellow_puv`** | High saturation + hue in yellow band (~15–45°) | BGR→**HSV V channel** or LAB-L → mild CLAHE (`clipLimit=1.5`) → medianBlur → upscale h=80 |
| **`standard`** | White/private plate, good light | gray → CLAHE light → medianBlur → upscale if h < 80 |

Auto-detect is **heuristic only** — no ML. Env override: `FM_ANPR_PREPROCESS=night|yellow|standard|auto`.

Google’s CLAHE rule = **`night`** profile default; yellow PUV gets its own path (Case A).

### B3 — Main-line band OCR (Case A)

| # | Rule | Why |
|---|------|-----|
| B3a | If crop already plate-shaped (`looks_like_tight_plate_crop`) → OCR **top 60%** band only first | Drops **NCR UV EXP** footer |
| B3b | Optional trim **top 8%** when “TOUCH” chrome visible (tall crop, text density top edge) | Operator photo still has trim |
| B3c | Full crop OCR **only** if band pass fails regex **and** band raw text has **≥2 digits** | Avoid double-publish |

### B4 — Post-OCR structural lock (PH)

| # | Rule | Why |
|---|------|-----|
| B4a | **Bounded O↔0** (and optionally **I↔1**) — only when compact is **one edit away** from regex match (e.g. `W00185` → try `WOO185`) | WOO/W00 class |
| B4b | **Ban-text fragment check** — if locked plate substring appears in a banned slogan token list, **reject** even @ high conf | UV/HWZ merges |
| B4c | **Multi-ROI agreement** — if top 2 ROIs yield **different** compacts both ≥ floor, **soft fail** (`ambiguous_read`) not pick higher conf | Reduces confident wrong |
| B4d | **Digit group tie-break** — when multiple regex matches in one string, prefer **3-digit** rear PUV class if scores tied (env flag, default on for `ph`) | HWZ**1539** vs WZT**539** — optional; **discuss** |

### B5 — Harm locks (never wrong on card)

| # | Rule |
|---|------|
| B5a | Do **not** lower regex or 80% floor to force a read |
| B5b | `ok: true` requires `det.source` ∈ `{opencv, paddle_line, yolo, full_tight}` — **not** `full_fallback` on wide scenes |
| B5c | If only candidate fails aspect/area gates → return **`plate_not_found`**, not best wrong OCR |
| B5d | UI stays soft-fail; optional lab `FM_ANPR_DEBUG=1` adds `rawText`, `roiCount`, `preprocessProfile`, `det.source` to API (not customer default) |

### B6 — Regression gate (operator photos)

| Photo | Class | PASS |
|-------|-------|------|
| `image_8c9366` / night van | Wide + glare | **WZT 539** or soft fail — **never** HWZ 1539 @ ok |
| `RP07032017-tuch.jpg` | Yellow tight | **WOO 185** (normalized display) |
| Synthetic AAJ 8008 | Lab | Still PASS |
| Synthetic bumper + WZT 539 | ROI V1 | Still PASS |

---

## C — Unified APPLY table (Google + agent)

Single MOB name: **`ANPR-PH-OCR-HARDEN-V1`**

| ID | Change | Source | Case |
|----|--------|--------|------|
| C1 | Hard aspect **1.5–5.5** discard | A1, B1a | B |
| C2 | Max area **≤6%**, min height **≥20px** | B1b–c | B |
| C3 | CLAHE + medianBlur + bicubic **h=80** | A2–3 | B |
| C4 | Preprocess profiles `night` / `yellow_puv` / `standard` | B2 | A+B |
| C5 | Main-line band **top 60%** on tight crops | B3 | A |
| C6 | Bounded **O↔0** post | B4a | A |
| C7 | Prefer **smallest** valid ROI; multi-ROI ambiguity soft fail | B1d, B4c | B |
| C8 | Kill **`full_fallback` ok:true** on wide scenes | B1e, B5b | B |
| C9 | Optional digit tie-break + ban fragment check | B4b,d | B |
| C10 | PH regex + **≥80%** floor | A4 | both |
| C11 | Debug env + regression set | B5d, B6 | ops |

**Out of scope for this MOB:** plate lists, live ZLM worker, YOLO retrain, lowering floor.

---

## Counter-check vs current code

| Item | Today | After APPLY |
|------|-------|-------------|
| Aspect gate | Soft score; YOLO keeps bad boxes | **Hard discard** |
| Preprocess | gray + median + normalize | **Profile + CLAHE + upscale** |
| Tight yellow crop | Full crop OCR | **Band first** |
| Wrong @ 82% | Published | **Harm lock → soft fail** |
| `full_fallback` | Can publish | **Gated** |

---

## PASS / FAIL targets

| Layer | Today | Target |
|-------|-------|--------|
| MOB-601 shell | PASS | PASS |
| ROI V1 bumper synthetic | Partial PASS | PASS |
| Night van field | **FAIL** | PASS or safe fail |
| Yellow PUV field | **FAIL** | PASS |
| Ship ANPR pack | Not ready | After field PASS + weights pack MOB |

---

## Discussion — refine together

Edit this section with your calls before APPLY.

### Open numbers (your pick)

| Parameter | Google / agent default | Your override? |
|-----------|------------------------|----------------|
| Aspect min–max | 1.5 – 5.5 | |
| Max ROI area | 6% frame | |
| Min crop height | 20px | |
| Upscale target height | 80px | |
| Main-line band | top 60% | |
| CLAHE clipLimit night | 2.0 | |
| CLAHE clipLimit yellow | 1.5 | |

### Open product calls

1. **Digit tie-break (B4d)** — Prefer 3-digit when OCR gives 4-digit on PUV? Helps HWZ**1539** vs **539**; might hurt true 4-digit private plates. **Recommend:** on only when crop profile = `yellow_puv` or ROI hint suggests UV footer.

2. **Split MOBs?** — One APPLY (`ANPR-PH-OCR-HARDEN-V1`) vs night-only first. **Recommend:** one MOB — shared preprocess function.

3. **Lab debug on card** — Show raw OCR under error for super-admin? **Recommend:** API debug flag only first; UI later if needed.

4. **YOLO weights** — Ship in same MOB or follow-on **`ANPR-YOLO-WEIGHTS-PACK-V1`**? **Recommend:** follow-on pack MOB after harden PASS on OpenCV/Paddle-line path.

### Your edits (paste below)

```
Operator notes:
-
-
```

---

## Operator decide

When disc is agreed:

- **`MOB-APPLY ANPR-PH-OCR-HARDEN-V1`**

Alternate split (only if you want staged test):

- **`MOB-APPLY ANPR-NIGHT-LOCALIZATION-V1`** — C1–C3, C7–C8 only  
- then **`MOB-APPLY ANPR-PH-YELLOW-BAND-V1`** — C4–C6

**No code until APPLY.**

---

## Lock record

| Item | Status |
|------|--------|
| Google pack (aspect, CLAHE, upscale) | **In merged spec** |
| Agent method (band, profiles, harm locks, ROI fixes) | **In merged spec** |
| Unified MOB name | **`ANPR-PH-OCR-HARDEN-V1`** (default) |
| Discussion section | **Open — edit together** |
| Code | **None** until APPLY |
