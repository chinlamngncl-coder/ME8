# MOB APPLIED — ANPR-LIVE-RAIL-4X4-EQUAL-V1

**Date:** 2026-07-31  
**APPLY:** `ANPR-LIVE-RAIL-4X4-EQUAL-V1`  
**Status:** APPLIED — await operator PASS  
**Disc:** `MOB-DISC-ANPR-LIVE-RAIL-4X4-EQUAL-ROW-SHIFT-20260731.md`

---

## Hard wall

**This MOB does not touch China zip / packer / license / Docker.**  
China pack problem is a **separate** disc: `MOB-DISC-CN-ZIP-PROBLEM-SEPARATE-FROM-ANPR-20260731.md`.

---

## What changed (Live UI only)

| Piece | Change |
|-------|--------|
| Live | Still **4**, smaller (~40% / max-width 560px) |
| Rail grid | **4×4 equal** (`repeat(4, 1fr)` × 4) — not 2×8 |
| New snap | Newest top-left; others shift row-major; short shift flash on first cell |
| Files | `public/css/global.css`, `public/index.html`, `public/js/anpr-live-watch.js` |
| Cache | `?v=20260731-anpr-live-rail-4x4-equal-v1` |

---

## Operator

Hard refresh → Analytics → ANPR → **Live**.

**PASS:** Smaller 4 live tiles; **4×4** equal rails; new snap top-left and cards move along the row; no cut-off.  
**FAIL:** Still 2×8; unequal cells; live huge; clipped.
