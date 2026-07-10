# MOB DISC — Half-face snaps · keep all snapshots · map + BWC trace

**Status:** Ledger **APPLIED** `mob-fr-snap-ledger` 2026-07-10 · Clipped-face **APPLIED** `mob-fr-reject-clipped-face` · Retention/FTP/zones → `MOB-DISC-FR-SNAP-LEDGER-RETENTION-FTP-ZONES.md`  
**Search:** half face, partial face, snapshot ledger, person track, GPS, camId, `fr-snap-ledger`  
**Related:** `MOB-DISC-FR-LIVE-POLL.md`, `MOB-DISC-FR-HALF-FACE-RAIL-FIX.md`, `MOB-DISC-FR-SNAP-LEDGER-RETENTION-FTP-ZONES.md`

---

## Did we get the logic? **Yes.**

```
BWC sees a face
  → Snapshot (crop) + which BWC + time + GPS (if any)
  → Keep it (not only the 8 on the rail)
  → Match? → alarm / field alert
  → Later: open map / timeline — “this face was here, on Chin, at 21:40”
```

Rail = **live strip**. Ledger = **forensic memory**. Map = **where + which unit** (UI still pending).

---

## 1) Half face — is that a reason?

**Yes.** See **`MOB-DISC-FR-HALF-FACE-RAIL-FIX.md`** for the solve plan (`mob-fr-reject-clipped-face`).

---

## 2) Keep all snapshots — **APPLIED** `mob-fr-snap-ledger`

### What shipped

| Piece | Behavior |
|-------|----------|
| Module | `lib/frSnapLedger.js` |
| Disk | `storage/fr-snap-ledger/crops/*.jpg` + `index.jsonl` |
| Fields | `id, camId, deviceLabel, at, cropUrl, scorePct, match, lat/lon, sharpness, source, rolling, bestFrame…` |
| GPS | From `lastGpsByCam` at capture time (null if none) |
| Cap | Default **5000** entries / **14 days** (`FM_FR_SNAP_LEDGER_MAX`, `FM_FR_SNAP_LEDGER_DAYS`) |
| API | `GET /api/analytics/fr/snaps?camId=&limit=&before=&matchOnly=` |
| Crop | `GET /api/analytics/fr/snap/:file` |
| Poller | Live grabs write ledger (no more silent **80-file wipe** for new snaps) |

### Still pending (not this MOB)

| MOB | Intent |
|-----|--------|
| `mob-fr-snap-ledger-ui` | Analytics list + filter + open crop + Show on map |
| `mob-fr-person-track-map` | Multi-hit path on map |
| `mob-fr-reject-clipped-face` | Stop half-face on the 8-rail |

---

## Bottom line

| Question | Answer |
|----------|--------|
| Half face a reason? | **Yes** — fix disc: `MOB-DISC-FR-HALF-FACE-RAIL-FIX.md` |
| Keep snaps + BWC + GPS? | **Yes — ledger applied**; map UI next genre |
| Next half-face | `MOB-APPLY mob-fr-reject-clipped-face` |
