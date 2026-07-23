# MOB-APPLIED — DESTROY-SCROLL-LOCK-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-DESTROY-SCROLL-LOCK-V1`  
**Scope:** Storage Settings scroll unlock. Keeps `1fr + 350px` grid and input max-widths. Ops/map body shell unchanged when Storage is closed.

## Cause

App shell uses `body { height: 100vh; overflow: hidden }` plus `#app-view-evidence { overflow: hidden }`. After the compact storage grid grew taller than the viewport, bottom sections (BWC / FR / Evidence Index / action bar) were clipped with no usable scroll.

## Fix

1. When Evidence → **Storage** is open (`html.ev-storage-scroll-unlock` + `:has(#ev-panel-settings)` fallback):
   - `body` → `min-height: 100vh`, `height: auto`, `overflow-y: auto`
   - `#app-view-evidence` / `#evidence-panel` / `#ev-panel-settings` → `overflow: visible`, height auto
2. Hub grid keeps `align-items: start`; storage layout `overflow: visible`
3. Leaving Storage (or Evidence tab) removes the unlock class so Operations map keeps its locked shell

## Files

| File | Change |
|------|--------|
| `public/index.html` | Scroll-unlock CSS |
| `public/css/global.css` | Same unlock + `.enterprise-page-layout` height auto |
| `public/js/evidence-hub.js` | Toggle `ev-storage-scroll-unlock` on Storage panel |
| `public/js/evidence-manager.js` | Clear unlock when leaving Evidence |
| cache | `global.css` / hub / manager `?v=20260723-destroy-scroll-lock-v1` |

## Operator verify

1. **Ctrl+F5** → Evidence → **Storage**  
2. Scroll wheel / scrollbar reaches Evidence catalog + action bar + foot note  
3. Leave Storage / open Operations — map layout still fills the screen (no broken ops scroll)

**PASS / FAIL:** _(operator)_
