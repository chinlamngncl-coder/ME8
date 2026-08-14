# MOB-APPLIED ANPR-SNAPSHOT-BATCH-WANTED-V1 — 2026-08-14

**APPLY:** `ANPR-SNAPSHOT-BATCH-WANTED-V1`  
**Disc:** `docs/MOB-DISC-ANPR-SNAPSHOT-BATCH-UNDER-SINGLE-20260814.md`

## What shipped

- Snapshot tab: **Batch scan** card **below** single photo / Read plate.
- Drag-drop or multi-browse, hard cap **100** images.
- **Run batch scan** → same `POST /api/analytics/anpr/read` (concurrency 2) + plate-list match.
- Results: thumb, plate, **List hit** / **Not on plate list** / per-file error.
- **Hits only** checkbox filters rows client-side.
- No confidence %. Single Snapshot path unchanged.

## Operator

Hard-refresh → ANPR → Snapshot → scroll below single card → drop photos → Run batch scan.
