# MOB-APPLIED — FLV single attach dedupe V1

**APPLY:** `MOB-APPLY-FLV-SINGLE-ATTACH-DEDUPE-V1`  
**Date:** 2026-07-20  
**Scope:** Frontend attach storm fix only

---

## Changes

| File | Fix |
|------|-----|
| `public/js/video-wall.js` | Removed +450ms / +1100ms `video-stream-ready` retries |
| | Per-slot `wvpHandoffSlotInflight` lock — silent drop duplicate attach for same cam+URL |
| | `destroyPlayer` skips in-flight handoff mpegts unless `forceHandoffDestroy` |
| | Console: `[me8-flv] wall attach once` per slot |
| `public/js/live-player-factory.js` | `isHandoffAttaching()` / `wvpHandoffAttaching` on handle until prove/fail |
| `public/index.html` | Cache bust `?v=20260720-flv-single-attach-v1` |

Backend / token proxy **unchanged**.

---

## Operator smoke

1. **Hard refresh** (`Ctrl+F5`).
2. Open **one** live tile first.
3. Console: **one** `[me8-flv] wall attach once` per slot (not a burst).
4. Then `[me8-flv] attach start` → `[me8-flv] attach ok`.
5. Picture on wall.
6. Fleet log: far fewer `flv-stream proxy open` per open (not 50+).

PTT parked.
