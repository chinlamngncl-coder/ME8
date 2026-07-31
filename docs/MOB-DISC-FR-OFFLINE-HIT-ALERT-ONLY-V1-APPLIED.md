# MOB DISC — FR-OFFLINE-HIT-ALERT-ONLY-V1 APPLIED

**Date:** 2026-07-30  
**Status:** **PASS** (operator confirmed 2026-07-30)  
**APPLY:** `MOB-APPLY FR-OFFLINE-HIT-ALERT-ONLY-V1`  
**Parent:** `MOB-DISC-FR-OFFLINE-HIT-NO-OPS-JUMP-20260730.md`

---

## What changed

| Behavior | Live BWC hit | Offline video hit (`source: offline-video`) |
|----------|--------------|-----------------------------------------------|
| Toast / HQ / chime / rail | Yes | **Yes** |
| Auto Ops jump + map | Tier rules | **No** |
| Auto wall/pin live (`promoteFrBlacklistLive`) | High tier | **Never** |
| FR Live Watch flash | Yes | **No** |
| Explicit **Go to map** | Ops + map; live promote if high | Ops + map if useful; **still no** live promote |

Gate lives in `goOpsOnHit` via `isOfflineVideoHit(hit)` so score-upgrade / queue paths inherit it.

## Files

- `public/js/fr-alarm.js` — `isOfflineVideoHit`, auto go-ops skip, no promote/flash for offline
- `public/index.html` — cache bust `fr-alarm.js?v=20260730-fr-offline-hit-alert-only-v1`

Server payload already sets `source: 'offline-video'` in `lib/frOfflineVideo.js` — no server change.

## Operator verify

1. Hard refresh → Analytics → Face → load offline video with a watchlist match.
2. On hit: toast / HQ / chime — **stay** on Analytics (no Ops jump).
3. Wall does **not** open a live BWC panel for that hit.
4. Optional: click **Go to map** — may switch Ops; still no forced live steal.
5. Live BWC FR hit still go-ops / promote as before.

**Operator result (2026-07-30):** **PASS** — Analytics Face offline hit = alert only.

## Related (ANPR — record only)

See `MOB-DISC-ANPR-OFFLINE-HIT-ALERT-ONLY-PARITY-20260730.md` — same product rule when ANPR gains offline/file watchlist hits; **not** applied in this MOB.
