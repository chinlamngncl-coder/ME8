# MOB-APPLIED — CSS-FULL-RESET-AND-SAFE-WRAP

**Date:** 2026-07-26  
**APPLY:** `CSS-FULL-RESET-AND-SAFE-WRAP`  
**Disc:** `docs/MOB-DISC-SETTINGS-UNIFIED-DESIGN-VS-SAAS-MESS-20260726.md`

## What was restored (pristine shell)

| File | Action |
|------|--------|
| `public/css/settings-theme-unify.css` | Hard restore from git `ec0296d` (UTF-16 corruption cleared), then **only** safe wrap on `#server-setup-panel` |
| `public/index.html` | Removed workspace-level `max-width` / `margin: 0 auto`; restored `#server-config-workspace` overflow/flex shell; restored `.ss-panel-scroll` + `.server-setup-actions` to pre-mess forms; kept height/`overflow: hidden` on panel |

**Not touched:** `.ss-east-west-grid` rules, field `max-width: 420px`, SaaS JS / `data-ss-saas-hide`, license/tactical work.

## Safe wrap (only outer)

**Master wrapper:** `#server-setup-panel`

This node holds:

- `.ss-setup-head`
- `.ss-config-body` → left `.ss-config-nav` + right `.ss-config-content` / `#ss-panel-scroll`
- `.server-setup-actions` (Save / Back)

Applied:

```css
#server-setup-panel {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  /* height / overflow / flex children unchanged */
}
```

`#server-config-workspace` stays full-bleed flex shell (no width clamp).

## SSL HTML

Re-confirmed under Server tab: `#ss-section-ssl` with `#ss-ssl-cert` / `#ss-ssl-key`. **No SSL layout CSS** — inherits `.ss-config-section` / label styles.

## Cache

`settings-theme-unify.css?v=20260726-css-full-reset-safe-wrap-v1`

## Operator check

1. Restart Fleet if needed  
2. **Ctrl+F5** Settings → Server Config  
3. PASS if: east-west multi-column forms, Save bar under content (not floating), one natural scroll in content, whole config chrome centered on ultrawide  
