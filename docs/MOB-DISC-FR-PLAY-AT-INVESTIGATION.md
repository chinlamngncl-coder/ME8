# MOB DISC — Play video from a face crop (hit **or** investigation)

**Status:** DISC · **`mob-fr-offline-crop-play-at` APPLIED 2026-07-13**  
**Date:** 2026-07-13  
**Trigger:** Play-at should work for investigation, not only watchlist hits.  
**Related:** crop delay / pic-video search DISCs  

---

## Product rule

**Hit** = alarm. **Play from here** = investigation (any face crop with a source video + timecode).

---

## APPLIED — `mob-fr-offline-crop-play-at`

| Piece | Behavior |
|-------|----------|
| Offline tick | `tSec`, `playUrl`, `jobId` on **every** face crop |
| Rail | Blue **Play** chip |
| Snap card | **Play from here** (hidden for live-only crops) |
| Media | Source kept ~30 min / until next Load video |
| API | `GET /api/analytics/fr/offline-video/:jobId/media` |

**Files:** `lib/frOfflineVideo.js`, `server.js`, `public/js/fr-alarm.js`, `index.html`, `en.json`

**Later:** `mob-fr-hold-play-at` — Keep stores video link for Investigation holds.

---

## Verify

1. Restart Fleet → hard refresh  
2. Load offline video → crops appear  
3. Open non-match crop → **Play from here** seeks near that face  
