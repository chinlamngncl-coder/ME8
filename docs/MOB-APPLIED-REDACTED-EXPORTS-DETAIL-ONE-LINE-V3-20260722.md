# MOB APPLIED — REDACTED-EXPORTS-DETAIL-ONE-LINE-V3

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-REDACTED-EXPORTS-DETAIL-STACK-SCROLL-20260722.md`

## Problem

After V2 (inline links), Detail column still showed **Download** and **Open source** on **two lines** per row — flex-wrap + narrow 18% column.

## Applied

- **`flex-wrap: nowrap`** on `.ev-rx-actions`
- **`Download · Open source`** with `ev-rx-action-sep` between links (only when both present)
- Detail column **20%** + `min-width: 148px`; Source column 16%
- V2 link styling unchanged

## Files

- `public/index.html` — CSS
- `public/js/evidence-hub.js` — action HTML + separator

## Verify (operator)

1. **Ctrl+F5** → Evidence → Redacted exports
2. Detail column: **one line** per row — `Download · Open source`
3. 15+ rows: vertical scroll inside table box (unchanged)
4. 50+ total: Previous/Next pager (unchanged)

## Cache

- `evidence-hub.js?v=20260722-rx-detail-v3`
