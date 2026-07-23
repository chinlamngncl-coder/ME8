# MOB-APPLIED — CASE-FILES-FILL-LAYOUT-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-CASE-FILES-PURPOSE-SOS-ACK-EMPTY-SCROLL-20260722.md`  
**Cache:** `case-files-ui.js?v=20260722-cf-fill-layout`

## Fixed

| Issue | Fix |
|-------|-----|
| Short table + empty page below | `#ev-panel-case-files` + `#cf-table-wrap` fill viewport under chrome |
| Horizontal scroll with no rows | `overflow-x: hidden`, `table-layout: fixed`, wrap long titles |
| Manage / Open buttons force width | `cf-list-actions` flex-wrap |

## Operator verify

1. **Ctrl+F5** (CSS/JS only — no server restart).  
2. Evidence → **Case files**.  
3. Empty list: no sideways scroll into blank; table box fills down.  
4. After **New case file** or **Create from SOS**, row fits without scroll-right.

## Out of scope

- Purpose hint (SOS Ack ≠ auto-create) → `CASE-FILES-PURPOSE-HINT-V1`  
- Redact / Prior exports
