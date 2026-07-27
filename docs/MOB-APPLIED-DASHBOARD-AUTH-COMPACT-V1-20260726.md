# MOB-APPLIED DASHBOARD-AUTH-COMPACT-V1 (2026-07-26)

## Goal

Compact Users & authority cards, kill nested list scrollbar, move IT PIN / SMTP / voice to a single **Site security** subtab, and make usernames obvious with a chip.

## Changes

- `public/index.html` — Site security subtab + wrapper; remove list max-height scroll; username chip CSS; cache bust
- `public/js/server-setup.js` — show PIN/SMTP/voice only on `site`; username chip in card render; denser tier grids
- `public/css/settings-theme-unify.css` — compact card + chip + no inner list scroll
- `public/locales/en.json` — `server.dashSub.siteSecurity`

## Operator check

1. Hard refresh once (`?v=20260726-dashboard-auth-compact-v1`)
2. Settings → Dashboard Auth
3. PASS if:
   - **Add** and **Users & authority** do **not** show IT PIN / SMTP under them
   - **Site security** subtab shows IT PIN + SMTP + voice once
   - Users list has **no inner scrollbar** (only the main Settings panel scroll)
   - Usernames (`global`, `ncl`, …) appear in a clear boxed chip

## Verify

```bash
node scripts/verify-dashboard-auth-compact-v1.js
```
