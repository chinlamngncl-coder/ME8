# MOB DISC — FR snap ledger: capacity · FTP archive · backup · per-BWC zones

**Status:** Retention raise **APPLIED** `mob-fr-snap-retention-raise` 2026-07-10 · FTP archive / zones still DISC  
**Search:** 50000, 90 days, 5 GB, FTP archive, retention, backup, zone, per BWC, snap ledger  
**Related:** `MOB-DISC-FR-HALF-FACE-SNAP-LEDGER.md` (ledger applied), person-track / map (pending)

---

## Cap — 1 BWC or all?

**All BWCs share one fleet ledger** (`scope: fleet`).

---

## Hot defaults — **APPLIED** `mob-fr-snap-retention-raise`

| Knob | Was (lab) | Now (production hot default) | Env |
|------|-----------|------------------------------|-----|
| Max entries | 5 000 | **50 000** | `FM_FR_SNAP_LEDGER_MAX` |
| Max age | 14 days | **90 days** | `FM_FR_SNAP_LEDGER_DAYS` |
| Max disk | (none) | **5 GB** | `FM_FR_SNAP_LEDGER_GB` |
| Warn | — | **80%** | `FM_FR_SNAP_LEDGER_WARN_PCT` |
| Critical | — | **95%** | `FM_FR_SNAP_LEDGER_CRITICAL_PCT` |

`GET /api/analytics/fr/snaps` → `stats.capacity`  
`GET /api/analytics/fr/health` → `snapLedger` (includes capacity level + note)

Prune still runs when over count/age/GB (hot floor). **Archive-before-delete** = next MOB (`mob-fr-snap-archive-ftp`). Until then, raise + warn so ops see pressure early.

---

## Still pending

| MOB | Intent |
|-----|--------|
| `mob-fr-auth-permissions` | FR flags in dashboard auth (view/watch/enroll/delete/archive) — see `MOB-DISC-FR-SNAP-ARCHIVE-FTP-AUTH-DELETE.md` |
| `mob-fr-snap-delete` | Operator delete when granted (audit, no dual SOP) |
| `mob-fr-snap-archive-ftp` | Pack oldest → FTP/NAS; alert on full/fail; prune only after archive OK |
| `mob-fr-snap-archive-backup` | Second-copy / verify |
| `mob-fr-snap-zone-gate` | Per-BWC geo snap zones |

---

## Bottom line

| Question | Answer |
|----------|--------|
| 50k / 90d / 5 GB = 1 BWC? | **No — fleet-wide** |
| Warn at 80/95? | **Yes — in `stats.capacity` / FR health** |
| FTP yet? | **No** — next APPLY when ready |
