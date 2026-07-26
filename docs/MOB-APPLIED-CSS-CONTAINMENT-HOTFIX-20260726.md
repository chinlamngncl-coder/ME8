# MOB-APPLIED — CSS-CONTAINMENT-HOTFIX

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY CSS-CONTAINMENT-HOTFIX`  
**Fixes:** left-pinned 1100px panel + nested middle scrollbar from `DYNAMIC-FRONTEND-UI-V1`

## Exact CSS intent

1. **Center:** `#server-setup-panel { margin: 0 auto; max-width: 1100px; }`
2. **Kill inner scroll:** panel / `.ss-panel-scroll` / `.ss-config-nav` → `overflow: visible`; no forced `height: 100%` trap
3. **Natural scroll:** `#server-config-workspace { overflow-y: auto }` scrolls the Settings dark background

## Cache

`settings-theme-unify.css?v=20260726-css-containment-hotfix-v1`

## Smoke

1. Ctrl+F5 → Server Config  
2. Panel centered (equal dead space left/right)  
3. One scrollbar on the workspace — not a scroll box in the middle of the layout  

Reply **PASS** / **FAIL**.
