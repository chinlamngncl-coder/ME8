# MOB APPLIED — TACTICAL-TAB-SHELL-UI-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-APPLY TACTICAL-TAB-SHELL-UI-V1`  
**Disc:** `MOB-DISC-TACTICAL-ZONE-PLAN-DRAFT-20260723.md` (TACTICAL DRAFT OK)  
**Status:** **PASS** (operator 2026-07-24 — Tactical map + rail OK; Ops still works)

---

## Scope (shell only)

| In | Out |
|----|-----|
| Nav **Tactical** after Analytics | Turf / GPS entry-exit |
| `#app-view-tactical` + left rail + map | `create-tactical-zone` socket |
| Empty Leaflet map (OSM / MobilityMapTiles if present) | Leaflet.draw |
| Draw / Save buttons **disabled** (placeholders) | Auto startPlay / PTT gtid 49 |
| CSS in `global.css` scoped `#ax-panel-tactical` | Changes to wall / PTT / Evidence / VC |

---

## Files

- `public/index.html` — nav + panel markup + view CSS hook  
- `public/css/global.css` — scoped layout  
- `public/js/tactical-shell.js` — map boot on tab show  
- `public/js/evidence-manager.js` — `showTab('tactical')`  
- `public/locales/en.json` — short labels  
- `scripts/verify-tactical-tab-shell-ui-v1.js`  

**Cache:** `global.css?v=20260723-tactical-tab-shell-ui-v1`, `tactical-shell.js?v=…`, `evidence-manager.js?v=…`

---

## Operator smoke

1. Ctrl+F5.  
2. Click **Tactical** in top nav.  
3. See left rail (Incident / Zones / Draw disabled / Idle) + map tiles.  
4. Click **Operations** — wall/PTT unchanged.  
5. Return to Tactical — map still OK.

**Operator:** **PASS** (2026-07-24).

**Next:** `TACTICAL-LEAFLET-DRAW-V1` (APPLY in progress / see APPLIED doc).
