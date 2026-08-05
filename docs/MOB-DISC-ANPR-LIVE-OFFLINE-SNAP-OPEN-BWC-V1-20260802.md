# MOB-DISC — ANPR Live/Offline snap open + BWC + datetime V1

**Date:** 2026-08-02  
**APPLY:** `ANPR-LIVE-OFFLINE-SNAP-OPEN-BWC-V1`  
**Scope:** Frontend wire only. FrAlarm untouched. Python untouched.

## Locked split

| Surface | Glass → big lightbox | BWC name·camId | Date+time | Location / GPS in enlarge |
|---------|----------------------|----------------|-----------|---------------------------|
| **Live** Recent Plates | Yes | Yes | Yes | **Yes** (GPS line + Copy location when available) |
| **Offline** Recent Plates | Yes | Offline MP4 badge | Yes | **No** (Offline does not need location) |
| Search & History | Already worked | — | — | History path unchanged |

## Applied

1. `ensureUiBound` on Live **and** Offline tab enter — glass listeners no longer Live-only.  
2. Capture-phase click fallback on Live/Offline rail grids.  
3. Open by `data-anpr-capture-id` (not fragile index).  
4. Card + lightbox: full **date + time**; Live BWC badge `Name · camId`.  
5. Live enlarge: Location line + Copy location; Offline enlarge hides that block.  
6. FrAlarm Live list-hit path **not modified**.  
7. Cache: `?v=20260802-live-offline-snap-open-bwc-v1`

## Operator

1. Hard refresh.  
2. Live: click glass → big lightbox → hover zoom; see BWC + datetime + Location.  
3. Offline: click glass → big lightbox; **no** Location block.  
4. Multi-cam Live: badges must differ by cam id.
