# MOB APPLIED — COMMAND-WALL-ALARM-STRIP-V1

**Date:** 2026-08-23  
**Phrase:** `MOB-APPLY COMMAND-WALL-ALARM-STRIP-V1`

## Delivered

1. **Collapsible right rail** (`#cw-alarm-rail` / `#alarm-rail`) — hidden by default; opens on alarm; Close / Alarms toggle. Does not permanently shrink the grid.
2. **VMS coalesce** — `wall-alarm` from `vmsAlarmLogger` live emit; 5‑minute Active Window; `[TYPE xN]` + First—Last (duration) in site-local clock.
3. **Ended stays until ACK** — cooldown dims row (`Ended`); ACK removes.
4. **SOS exception** — `bwc_sos` never multiplies; red `[SOS]` row + cell.
5. **Cell badges** — mirror strip (`[MOTION x16] 14:02:45` or `[SOS]`).
6. **Unified ACK** — `POST /api/wall-alarms/ack` `{ source, camId, eventId }` → SOS clear path or VMS UI clear + `wall-alarm-ack`.

## Files

- `lib/vmsAlarmLogger.js` — `setLiveEmit` + emit after insert  
- `server.js` — live bridge + `/api/wall-alarms/ack`  
- `public/js/command-wall.js` — strip / coalesce / badges  
- `public/index.html`, `public/command-wall.html` — rail DOM  
- `public/css/global.css` + popout styles  
- `public/locales/en.json` — Alarms chrome  

## Operator verify

1. Restart + hard refresh Command Wall.  
2. **Alarms** toggle opens empty rail (grid unchanged when closed).  
3. Trigger ONVIF motion (events subscribed) → orange row with xN + time span; cell badge matches.  
4. Wait 5+ minutes quiet → row **Ended**, still listed → **ACK** clears.  
5. BWC SOS → red `[SOS]` (no xN) → ACK clears SOS + row.
