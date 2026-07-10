# MOB DISC — Offline video → face crops (applied 2026-07-10)

**MOB:** `mob-fr-offline-video-crops` — **APPLIED**  
**Search:** `Load video`, `offline crops`, `ffmpeg sample`, `ax-fr-load-video`, `frOfflineVideo`

---

## Goal

Operator picks an **offline video** on Analytics → ffmpeg samples frames (capped) → **face crops** into crop rail / watchlist match (same Facenet sidecar).

---

## 32 BWC vs 4 tiles (product lock — not this MOB’s code)

| Layer | Behavior |
|-------|----------|
| **UI / decode** | Max **4** live tiles — saves CPU; do **not** show 32 at once |
| **Watch set** | Select up to **32** (they light up / stay selected) |
| **Face scan** | Runs on cams **currently on the 4 live tiles**; **rotate ~20s** brings the rest onto tiles so **all selected get scanned over time** |
| **Not accepted** | Permanently scanning **only the first 4 forever** while 28 never rotate in |
| **Also not this MOB** | Simultaneous probe of all 32 without a live slot (would need background grab streams — separate MOB if ever needed) |

**Offline video** is a **different path**: one uploaded file → crops. It does **not** replace live 32-watch.

---

## Shipped pieces

| Piece | Path |
|-------|------|
| Job engine | `lib/frOfflineVideo.js` |
| API | `POST/GET /api/analytics/fr/offline-video` (+ cancel) |
| UI | `public/js/fr-offline-video.js` · Load video button enabled |
| Crops | Same `fr-live-crops` + `fr-crop-tick` / hit events |

**Caps:** 200 MB · first 120 s · ~1 fps · max 60 frames · 1 job · cancel supported.

---

## Test

1. START-FR.bat + fleet up · hard refresh Analytics  
2. Load video (mp4) → progress → crops on rail · match alarm if watchlist hit  
3. Cancel mid-job once  
4. Live watch: select >4 · confirm rotate still scans beyond first 4  

Reply soak result; one fix MOB only if fail.
