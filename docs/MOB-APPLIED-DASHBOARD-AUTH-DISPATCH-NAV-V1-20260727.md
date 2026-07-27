# MOB-APPLIED DASHBOARD-AUTH-DISPATCH-ROW-DENSE-V1 + NETWORK-SECTION-NAV-INACTIVE-WHITE-V1 (2026-07-27)

## Goal

1. **Operators** — Station groups on one dense row: live **pin colour + group name** (from Map groups API, no hardcoded chips) + **Map groups** jump.
2. **Super admin** — stays **All** badge only (different placement; no checklist).
3. **Network** section nav — inactive (and active/hover) pill text **white**.

## Changes

- `public/js/server-setup.js` — `dispatchGroupPinColor`, operator chips + jump; super `--super` cell
- `public/index.html` — dispatch head/chips CSS; network nav `#ffffff`; cache bust
- `public/css/settings-theme-unify.css` — network nav white text
- `public/locales/en.json` — `server.users.jumpToMapGroups`

## Operator check

1. Hard refresh once (`?v=20260727-dashboard-auth-dispatch-nav-v1`)
2. Settings → Dashboard Authentication → Users & authority
3. **Super admin** card: Station groups shows **All** only (no colour chips)
4. **Operator** card: See-all checkbox; under it **Station groups** + **Map groups** on one line; chips show **colour dot + real name**; click Map groups → Map groups tab
5. Settings → Network: section pills that are not selected are **white** text (readable)

## Verify

```bash
node scripts/verify-dashboard-auth-dispatch-nav-v1.js
```
