# MOB-APPLIED — Target A UI theme fallback

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY Target A UI theme fallback`  
**Also:** `SETTINGS-UI-THEME-FALLBACK-PRE-SAAS-CSS-V1`  
**Safety net:** `me8-pre-settings-ui-fallback-20260726` (`RUN RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK` if needed)

## Scope (UI / theme only)

Restored Settings **visual shell** to **2026-07-23 unified** look (Theme Unify + Grid V4).

| Change | Detail |
|--------|--------|
| `public/css/settings-theme-unify.css` | Exact blob from git `ec0296d` (2026-07-23 21:59) — 656 lines |
| `public/index.html` Server Config CSS | Shell restored: workspace / `#server-setup-panel` / `.ss-panel-scroll` / `.ss-config-body` / nav / content / Save actions |
| Cache | `settings-theme-unify.css?v=20260726-target-a-ui-theme-fallback-v1` |

**Removed:** SaaS Step 2 CSS experiments (containment, surgical 1000px, ultimate `height:auto !important` bleed, master centering).

## Not changed (by design)

- `lib/deploymentMode.js`, `server.js` APIs  
- `applySaasDeploymentChrome` / `data-ss-saas-hide`  
- SSL HTML (`#ss-section-ssl` / cert / key) — left in place, inherits theme  
- Tactical / license / WVP / PTT cores  

## Target look (restored)

- Left rail ~212px; nav buttons fill rail  
- Right content flexes; **one** scroll on `.ss-panel-scroll`  
- East-west grids: `minmax(350px, 1fr)`; fields ~420px  
- Save / Back footer outside scroll, not floating  

## Operator check

1. Restart Fleet if needed  
2. **Ctrl+F5** → Settings → Server Config  
3. PASS if: dark unified cards, multi-column forms, left nav flush, Save under content, **no** middle fake scrollbar / dead zone from the late CSS MOBs  

FAIL → `RUN RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK` (full functional backup), **not** Firmware Gold unless you order it.
