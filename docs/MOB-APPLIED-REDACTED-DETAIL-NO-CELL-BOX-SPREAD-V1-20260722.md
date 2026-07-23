# MOB-APPLIED — REDACTED-DETAIL-NO-CELL-BOX-SPREAD-V1

**Date:** 2026-07-22  
**APPLY:** `MOB-APPLY REDACTED-DETAIL-NO-CELL-BOX-SPREAD-V1`  
**Disc:** `MOB-DISC-REDACTED-DETAIL-NO-BOX-SPREAD-20260722.md`

## Contract (what you asked)

1. **No box-in-box** — kill per-cell rectangle borders on Redacted exports.  
2. **One horizontal line across the full row to the right edge** — does **not** stop at “Open source”.  
3. **Download** left · **Open source** right (spread).  

## Changes

| File | Change |
|------|--------|
| `public/index.html` | Redacted table: `border: none` + `border-bottom` only (`!important` over global evidence-table boxes); Detail col ~24% remaining width; flex `space-between` |
| `public/js/evidence-hub.js` | Drop mid `·` separator |
| Cache | `evidence-hub.js?v=20260722-rx-detail-no-box-spread-v1` |

## Operator verify

1. **Ctrl+F5**  
2. Evidence → Redacted exports → Detail  
3. No little boxes around the links  
4. Line under each row runs **all the way to the end** of the table  
5. Download on the left, Open source on the right  

**PASS / FAIL:** **FAIL** (operator) — line still stopped under Open source; superseded by `REDACTED-DETAIL-FULL-ROW-LINE-V1`
