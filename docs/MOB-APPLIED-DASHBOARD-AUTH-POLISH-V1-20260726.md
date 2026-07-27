# MOB-APPLIED DASHBOARD-AUTH-POLISH-V1 (2026-07-26)

## Goal

Tidy Dashboard Auth workflow: create account on its own sub-view, then Users & authority; theme permission ticks so checked state is readable; kill full-bleed Save bar; rename add title; fix Clear map pins label.

## Changes

- `public/index.html` — subtabs Add / Users & authority / My account; add section first; Save wrapped; cache bust
- `public/js/server-setup.js` — default `add`; after create → `users` + highlight; grant opens users
- `public/css/settings-theme-unify.css` — themed checkboxes (blue fill + light tick) + content-sized Save
- `public/locales/en.json` — `colClearMapPins`, add/users subtab strings

## Operator check

1. Hard refresh once (`?v=20260726-dashboard-auth-polish-v1`)
2. Settings → Dashboard Auth
3. PASS if:
   - First subtab is **Add New Admin / Operator** (form only)
   - After Save account → switches to **Users & authority** and highlights the new user
   - Permission ticks are dark when off, blue with bright tick when on (not white native boxes)
   - Kill switch has the same spacing/theme as other ticks
   - Save account is a compact button (not a full-width blue bar)
   - Clear map pins label reads correctly (not “Col Clear Map Pins”)

## Verify

```bash
node scripts/verify-dashboard-auth-polish-v1.js
```
