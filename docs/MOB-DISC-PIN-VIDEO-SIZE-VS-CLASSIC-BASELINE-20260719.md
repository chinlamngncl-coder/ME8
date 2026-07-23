# MOB DISC — Pin **video** size vs classic baseline (not whole popup chrome)

**Status:** DISC only — 2026-07-19 · **no APPLY**  
**Operator:** “I am asking the **video**, not the whole size… double check first baseline”  
**Baseline used:** `baseline/2026-07-18-classic-pass` (= `me8-classic-pass-20260718`, first classic PASS floor we cite for pin chrome)

---

## Direct answer

| What you mean | Classic-pass | Live now (1–4 pins) | Same? |
|---------------|--------------|---------------------|--------|
| **Video box height** (the black live area) | **`136px`** | **`136px`** | **Yes — same** |
| **Video box width** (CSS) | **`width: 100%`** of popup | **`width: 100%`** of popup | Same rule |
| **Painted video width** (pixels on screen) | ~**300px** (popup was 300) | ~**260px** (popup is 260) | **No — live video is narrower** |

So: **video height matches classic.**  
**Video is still smaller on screen** because the video box is always full width of the popup, and SLIM-8 left popup at **260** (classic **300**). That is the video face, not “chrome outside the video.”

There is **no** separate classic CSS like `video { width: 300px; height: 136px }`. Only:

```css
/* classic-pass AND live (1–4) */
.media-box.map-pin-video { width: 100%; height: 136px; … }
```

---

## Proof from baseline file

**Classic** `baseline/2026-07-18-classic-pass/public/index.html`:

```css
.map-popup {
  min-width: min(300px, …);
  max-width: min(300px, …);
  width: min(300px, …);
}
.media-box.map-pin-video { width: 100%; height: 136px; … }
```

**Live** `public/index.html`:

```css
.map-popup {
  min-width: min(260px, …);   /* SLIM-8 — still here */
  max-width: min(260px, …);
  width: min(260px, …);
}
.media-box.map-pin-video { width: 100%; height: 136px; … }
```

Approx video rectangle:

| | W × H |
|--|-------|
| Classic | **~300 × 136** |
| Live | **~260 × 136** |

Height identical; **width of the video itself** down ~13%.

---

## What this is / is not

| Is | Is not |
|----|--------|
| Video **height** restored to classic **136** | Whole-popup chrome discussion only |
| Video **width** still tied to popup 260 | A second height bug hiding at 118 |
| Density 5+ still 120/110 | Classic default for 1–4 |

Firmware Gold pack in-repo has no packed `index.html` to diff; classic-pass is the concrete baseline with these tokens.

---

## One line

**Video height is classic 136; video looks smaller because video width is 100% of a 260px popup (classic was 300) — that is the live picture width, not outer chrome.**
