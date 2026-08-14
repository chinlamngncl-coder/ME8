# MOB-APPLIED ANPR-STATIC-2COL-DASHBOARD-V1 — 2026-08-14

**APPLY:** `ANPR-STATIC-2COL-DASHBOARD-V1`

## Shipped

- Snapshot panel → **2-column** static dashboard (inputs left / results right).
- Left: **Single Image Investigation** + **Bulk Image Scanner** (styled dropzones + Browse Files; native file inputs visually hidden).
- Right: **Active Detection** + **Scan Queue & History** (`max-height: calc(100vh - 350px); overflow-y: auto`).
- Copy: Analyze Image / Start Batch Scan / Clear Queue / Alerts Only / `N files selected`.
- Watchlist hit: crimson card border + soft red tint + **WATCHLIST HIT** badge; queue rows crimson (no blink).
- Confidence % stays hidden (prior PASS).
- Existing `/api/analytics/anpr/read` wiring kept via same element ids.

## Operator

Hard-refresh → ANPR → Snapshot.
