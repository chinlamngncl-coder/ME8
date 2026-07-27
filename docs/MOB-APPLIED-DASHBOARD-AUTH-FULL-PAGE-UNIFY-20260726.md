# MOB-APPLIED DASHBOARD-AUTH-FULL-PAGE-UNIFY (2026-07-26)

## Goal

Unify Dashboard Auth into Target A cohesive blocks: kill the horizontal-scrolling users table, wrap list / add-operator / IT PIN as `.ss-config-section`, and apply `.ss-east-west-grid` to add-user fields — without renaming input IDs or permission checkbox classes.

## Changes

- `public/index.html` — three blocks under `#ss-users-section` + IT PIN already sectioned; remove `ss-users-table`; cache bust
- `public/js/server-setup.js` — two-tier card render into `#ss-users-body`; `closestUserRow` for save/dirty/read
- `public/css/settings-theme-unify.css` — list inherits elevated section tokens

## Operator check

1. Restart (or hard refresh once): `?v=20260726-dashboard-auth-full-page-unify-v1`
2. Settings → Dashboard Auth → Operators
3. PASS if: no horizontal scrollbar on user list; each user is a card with core info then grouped checkboxes; Add New Operator fields sit in east-west grids; IT PIN matches the same card style; Save still updates permissions

## Verify

```bash
node scripts/verify-dashboard-auth-full-page-unify-v1.js
```
