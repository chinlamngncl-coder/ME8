# MOB-DISC — ANPR Live tab: stream recover, health poll, watchlist collapse (2026-08-02)

## Mandate

CRITICAL FRONTEND: Live tab UI, stream auto-recovery & dynamic health.  
Named files in request: `live.html` / `live.js` — those are the **BWC popout**, not ANPR Live.  
Applied to real Live tab surface: `public/js/anpr-live-watch.js` + `lib/anprLivePoller.js`.  
Offline Match files not modified for behavior (shared helpers only where Live paint already shared).

## Applied

### [1] Stream auto-recovery + dynamic health

- FLV `onFail` / attach null / JSMpeg exception / `video-stream-error` → show Player unavailable / stream error, then **`schedulePlayerRecover` after 3s** (force re-attach).
- While Live sub-tab `onShow`: **5s** `setInterval` → `GET /api/analytics/anpr/health` → badge **ANPR Engine — OK** (green) / **Not available** (red).
- `onHide` clears the health timer.

### [2] Auto-collapsing watchlist banner (Live)

- `#critical-alerts-container`: when hits === 0 → `display: none` + `hidden` + `is-collapsed`.
- Watchlist hit (`isWatchlistHit` / list status) → expand banner above RECENT PLATES.
- Poller sets `isWatchlistHit: true` on list-match ticks and list-hit events.

### [3] Recent Plates + magnifier

- Cap **50** (`unshift` / `pop`) — already locked; Clear UI empties `liveRail` → 4 **Awaiting Capture** skeletons.
- Magnifier `data-anpr-open` → `openAnprModal(id)` → macro/micro lightbox.

## Operator

1. Restart ME8 Node (poller `isWatchlistHit`).
2. Hard refresh dashboard (`?v=20260802-live-recover-health-v1`).
3. Open Analytics → ANPR → **Live** — health should flip without refresh; kill FLV briefly — tile should reconnect ~3s.
