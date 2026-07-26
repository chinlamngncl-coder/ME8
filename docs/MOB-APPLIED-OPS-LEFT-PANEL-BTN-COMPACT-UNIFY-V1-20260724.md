# MOB-APPLIED — OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1`  
**Disc:** `MOB-DISC-OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-20260724.md`

## Change

Ops left `#sidebar` only: all `.btn-action` / `.btn-ghost` use the same compact metrics as **Open All** / **Clear map pins** (`padding: 4px 8px`, `font-size: 10px`, `min-height: 0`). No behavior changes.

## Files

- `public/css/global.css` — `#sidebar .btn…` compact rules  
- `public/index.html` — cache `global.css?v=20260724-ops-left-panel-btn-compact-unify-v1` + local echo for circle/SOS  
- `scripts/verify-ops-left-panel-btn-compact-unify-v1.js`

## Operator check

1. Ops → **Ctrl+F5**.  
2. Open All / Clear map pins height unchanged.  
3. User Circle + SOS log buttons match that height (no fat 32px blocks).  
4. Clicks still work as before.

## Verify

```text
node scripts/verify-ops-left-panel-btn-compact-unify-v1.js
```
