# MOB DISC — FR snap: float / minimize / keep · map + pic

**Status:** **`mob-fr-snap-lightbox-float` APPLIED** · **`mob-fr-snap-keep-card` APPLIED 2026-07-13** · mini-map parked  
**Date:** 2026-07-13  
**Search:** fr-snap-lightbox, Keep, kept card, show on map  

---

## APPLIED — `mob-fr-snap-keep-card`

| File | Change |
|------|--------|
| `public/js/fr-alarm.js` | **Keep** clones snap into `#fr-snap-kept` (drag / min / map / close); survives closing lightbox + tab switch; one kept slot (new Keep replaces) |
| `public/index.html` | Kept-card CSS (left dock, cyan chrome); cache-bust |
| `public/locales/en.json` | Keep / Kept strings |

**PASS check:** Open snap → **Keep** → close snap card → switch Analytics ↔ Ops → kept card still there → Show on map / dismiss ×.

---

## Still parked

| MOB | Scope |
|-----|--------|
| `mob-fr-snap-card-mini-map` | Streets inside kept card |
| Multi-keep stack | Only if one kept slot is not enough |

---

## Suggested next

Match fix (fresh enroll under onnx) or `mob-fr-snap-card-mini-map` if you still want streets in the card.
