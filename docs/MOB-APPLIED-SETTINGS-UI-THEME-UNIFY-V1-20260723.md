# MOB-APPLIED — SETTINGS-UI-THEME-UNIFY-V1

**Date:** 2026-07-23  
**Status:** APPLIED — operator visual PASS pending  
**Apply:** `MOB-APPLY SETTINGS-UI-THEME-UNIFY-V1`

## What changed (visual only)

- Added `public/css/settings-theme-unify.css` (linked after `global.css`) so Settings uses enterprise tokens: `--bg-*`, `--accent-blue`, `--radius-*`.
- Restored / preserved Save & Cancel wiring IDs: `#server-setup-save`, `#server-setup-cancel`, `#server-setup-back`, `#cd-save`, `#lab-save`, `#ss-save-bwc-list`.
- Gave those buttons `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-ghost` classes **without** renaming IDs.
- Removed full-bleed inline `width:100%` on Lab/Cloud save buttons.
- Protocol SIP/ONVIF tabs: no longer `flex:1` stretch; content-sized pills.
- Network section sticky nav: content-sized pills via tokens.
- Protocol fields: `.enterprise-form-grid` + `.enterprise-form-control`; Type-on-BWC `<dl id="server-setup-bwc">` wrapped as `.enterprise-card`.
- Scroll: still only `.ss-panel-scroll` scrolls; no forced empty `100vh` on Settings wrappers.
- Reverse-proxy polish copy (`#ss-trust-proxy`, `#ss-trust-proxy-help`, `#ss-proxy-readiness`) unchanged.

## Not changed

- No API routes, field IDs, tab names, or Save handlers.
- No `server-setup.js` logic edits.

## Verify

```bash
npm run verify:settings-theme
```

## Operator check

1. Hard refresh (Ctrl+F5) → Settings → Server Config.
2. Confirm nav pills / SIP·ONVIF tabs are **not** full-width bars.
3. Reverse proxy section still shows plain-English help + PASS/CHECK.
4. Click **Save server settings** and **Back to Settings** — both must work.
5. Lab + Cloud Save buttons look like primary buttons (not stretched page-width).
