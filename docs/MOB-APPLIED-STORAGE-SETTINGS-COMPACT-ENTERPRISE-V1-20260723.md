# MOB-APPLIED — STORAGE-SETTINGS-COMPACT-ENTERPRISE-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-STORAGE-SETTINGS-COMPACT-ENTERPRISE-V1`  
**Scope:** Evidence → Storage layout/CSS/HTML only. No API / save logic changes.

## What changed

1. **Master grid** — `#ev-panel-settings .ev-hub-layout` = `1fr 350px`, gap `var(--space-xl)`. All config stays in the left column; System status rail stays right.
2. **Left stack** — `.ev-storage-layout` is a single column (removed inner 2-col grid that let BWC/FR/catalog break layout).
3. **Input caps** — text/path fields `max-width: 480px`; FTP port / PASV ports `max-width: 120px`.
4. **De-boxed lower sections** — BWC SOS, FR Storage (JS inject), Evidence catalog use `.ev-storage-section` with divider lines (no heavy card borders).
5. **Action bar** — `.action-bar` groups Test / Apply SAN / Scan / Open FTP; **Save storage** is `.btn-primary` on the far right.

## Files

| File | Change |
|------|--------|
| `public/index.html` | Storage CSS + section markup + action bar |
| `public/js/evidence-storage-ui.js` | FR block as `.ev-storage-section` |
| `public/css/global.css` | Normalized EOL + compact input / `.action-bar` bridge |
| cache | `evidence-storage-ui.js?v=20260723-storage-compact-enterprise-v1` |

## Operator verify

1. **Ctrl+F5** → Evidence → **Storage**  
2. Left column stacks all sections; System status stays right — nothing slides under the rail  
3. FTP host / paths look compact (not full-bleed)  
4. BWC / FR / Evidence catalog are divider sections, not heavy boxes  
5. Bottom bar: utility buttons left, blue **Save storage** on the right; Save / Browse still work  

**PASS / FAIL:** _(operator)_
