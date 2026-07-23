# MOB APPLIED — MAP-TOOLBAR-ARROW-ENCODING-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY MAP-TOOLBAR-ARROW-ENCODING-V1`

## What changed

`public/index.html` map toolbar:

- Wall Map button: broken `â†—` → HTML entity `&#8599;` (↗)
- Between select and actions: broken `â†’` → HTML entity `&#8594;` (→)

Entities avoid UTF-8 / Windows mojibake on save.

## Out of scope (this MOB)

Other `â†’` / `â†—` mojibake elsewhere in `index.html` (Settings comments, Help, popout icons on other views). Separate MOB if you want a full sweep.

## Operator verify

1. Hard refresh (Ctrl+F5).
2. Map toolbar: arrow between BWC dropdown and Snapshot should show a clean **→**, not `â†’`.
3. Wall Map button: clean **↗** (or similar), not `â†—`.

**PASS** = arrows look normal. **FAIL** = still garbage.
