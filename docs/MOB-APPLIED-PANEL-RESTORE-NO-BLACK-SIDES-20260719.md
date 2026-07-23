# MOB-APPLIED — Panel restore no black sides (2026-07-19)

**APPLY:** `MOB-APPLY-PANEL-RESTORE-NO-BLACK-SIDES`  
**Operator:** bare `APPLY` after FAIL discs (pic already given; black sides showing)

## Intent

Restore Ops panel PASS look: **no black left/right sides** on ZLM wall live.

## Change

| File | What |
|------|------|
| `public/index.html` | Panel ZLM `<video>` → `object-fit: cover` |
| `public/js/video-wall.js` | `softAttachZlmOverlay(..., { objectFit: 'cover' })` |
| Cache | `?v=20260719-no-black-sides` |

**Not touched:** map pin, SOS/PTT/Call, bank 5+3 tabs, Firmware Gold pin-mirror cores beyond wall mount opts.

## Operator check

1. Hard refresh Ops.  
2. Open ZLM live on a wall panel.  
3. **Pass** = picture fills the black box; **no** empty black strips on left/right.  
4. Say pass/fail from what you see.

## Note

Fill uses **cover** on the panel only. Mild top/bottom crop can return vs pin — this APPLY prioritizes **no side bars** as you ordered.
