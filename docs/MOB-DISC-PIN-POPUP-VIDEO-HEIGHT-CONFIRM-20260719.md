# MOB DISC — Restore pin video 136px + crush head band

**Status:** APPLIED — `MOB-APPLY-PIN-POPUP-RESTORE-VIDEO-CRUSH-HEAD` · 2026-07-19  
**Boundary:** CSS chrome only in `public/index.html` — no pin play / mirror / ZLM / Call / PTT

---

## Root cause of tall blue head

Leaflet default:

```css
.leaflet-popup-content p { margin: 1.3em 0; }
```

Pin title is a `<p class="map-popup-title">`. Our `margin: 0` lost on specificity → **~1.3em gap above and below the words** = the wasted blue band in the screenshot.

---

## APPLIED

| Change | Result |
|--------|--------|
| Pin video height | **118 → 136px** (classic-pass restore) |
| Placeholder min-height | **136px** |
| Override Leaflet `p` margin on pin popups | `margin: 0 !important` |
| Pin content margin | **2px 6px** |
| Head margin / title line-height | flush to video |
| −/× | slightly tighter (20px, top 2px) |

**Operator:** hard refresh (Ctrl+F5) → title sits tight over video; picture back to classic size.

---

## One line

Video restored to **136px**; blue gap was Leaflet `<p>` margin — killed for pin popups only.
