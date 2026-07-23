# MOB APPLIED — FR-STOP-VIDEO-SLOT-SELECT-TOAST-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-STOP-VIDEO-SLOT-SELECT-TOAST-V1`  
**Disc:** `MOB-DISC-FR-STOP-VIDEO-SLOT-SELECT-TOAST-20260723.md`

## What changed

| Piece | Change |
|-------|--------|
| `public/js/fr-live-watch.js` | Selecting a live tile → watch hint toast “Selected slot N — name. Press Stop video.” |
| `public/index.html` | Stronger cyan focus ring + “Stop target” chip; hint not amber; lift hint when FR HQ bar active |
| `public/locales/en.json` | `analytics.fr.stopVideoSlotSelected` |

**Cache:** `fr-live-watch.js?v=20260723-fr-stop-video-slot-select-toast-v1`

## Operator verify

1. Ctrl+F5 → Analytics → Face → Start watch.  
2. Click a **live** tile.  

**PASS:** cyan “Stop target” ring + bottom toast with slot + name.  
3. **Stop video** → only that tile stops.  
4. Stop video with no focus → still get “Click a live tile first…”.
