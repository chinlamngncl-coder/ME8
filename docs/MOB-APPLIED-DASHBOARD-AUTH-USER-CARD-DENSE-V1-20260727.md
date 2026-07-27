# MOB-APPLIED DASHBOARD-AUTH-USER-CARD-DENSE-V1 (2026-07-27)

## Goal

Tighten Users & authority cards: role/scope badges on one row, less vertical chrome, brighter field labels.

## Changes

- `public/index.html` — dense card CSS; `.ss-role-scope-cell` row; label contrast; cache bust
- `public/css/settings-theme-unify.css` — matching dense rules

## Operator check

1. Hard refresh once (`?v=20260727-dashboard-auth-user-card-dense-v1`)
2. Dashboard Authentication → Users & authority
3. PASS if: Super admin + All stations (or Operator + Assigned only) sit on one row; card height is shorter; labels are easier to read; Save still works

## Verify

```bash
node scripts/verify-dashboard-auth-user-card-dense-v1.js
```
