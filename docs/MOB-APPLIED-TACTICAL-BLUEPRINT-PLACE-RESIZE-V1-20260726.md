# MOB-APPLIED — TACTICAL-BLUEPRINT-PLACE-RESIZE-V1

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY TACTICAL-BLUEPRINT-PLACE-RESIZE-V1`  
**Disc:** floor-plan place/move/resize (chat) + queue `MOB-DISC-TACTICAL-BASIC-COMMAND-LICENSE-LOAD-QUEUE-20260726.md`

## What you get

On **Tactical → PREPARE → Floor plan** (Super Admin):

1. **Show on map** (or upload) places the plan.  
2. **Adjust** — cyan frame + corner handles:  
   - **Drag inside the frame** = move plan  
   - **Pull corners** = resize (**aspect locked** to the image)  
   - **Opacity** slider so you can see the street under the plan  
3. **Save placement** — stores south/west/north/east in PostgreSQL for that blueprint.  
4. Next **Show on map** restores the saved place (list shows `· placed`).

Upload still auto-opens **Adjust** so first placement is obvious.

## Files

| File | Change |
|------|--------|
| `db/migrations/006_tactical_blueprint_placement.sql` | placement columns + CHECK |
| `lib/siteDb.js` | map `placement`, `updateTacticalBlueprintPlacement`, schema ≥ 6 |
| `server.js` | `PATCH /api/tactical/blueprints/:id/placement` |
| `public/js/tactical-blueprint-ui.js` | adjust / save |
| `public/index.html` | Adjust + opacity + Save placement |
| `public/css/global.css` | corner + adjust tools |
| `public/locales/en.json` | `tactical.bpAdjust*` etc. |
| `scripts/verify-tactical-blueprint-place-resize-v1.js` | verify |

**Cache:** `?v=20260726-tactical-blueprint-place-resize-v1`

## Verify

```text
npm run verify:tactical-blueprint-place-resize
npm run verify:tactical-blueprint-ui
```

## Operator smoke

1. **Restart** Fleet (migration 006).  
2. Super Admin → **Tactical** → Floor plan → Show (or Upload).  
3. Tap **Adjust** → drag plan over the building → pull a corner to size → use Opacity if needed.  
4. **Save placement** → status “Placement saved”.  
5. **Hide plan** → **Show on map** again → plan returns to the same place.  
6. Reply **PASS** or **FAIL**.

## Next after PASS

`TACTICAL-POI-DRAG-DELETE-CLARITY-V1` or `LICENSE-TACTICAL-BASIC-COMMAND-V1` (queue).
