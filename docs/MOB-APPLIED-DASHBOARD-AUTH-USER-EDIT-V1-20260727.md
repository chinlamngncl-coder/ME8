# MOB-APPLIED DASHBOARD-AUTH-USER-EDIT-V1 (2026-07-27)

## Goal

- Rename Server Config tab **Dashboard Auth** → **Dashboard Authentication**
- Let super admin edit login username, display name, and contact note on each user card and Save

## Changes

- `public/index.html` — tab label, tech-gate hint, edit-field CSS, cache bust
- `public/js/server-setup.js` — editable identity fields; Save includes profile + perms; Save on super-admin rows too
- `public/css/settings-theme-unify.css` — username field chip styling
- `public/locales/en.json` — tab rename + login username strings
- `public/js/fleet-ui.js` — permission hint wording

## Operator check

1. Hard refresh once (`?v=20260727-dashboard-auth-user-edit-v1`)
2. Settings → **Dashboard Authentication** → Users & authority
3. PASS if:
   - Tab reads **Dashboard Authentication**
   - Each user has editable Login username / Display name / Contact note
   - Change a display name → Save → reload shows the new name
   - Duplicate login username is rejected

## Verify

```bash
node scripts/verify-dashboard-auth-user-edit-v1.js
```
