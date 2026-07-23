# MOB DISC — 242×136? Panel 5 cut? Suggest (NO APPLY)

**No code. Suggest only.**

---

## Your question

- Try **242×136** (real 16:9)?  
- But with **136** tall, won’t **panel 5** get cut?  
- Suggest. Common sense.

---

## Short answer

**242×136 is the right *shape* (16:9).**  
**Fixed 136 × five panels can still cut panel 5** on a normal Ops window — yes, you’re right to smell that.

So: don’t lock “always 136” if five won’t fit. Lock **16:9**, and pick a height that **fits all five** (plus heads), then width = height × 16/9.

---

## Rough numbers (why panel 5 dies)

Each panel needs roughly:

- Head (Live + buttons) ≈ **24–30px**  
- Video box height **H**  
- Caption under ≈ **10–14px**  
- Gap ≈ **3px**

Five of those ≈ **5 × (H + ~40)** + bank tab row.

If **H = 136** → about **5 × 176 ≈ 880px** of stack + tabs.  
Many desks don’t give the wall that much → `#video-wall` clips → **panel 5 fucked / cut off**.

So **242×136** alone = good AR, **bad** if five don’t fit vertically.

---

## Suggest (common sense) — one plan

**Goal:** full picture, no black sides, all five heads fully visible (no cut-off buttons), bank tabs stay.

1. **Widen the wall enough for the button row** (fix the horizontal cut-off) — separate from video AR.  
2. **Video box = 16:9 always**, but height is **fitted**:  
   - Measure space for five slots  
   - `H = floor(available / 5) − head − caption`  
   - `W = round(H × 16 / 9)` (example: H=120 → W≈213; H=110 → W≈196)  
3. **contain** inside that box → same full frame as pin intent, **no sides**.  
4. Pack from top; blank under if space left.  
5. **Do not** use pin compact 80/96 logic.  
6. **Do not** touch pin / Call / PTT / SOS.

**242×136** = only if your window is tall enough that five × (136+chrome) fit.  
If not, **smaller 16:9** (same shape, shorter) — still no sides, panel 5 lives.

---

## What not to do

| Bad | Why |
|-----|-----|
| Hard **300×136** again | Not 16:9 → sides |
| Hard **242×136** with eyes closed | May cut panel 5 |
| Cover again as the only fix | Sides gone, pin/panel crop fight returns |
| Shrink buttons into the video | You wanted chrome **outside** the box |

---

## Suggested APPLY name (when you want)

`MOB-APPLY-PANEL-16x9-FIT-FIVE-NO-CLIP`

Meaning:

- 16:9 video box fitted so **panels 1–5 all visible**  
- Head fully visible (wall wide enough)  
- contain, no black sides  
- Not pin size ladder  

---

## One line

> **242×136 is correct 16:9 shape, but fixed 136 may cut panel 5. Better: 16:9 sized to fit all five, then width follows height.**
