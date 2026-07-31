# MOB DISC — ANPR-PLATE-LISTS-V1 APPLIED

**Date:** 2026-07-30  
**Status:** **APPLIED** — awaiting operator PASS  
**APPLY:** `MOB-APPLY ANPR-PLATE-LISTS-V1`  
**Design lock:** `MOB-DISC-ANPR-PLATE-LISTS-V1-FR-PARITY-DESIGN-20260730.md`

---

## What shipped

| Piece | Detail |
|-------|--------|
| Storage | `lib/anprPlateList.js` → `storage/anpr-plate-lists/index.json` |
| API | `GET/POST/PATCH/DELETE /api/analytics/anpr/lists` (mutate = super admin, like FR enroll) |
| Read hook | Successful snapshot read returns `listMatch` (exact compact plate) |
| UI | ANPR sub-tabs **Snapshot** \| **Plate lists** — enroll form + table (Watchlist chrome) |
| Grades | Suspicious / Wanted / Blacklist |
| Industry | Milestone-style match lists (plate numbers), not face embeddings |

**Not in this MOB:** live ANPR, offline video, hit toast/Ops jump, CSV import.

## Operator verify

1. Restart / hard refresh → Analytics → **ANPR**.
2. **Plate lists** → add a plate as Blacklist/Wanted → appears in table.
3. **Snapshot** → crop/read that plate → result shows **List hit: …**
4. Unknown plate → **No list match**.
5. Face Watchlist unchanged.

## Files

- `lib/anprPlateList.js`
- `server.js` (init, routes, read `listMatch`)
- `public/index.html`, `public/js/analytics-hub.js`, `public/locales/en.json`
- Design + this APPLIED disc

## Lock

Plate lists under ANPR, FR-parity form/table, exact match on read. No freestyle second UI.
