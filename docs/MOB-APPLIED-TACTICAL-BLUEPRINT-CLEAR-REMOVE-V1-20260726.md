# MOB-APPLIED — TACTICAL-BLUEPRINT-CLEAR-REMOVE-V1

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY TACTICAL-BLUEPRINT-CLEAR-REMOVE-V1`  
**Disc:** temporary Tactical — clear / remove floor plan (chat)

## What you get

| Button | Effect |
|--------|--------|
| **Clear from map** | Takes plan off the glass now. Saved plan + placement stay. |
| **Remove plan** | Confirm → deletes from site (DB + image file). Gone from Saved plans. |

## Files

- `server.js` — `DELETE /api/tactical/blueprints/:id` (+ safe file unlink)
- `lib/siteDb.js` — `deleteTacticalBlueprint`
- `public/js/tactical-blueprint-ui.js` — clear / remove handlers
- `public/index.html` — buttons + cache `20260726-tactical-blueprint-clear-remove-v1`
- `public/locales/en.json` — `tactical.bpClear*` / `bpRemove*`
- `scripts/verify-tactical-blueprint-clear-remove-v1.js`

## Verify

```text
npm run verify:tactical-blueprint-clear-remove
```

## Operator smoke

1. Restart / Ctrl+F5.  
2. Show a plan → **Clear from map** → plan gone; still in Saved plans.  
3. Show again → **Remove plan** → confirm → gone from list.  
4. Reply **PASS** / **FAIL**.
