# MOB-APPLIED — REDACTED-EXPORTS-FILL-LAYOUT-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-REDACTED-EXPORTS-FILL-LAYOUT-WASTE-SCROLL-20260722.md`  
**Cache:** `evidence-hub.js?v=20260722-rx-fill-layout`

## Fixed

| Issue | Fix |
|-------|-----|
| List stuck at **280px** with empty page below | `#ev-panel-redacted-exports` fills viewport under chrome |
| Vertical scroll with few files | Scroll only inside filled table box when rows overflow |
| Horizontal scroll to blank | `table-layout: fixed`, wrap long names, Detail buttons wrap in-cell |
| Floating strip look | One bordered list box (`#ev-rx-table-wrap`) grows with the panel |

## Operator verify

1. Hard refresh (**Ctrl+F5**) — no server restart required (CSS/JS only).  
2. Evidence → **Redacted exports**.  
3. List box should reach toward the bottom of the page.  
4. With a handful of rows: no need to scroll the tiny strip; empty void below is gone.  
5. No useful reason to scroll sideways; Download / Open source stay in the Detail column.

## Out of scope (unchanged)

- Search / status / Download API  
- Face blur quality  
- Prior exports on detail
