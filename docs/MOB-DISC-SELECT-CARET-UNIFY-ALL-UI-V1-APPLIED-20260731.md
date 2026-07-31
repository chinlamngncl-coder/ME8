# MOB APPLIED — SELECT-CARET-UNIFY-ALL-UI-V1

**Date:** 2026-07-31  
**Status:** APPLIED — operator must verify clicks  
**Safety disc:** `MOB-DISC-SELECT-CARET-UNIFY-ALL-UI-SAFETY-20260731.md`

## What shipped

- `public/js/ax-select-wrap.js` — wraps single-choice `<select>` in `.ax-select-wrap` (same node moved; ids/listeners kept)
- MutationObserver + re-entry guard for JS-built selects
- Caret `::after`: **`pointer-events: none !important`**; select `z-index: 1`
- Wired: `index.html`, `login.html`, `setup-boot.html`
- Cache: `global.css?v=20260731-select-caret-unify-all-ui-v1`

## Explicitly did NOT

- Fake custom dropdown UI  
- Cover select with a clickable overlay  
- Change select ids / options / form behaviour  

## Operator PASS (must click)

1. Hard refresh.  
2. **Click** Ops fleet filter / PTT group — list **opens**.  
3. **Click** Settings any select — list **opens**.  
4. **Click** Plate lists List grade — ▼ visible + list **opens**.  
5. If any select does not open → FAIL → say so; we revert.
