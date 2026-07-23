# MOB-APPLIED — ESTABLISH-GLOBAL-ENTERPRISE-DESIGN-SYSTEM-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-ESTABLISH-GLOBAL-ENTERPRISE-DESIGN-SYSTEM-V1`  
**Scope:** Central design tokens + layout/form/button classes; retrofit Settings, Video Conference lobby, Evidence Storage.  
**Out of scope:** Map / Video Wall (`video-wall.js`), backend routing/logic.

## What landed

1. **`public/css/global.css`** — `:root` tokens (`--bg-base`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--border-color`, `--accent-blue`, `--status-green`, spacing `--space-sm`…`--space-xl`), plus:
   - `.enterprise-page-layout` (300px + 1fr) and `--split` (2fr + 1fr for VC lobby)
   - `.enterprise-card` (surface, padding, subtle border, no heavy outline)
   - `.enterprise-form-grid` + `.form-control` (and `.enterprise-scope` input/select/textarea focus ring)
   - `.btn-primary` / `.btn-secondary` / `.btn-danger` (bridged to existing `.btn-action` / `.btn-ghost` / `.btn-danger` under `.enterprise-scope`)

2. **Linked** after the main `<style>` block:  
   `/css/global.css?v=20260723-enterprise-ds-v1`

3. **Retrofit**
   - Settings: `#app-view-server.enterprise-scope`, hub = `enterprise-page-layout`, status + lifecycle = `enterprise-card`, Sign out = `btn-danger`
   - VC Live: `#app-view-conference.enterprise-scope`, dashboard = `enterprise-page-layout--split`, room row + personnel + Host Tools = `enterprise-card`
   - Evidence Storage: `#ev-panel-settings.enterprise-scope`, cards = `enterprise-card`, FTP (+ SMTP) grids = `enterprise-form-grid`
   - Page-local card chrome stripped where global owns it (layout/behavior CSS kept)

## Files

| File | Change |
|------|--------|
| `public/css/global.css` | **New** design system |
| `public/index.html` | Link + class retrofit + thin duplicate card CSS |
| `public/js/conference-hub.js` | Host Tools panel `enterprise-card` |
| `public/js/vc-lazy.js` | Cache bump → hub `?v=20260723-enterprise-ds-v1` |

## Operator verify

1. **Ctrl+F5** (hard refresh) so `global.css` loads  
2. **Settings** — left rail + metrics/lifecycle still 2-column; cards look consistent; Sign out reads as danger  
3. **Video Conference → Live** — room cards left, Active Personnel right; Host Tools still open  
4. **Evidence → Storage** — FTP 2-col form + Save still work  
5. **Map / Open All** — unchanged (no video-wall edits)

**PASS / FAIL:** _(operator)_
