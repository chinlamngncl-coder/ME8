# MOB-APPLIED — TACTICAL-BLUEPRINT-UI-V1

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY TACTICAL-BLUEPRINT-UI-V1`  
**Disc:** `MOB-DISC-TACTICAL-BASIC-COMMAND-LICENSE-LOAD-QUEUE-20260726.md` (+ design unify disc in chat)

## What you get

In **Tactical → PREPARE** (not Ops), Super Admin sees a **dark** Floor plan strip (same navy family as Overwatch Heading / FOV — **no white base**):

1. Plan name  
2. Choose file (JPEG / PNG / WebP · max 25 MB)  
3. **Upload** → list refresh + auto **Show on map**  
4. **Saved plans** dropdown  
5. **Show on map** / **Hide plan**

Operators do **not** see the strip (Super Admin only). Map overlay uses Leaflet `imageOverlay` centered on the current view (~240 m wide), aspect from image size. Session remembers last shown plan.

## Files

| File | Change |
|------|--------|
| `public/index.html` | PREPARE floor-plan controls + script/css cache `20260726-tactical-blueprint-ui-v1` |
| `public/js/tactical-blueprint-ui.js` | **new** — upload / list / overlay |
| `public/js/tactical-shell.js` | `TacticalBlueprintUi.onShow()` on tab show |
| `public/css/global.css` | `.ax-tactical-bp` dark strip |
| `public/locales/en.json` (+ other locales) | `tactical.bp*` keys |
| `scripts/verify-tactical-blueprint-ui-v1.js` | static verify |
| `package.json` | `npm run verify:tactical-blueprint-ui` |

Uses existing `POST /api/tactical/blueprints/upload` + `GET /api/tactical/blueprints` (25 MB raise already applied).

## Verify (agent)

```text
npm run verify:tactical-blueprint-ui
```

## Operator smoke (plain English)

1. **Restart** Fleet (if not already after size-raise).  
2. Log in as **Super Admin**.  
3. Open **Tactical** tab.  
4. Under **PREPARE**, find dark **Floor plan** box (not a white page).  
5. Choose a JPEG/PNG/WebP (try > 5 MB if you want to prove size raise).  
6. **Upload** → plan should appear on the map.  
7. **Hide plan** / pick from **Saved plans** → **Show on map**.  
8. Reply **PASS** or **FAIL**.

## Next after PASS

`LICENSE-TACTICAL-BASIC-COMMAND-V1` (queue item 3).
