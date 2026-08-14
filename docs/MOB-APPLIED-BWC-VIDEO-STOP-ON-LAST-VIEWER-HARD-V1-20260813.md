# MOB-APPLIED BWC-VIDEO-STOP-ON-LAST-VIEWER-HARD-V1 (2026-08-13)

## Severity
Ship-block: no BWC video without operator Live intent.

## Changes
1. `anpr-live-watch.js` **`onHide`** → `stopWatch()` (leaving ANPR tab no longer leaves stream up).
2. `pagehide` + `beforeunload` → stopWatch.
3. Empty slots always `stopSlot(..., true)` (emit `stop-video`).
4. `server.js` `releaseCamStreamWhenUnwatched` → **immediate** WVP hard-stop; log `last-viewer hard-stop`.
5. Cache bust `?v=20260813-bwc-last-viewer-hard-v1`.

## Operator
1. Restart **UbitronC2** (Fleet).
2. Hard refresh dashboard.
3. Start watch → Stop all / leave ANPR tab / refresh → BWC must leave video **immediately** (log: `last-viewer hard-stop`, then `hard-stop`).
4. Idle 5 min with no Live → **zero** new `wvp video handoff start`.
