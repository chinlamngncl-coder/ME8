# MOB-APPLIED — REDACTED-EXPORTS-ROW-COMPACT-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Status:** APPLIED — **operator FAIL** (Detail boxes remain) → `MOB-DISC-REDACTED-EXPORTS-DETAIL-ACTIONS-UGLY-20260722.md`  
**Next:** `REDACTED-EXPORTS-DETAIL-ACTIONS-V2`

## Fixed

| Issue | Fix |
|-------|-----|
| Download / Open source letters stacked vertically | Detail `td.ev-rx-actions` exempt from `overflow-wrap: anywhere` |
| Rows hundreds of px tall | Compact padding; actions `nowrap` + flex wrap horizontal |
| Detail column too narrow | 13% → 18% width |
| Long filenames blow layout | `.ev-rx-name` / `.ev-rx-source` ellipsis |

## Operator verify

1. **Ctrl+F5**.  
2. Redacted exports → 8 rows fit as **normal compact rows**.  
3. Download + Open source readable on one line (or two button lines, not letter stack).  
4. Vertical scroll only when many rows exceed viewport; no horizontal scroll-right.

## Out of scope

- Case Files empty compact → `CASE-FILES-EMPTY-COMPACT-V1`  
- Prior exports Finalized clear (done earlier)
