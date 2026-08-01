# MOB-DISC — Analytics capture buffer, storage hierarchy, PP-OCRv4 crop champion

**Date:** 2026-08-02  
**APPLY:** CAP-BUFFER-STORAGE-HIERARCHY-PPOCRV4-V1

## Frontend volatile buffer

- Recent Plates (Live + Offline): `unshift` + hard cap **50** (`pop` overflow).
- **Clear UI** empties the tab buffer and restores dashed **Awaiting Capture** skeletons.
- UI is not the audit database.

## Enterprise storage hierarchy

```
{BASE}/storage/{module}/{YYYY-MM-DD}/{username}/{bwc_name}/macro_*.jpg
{BASE}/storage/{module}/{YYYY-MM-DD}/{username}/{bwc_name}/micro_*.jpg
```

- `{module}` = `anpr` | `fr`
- Helper: `lib/analyticsCaptureStore.js`
- Serve: `GET /api/analytics/{anpr|fr}/evidence?rel=…`

## Database audit

- Migration `009_analytics_capture_audit.sql`
- `anpr_capture_history`: `user_id`, `bwc_id`, `macro_path`, `micro_path`
- `fr_capture_history`: new table for FR snaps (paths + user/BWC searchable)

## Crop champion + PP-OCRv4

- Sidecar already: bbox → tight micro-crop → **PP-OCRv4-SVTR** (`anpr-sidecar/pipeline.py` `read_with_ppocrv4`).
- Node saves **macro** (vehicle/context) + **micro** (plate/face) into the hierarchy on each finalized emit.
- Legacy flat `anpr-live-crops` / `fr-snap-ledger/crops` copies retained for compatibility.

## Operator

Restart server once so migration 9 applies and evidence routes load. Hard-refresh UI for Clear UI + 50-cap.
