# MOB-APPLIED ANPR-STOP-MUST-KILL-NATIVE-WATCH-V1 (2026-08-13)

## Changes
1. `lib/anprLivePoller.js` — empty watch slots → `POST /watch/stop` for every active native cam (no early return that left OCR alive).
2. `anpr-live-watch.js` — tile Stop Stream: **no** `fillEmptySlots` re-arm; last cam → `stopWatch()`.
3. Cache bust `?v=20260813-anpr-stop-kill-native-v1`.

## Operator
Restart **UbitronC2** + hard refresh. Start watch → Stop all (or tile Stop).  
ANPR bat must show `watch stopped` and **no** new YOLO/OCR. Fleet: `POST /watch/stop (no slots)`.
