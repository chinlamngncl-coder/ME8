# MOB-APPLIED ANPR-NATIVE-START-PASS-CAM-FLV-MAP-V1 (2026-08-13)

## APPLY
`MOB-APPLY ANPR-NATIVE-START-PASS-CAM-FLV-MAP-V1`  
(FORCE-SLOT name rejected — this is the multi-BWC-safe path.)

## Changes
1. `anpr-live-watch.js` — `emitWatchSlots` sends `flvByCam[camId]` from tile handoff cache only.
2. `server.js` — forwards `flvByCam` on `anpr-watch-slots`.
3. `anprLivePoller.js` — prefer UI map per camId, else read-only WVP `resolveFlv`; **no ensurePlay**.
4. Cache bust `?v=20260813-anpr-pass-cam-flv-map-v1`.

## Operator
1. Restart **Fleet / UbitronC2** (Node change).
2. Hard refresh dashboard.
3. Start watch — ANPR bat should show `POST /watch/start` / `start_watch`.
4. Second BWC in set → its own URL under its camId (not A’s).
