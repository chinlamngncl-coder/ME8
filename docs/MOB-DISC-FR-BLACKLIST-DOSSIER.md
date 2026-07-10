# MOB DISC — Watchlist dossier (graded monitoring)

**Status:** **Applied** `mob-fr-blacklist-dossier` 2026-07-10  
**Search:** `watchlist`, `listStatus`, `suspect`, `blacklist`, `monitoring`, `POI`, `dossier`  
**Related:** thumbs · enroll soft-quality · alarm grade/reason

---

## Decision (locked + shipped)

**Watchlist** = umbrella tab/gallery. Grades (soft → hard):

| Code | Label | Default |
|------|-------|---------|
| `poi` | Person of interest | |
| `monitoring` | On monitoring | |
| `suspect` | Suspect | **new enroll** |
| `blacklist` | Blacklist | **legacy rows** without grade |

Plus required **reason**, optional last seen / last incident / notes, face thumb, **detail drawer** (click name), alarm shows **grade + reason**.

Storage paths stay `fr-blacklist` (stable). UI says Watchlist.
