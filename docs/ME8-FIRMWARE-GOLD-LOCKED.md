# ME8 Firmware Gold — agent lock rules

**Primary lock:** `me8-firmware-gold-20260706`  
**Doc:** `BASELINE-ME8-FIRMWARE-GOLD.md`  
**Restore phrase (user only):** `RUN RESTORE-ME8-FIRMWARE-GOLD`  
**Cursor rule:** `.cursor/rules/me8-firmware-gold-locked.mdc`

## Checkpoint PASS 2026-07-06

- Pin video = canvas mirror from wall (`startMapMirrorFromWall`)
- No second pin JSMpeg when wall is live
- Open All Chin + kk colocated pins work
- Cache: `?v=20260705-pin-mirror-complete`

## DO NOT TOUCH without MOB-APPLY + user naming the file

- `public/js/video-wall.js` — `attachMapPopupPlayer`, `startMapMirrorFromWall`, `syncMapPopupPlayer`
- `public/index.html` — `preparePinVideoWallResync`, `syncPinVideoFromWall`, `pinPopupHasVisibleVideo`
- `public/js/fleet-ui.js`, `public/js/ptt-rx.js`
- `lib/pttServer.js`, `lib/sipServer.js`, `lib/psG711Audio.js`
- `public/vendor/jsmpeg.min.js`
- `baseline/2026-07-06-me8-firmware-gold/**` snapshot files

## FORBIDDEN without explicit user MOB

- Re-enable dual pin JSMpeg when wall is live
- Single-connect blind guards on `mapPlayers.has`
- Destroy/reattach pin player storms
- `preparePinVideoWallResync` stripping `map-pin-mirror-canvas`
- Default restore to me8-v1 or Trial Gold for pin issues

## Operator is not tech

Agent owns git, verify, logs, encoding, cache bust. Operator: restart, refresh once, pass/fail from what they see.

## MOB DISC (agent mistakes + recovery)

**Read before touching pin video or baseline scripts:** `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md`
