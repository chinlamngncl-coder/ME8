# MOB DISC — Why pin video still looks small (double-check)

**Status:** DISC only — 2026-07-19 · **no APPLY · no function edits**  
**Operator:** “video size is not 136? it looks small”  
**Boundary:** Confirm CSS facts only

---

## Honest verdict

**Default height token is 136px in source now** — restore APPLY did land:

```css
.media-box.map-pin-video { … height: 136px; … }   /* public/index.html ~4335 */
```

If it **still looks small**, it is usually **not** because the default stayed at 118. It is because **other rules or width still shrink what you see**.

---

## Height ladder (what actually wins)

| Condition | Pin video CSS height | When |
|-----------|----------------------|------|
| Default (1–2 pins, not narrow) | **136px** | Restore APPLY |
| `map-popup-compact` **or** `html.map-viewport-narrow` | **96px** | Auto when **≥3 open pins** OR cluster ≥3, or narrow map |
| `map-popup-crowded-heavy` | **80px** | Auto when **≥6 open pins** |

Density JS (same file, ~10316):

```js
PIN_POPUP_CROWDED_MIN = 3;        // → compact → 96px
PIN_POPUP_CROWDED_HEAVY_MIN = 6;  // → heavy → 80px
```

So: testing with **3+ pins open** (your 8-up goal) → browser paints **96px** (or **80px** at 6+), **not** 136. That overrides the restored default. This density shrink was **already there** before SLIM/BALANCE/RESTORE; restore only fixed the default token.

**How to prove in Chrome:** open one pin alone → DevTools on `.media-box.map-pin-video` → computed `height` should be **136px**. Open 3+ → should jump to **96px** and class `map-popup-compact` appears.

---

## Width also makes it “look” small

| Era | `.map-popup` width |
|-----|-------------------|
| Classic-pass baseline | **300px** |
| After SLIM-8 (still live) | **260px** |

Same 136px height in a **narrower** panel → picture reads smaller. Restore APPLY did **not** put width back to 300.

---

## Other “looks small” (box can be 136, picture still soft/small)

| Factor | Effect |
|--------|--------|
| `object-fit: contain` on ZLM / mirror | Letterbox inside the box — black bars, image smaller than box |
| Cache / no hard refresh | Old CSS if Ctrl+F5 skipped (less likely if head gap fix already visible) |

---

## What RESTORE did / did not

| Did | Did not |
|-----|---------|
| Default height **118 → 136** | Remove compact **96** / heavy **80** overrides |
| Kill Leaflet `<p>` head margin | Restore panel width **260 → 300** |
| | Change density thresholds (3 / 6) |

So you can be right that it “looks small” even after restore — especially with multiple pins open.

---

## Possible next APPLY (only if you order — not now)

`MOB-APPLY-PIN-POPUP-KEEP-136-ALWAYS` (name TBD):

1. Stop compact/heavy from cutting video height (keep 136 even at 3–8 pins), **or** raise thresholds  
2. Optional: restore panel width **300px**  
3. CSS only — no pin play / mirror / ZLM function  

Or only: `MOB-APPLY-PIN-POPUP-WIDTH-300` if height is fine on single pin.

---

## One line

**Source default is 136px**, but **≥3 open pins force 96px** (6+ → 80px), and width is still **260** not classic **300** — that is why it still looks small.
