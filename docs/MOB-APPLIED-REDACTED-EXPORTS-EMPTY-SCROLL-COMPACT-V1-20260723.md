# MOB-APPLIED — REDACTED-EXPORTS-EMPTY-SCROLL-COMPACT-V1

**Date:** 2026-07-23  
**Status:** APPLIED — operator verify  
**Disc:** `docs/MOB-DISC-REDACTED-EXPORTS-EMPTY-SCROLL-COMPACT-20260723.md`

## What changed

| Before | After |
|--------|--------|
| `few = fewRows && count > 0` | `few = count <= 12` (**includes 0**) |
| Empty path forced fill shell | Empty → `ev-rx-few-rows` |
| Outer Evidence scroll into blank | `#evidence-panel.ev-rx-few-rows { overflow: hidden }` |

Reuse existing few-rows CSS. No new layout invent.

## Files

- `public/js/evidence-hub.js`
- `public/index.html` — outer overflow + cache `?v=20260723-redacted-exports-empty-scroll-compact-v1`

## Operator check

1. Hard refresh → **Redacted exports** (0 Finalized).  
2. **No** vertical scroll into empty dark void.  
3. Later with many rows (>12 on a page): scroll **inside** the table box only.

**PASS** = empty page does not scroll into blank.
