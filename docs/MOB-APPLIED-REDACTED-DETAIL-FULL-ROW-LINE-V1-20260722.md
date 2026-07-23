# MOB-APPLIED — REDACTED-DETAIL-FULL-ROW-LINE-V1

**Date:** 2026-07-22  
**APPLY:** `MOB-APPLY REDACTED-DETAIL-FULL-ROW-LINE-V1`  
**Disc:** `MOB-DISC-REDACTED-DETAIL-FULL-ROW-LINE-20260722.md`  
**Prior FAIL:** `REDACTED-DETAIL-NO-CELL-BOX-SPREAD-V1` (flex on `td` shrank the border)

## What fixed

1. **Joined / aligned line** — `border-bottom` on the **`tr`**, not a short stub under the links.  
2. **To the right ending** — Detail `td` stays a real table-cell (`display: table-cell`); flex only on inner `.ev-rx-actions-inner` at `width: 100%`.  
3. Download left · Open source right (unchanged intent).  
4. No cell box-in-box.

## Files

| File | Change |
|------|--------|
| `public/index.html` | Row-level borders; remove flex-on-`td` |
| `public/js/evidence-hub.js` | Wrap links in `.ev-rx-actions-inner` |
| Cache | `evidence-hub.js?v=20260722-rx-detail-full-row-line-v1` |

## Operator verify

1. **Ctrl+F5** (required)  
2. Evidence → Redacted exports  
3. Under each row: **one continuous line** from left through When/Detail **to the right border**  
4. Line does **not** stop under “Open source”  
5. Download left, Open source right  

**PASS / FAIL:** _(operator)_
