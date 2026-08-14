# MOB DISC — USERS-AUTHORITY-FILTER-V1 APPLY (2026-08-10)

**APPLY:** `MOB-APPLY USERS-AUTHORITY-FILTER-V1`  
**Status:** APPLIED. Filter bar only — user cards unchanged.

## What changed

| File | Change |
|------|--------|
| `public/index.html` | Filter row above `#ss-users-body` (search + role + stations). Compact CSS. Cache bust `server-setup.js`. |
| `public/js/server-setup.js` | `data-role` / `data-scope` / `data-search` on cards; show/hide filter (does **not** rebuild cards → dirty edits safe). |
| `public/locales/en.json` | Filter labels |

## UX rules kept

- Existing user cards, fields, Save / Set password / Remove untouched.  
- No new sidebar tab. Filter sits under the existing hierarchy hint.  
- East-west grid on the filter row; inputs capped `max-width: 420px`.  
- Ids on list section / body preserved.

## Operator check

1. Hard refresh → Settings → Dashboard Authentication → **Users & authority**.  
2. See Search / Role / Stations above the user cards.  
3. Search `ncl` → only that card; Role = Operator → hide Super admin; clear filters → all back.  
4. Edit a visible user while filtered → Save still works.
