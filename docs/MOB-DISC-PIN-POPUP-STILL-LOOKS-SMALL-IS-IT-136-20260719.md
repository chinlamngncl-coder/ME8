# MOB DISC — Still looks small: is it really 136?

**Status:** DISC only — 2026-07-19 · **no APPLY**  
**Operator:** “still look small… are you sure 136? I doubt so”  
**Boundary:** Facts + how to prove — no function / no edits until you order

---

## Short answer

**Yes — for 1–4 open pins, CSS height is set to 136px** in live `public/index.html` (line ~4335).  
Your eye can still be right that it **looks** smaller than classic — height is not the only size.

---

## What the file actually says (verified)

| Rule | Value now |
|------|-----------|
| `.media-box.map-pin-video` | **`height: 136px`** |
| 1–4 pins (no compact/heavy) | Uses that default → **136** |
| 5–6 | **120** |
| 7–8 | **110** |
| `.map-popup` width (SLIM-8, still live) | **260px** |
| Classic-pass (2026-07-18) | height **136** + width **300** |

So: **height token matches classic. Width does not.**

---

## Why it still looks small (even when height is 136)

### 1) Panel width cut (main suspect)

| | Width × height | Approx area |
|--|----------------|-------------|
| Classic-pass | **300 × 136** | ~40,800 px² |
| Live now (1–4) | **260 × 136** | ~35,360 px² (**~13% less**) |

Same height, **narrower box** → picture reads smaller. Density APPLY fixed height ladder; it did **not** restore width to 300.

### 2) Compare to Ops wall

Wall stage is hundreds of px tall. Pin at 136 always feels “small” next to wall — that is relative, not a failed 136.

### 3) `object-fit: contain` / letterbox

ZLM / soft look uses contain → black bars inside the box. **Box can be 136 while the active image is shorter.** DevTools height on `.map-pin-video` still shows 136; the *picture* inside looks smaller.

### 4) Density still on (if ≥5 open)

If you have **5+** pins open, height is **120 or 110**, not 136. Easy to mis-test.

### 5) Cache

If head-gap fix already visible, cache is less likely — still: Ctrl+F5 once when checking.

---

## How you (or we) prove it in 10 seconds

1. Open **only 1 or 2** pins (not 5+).  
2. Chrome DevTools → select the black video box (`.media-box.map-pin-video`).  
3. Computed styles:
   - `height` → should be **`136px`**
   - `width` → should be about **`260px`** (or slightly less with padding)
4. If height is **120 / 110 / 96**, say how many pins are open + whether `map-popup-compact` / `map-popup-crowded-heavy` is on the popup.

If height is **136** and it still feels small → the gap vs classic is almost certainly **width 260 vs 300** (and/or contain letterbox), not a failed height APPLY.

---

## Suggestion (next APPLY — only if you order)

`MOB-APPLY-PIN-POPUP-WIDTH-300` (or 280):

- Restore `.map-popup` width **260 → 300** (classic)  
- Keep video height **136** for 1–4  
- Keep gentle 120 / 110 density for 5–8  
- CSS only — no play/mirror/ZLM

Optional later: pin video `object-fit: cover` (fills box, crops edges) — **separate** disc; changes look, not just size.

---

## One line

**Height is 136 in CSS for 1–4**; it still looks small mainly because **width is still 260 (classic was 300)** and/or contain letterboxing — prove with DevTools computed `height`/`width`.
