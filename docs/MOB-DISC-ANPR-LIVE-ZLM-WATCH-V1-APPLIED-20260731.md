# MOB APPLIED — ANPR-LIVE-ZLM-WATCH-V1

**Date:** 2026-07-31  
**Status:** APPLIED — operator verify  
**Design:** `MOB-DISC-ANPR-LIVE-UI-DESIGN-FR-PARITY-20260731.md`

## What shipped

| Layer | Change |
|-------|--------|
| UI | Analytics → ANPR → **Live** sub-tab (roster, 2 tiles, last still + hit bar, detail, rail, toast) |
| Client | `public/js/anpr-live-watch.js` — `start-video` surface `analytics-anpr`, FLV via `Me8LivePlayerFactory` |
| Server | `lib/anprLivePoller.js` — FLV/pool JPEG grab → sidecar read → `listMatch` → `anpr-crop-tick` / `anpr-list-hit` |
| Viewers | `liveViewers` knows `analytics-anpr` (not collapsed to ops) |
| Crop | `GET /api/analytics/anpr/crop/:file` |

## Caps (env)

- `FM_ANPR_POLL_SEC` default **3**  
- `FM_ANPR_LIVE_MAX_CAMS` default **2**  
- Hit dedupe ~45s  

## Out of V1

- Embedded map widget · make/model MMR · 6-tile FR parity · offline video  

## Operator PASS

1. Restart server (new poller). Hard refresh.  
2. Enroll a known plate on Plate lists.  
3. Analytics → ANPR → **Live** → select online BWC → **Start watch** → video Live.  
4. Point camera at that plate → still/rail update; list hit → **red/grade bar + toast**.  
5. Snapshot + Plate lists still work.  
6. Stop watch ends poller slots for that socket.
