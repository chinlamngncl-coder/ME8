# MOB-DISC ANPR still OCR after Stop Stream (2026-08-13)

## Operator question
Stopped streaming — why ANPR bat still crops/OCR? Need START-WVP-LAB?

## Log truth (Fleet `service-stdout.log`)

1. **Stop Stream / stop-video** → `last-viewer hard-stop` OK.  
2. **Seconds later** → `setWatchSlots [cam]` again + `wvp video handoff start` + `watchStart ok`.  
3. Python OCR continues because **native watch was started again**.

So: not a ghost OCR with no stream. **Watch was re-armed.**

## Two bugs

### A) Tile “Stop Stream” refills while Start watch still on
`stopOneSlot` → `fillEmptySlots()` → `startSlot` same selected cam → new `start-video` + slots again.  
Feels like “I stopped” but ANPR session still **watching**.

**Operator now:** use **Stop all** (not only tile ×).

### B) Empty slots do not stop Python watch (code)
`anprLivePoller.syncNativeWatches`: if `want.length === 0` it **`return`s early** and never `watchStop`s cams still in `activeNative`.  
OCR thread can keep reading old FLV until bat restart.

## WVP

- Live Soft Open / handoff needs WVP/ZLM (your log already hit `:18088` — something was serving FLV).  
- **Idle / no Start watch:** you do **not** need to start WVP to “monitor no call.”  
- **UbitronC2** alone still does DeviceStatus every ~30s (not Live video).  
- Next Live test: start WVP lab **before** Start watch if FLV fails.

## Next APPLY (recommended)

`ANPR-STOP-MUST-KILL-NATIVE-WATCH-V1`

1. `syncNativeWatches`: empty want → **watchStop all** activeNative (no early return skip).  
2. `stopOneSlot`: do **not** auto `fillEmptySlots` that re-calls the same cam without operator intent — or only fill from remaining selected **after** stop-video ack; prefer: tile stop removes cam from selected for that slot and does not restart until operator Start/select.  
   **Risk pick:** tile Stop = stop that slot + **remove from selected** + no auto-refill of same cam; empty watch set → `stopWatch()`.

## PASS

Stop Stream or Stop all → ANPR bat: **no** new S2/OCR within 5s; log `watch stopped`. No new `handoff start` without Start watch.
