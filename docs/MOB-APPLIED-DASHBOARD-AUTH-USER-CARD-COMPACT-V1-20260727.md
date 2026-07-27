# MOB-APPLIED DASHBOARD-AUTH-USER-CARD-COMPACT-V1 (2026-07-27)

## Goal

Flatten Users & authority cards: identity fields east-west (not a tall User stack), ops row with Actions beside role/dates, denser Target A layout.

## Changes

- `public/js/server-setup.js` — `ss-user-tier-id` + `ss-user-tier-ops` + permissions; edit class names unchanged
- `public/index.html` / `public/css/settings-theme-unify.css` — compact tier CSS; cache bust

## Operator check

1. Hard refresh once (`?v=20260727-dashboard-auth-user-card-compact-v1`)
2. Dashboard Authentication → Users & authority
3. PASS if: login / display / contact sit side-by-side; Actions sit with role/dates; card height looks like other Settings sections (not a tall grey stack); Save still works

## Verify

```bash
node scripts/verify-dashboard-auth-user-card-compact-v1.js
```
