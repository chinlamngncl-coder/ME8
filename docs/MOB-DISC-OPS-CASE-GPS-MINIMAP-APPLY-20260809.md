# MOB DISC — OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1 APPLY (2026-08-09)

**Status:** APPLIED.

## What

1. Open Case → if refs lack lat/lon but have `sosIncidentId` → copy GPS from SOS ledger → **persist** on case JSON.  
2. Case Location: **mini map** (OSM embed) + coords + **Open location in Maps** (same pattern as SOS Ack).  

No protocol slang on UI.

## Files

- `lib/opsCaseStore.js` — `attachGpsFromSos`  
- `server.js` — GET case hydrates GPS  
- `public/js/ops-cases-ui.js` + `index.html` + `global.css` + `en.json`  

## Check

Restart → hard refresh → Evidence → Cases → open `SO-20260809-cf396e` (or any SOS case with ledger GPS) → Location shows map + Maps link. Re-open: still has GPS (saved on case).
