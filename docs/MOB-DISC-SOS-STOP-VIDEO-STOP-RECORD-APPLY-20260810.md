# MOB DISC — APPLY SOS-STOP-VIDEO-STOP-RECORD-V1 — 2026-08-10

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY SOS-STOP-VIDEO-STOP-RECORD-V1`  
**File:** `server.js` only.  
**Not touched:** `video-wall.js`, pin mirror, FLV attach, DeviceControl mode (stays `udp_once`).

---

## Behavior

| Event | Action |
|-------|--------|
| Path B SOS **Record** sent ok | Arm cam in `sosDeviceRecordArmedByCam` |
| Operator stop → **no** dashboard viewers → `releaseCamStreamWhenUnwatched` | **One** `StopRecord` `udp_once`, then clear arm |
| Stop while other surfaces still watching | **No** StopRecord (wait until fully unwatched) |
| Cam never had Path B Record | **No** StopRecord |

Log: `SOS device StopRecord commanded` + `device control sent` `recordCmd":"StopRecord"` `mode":"udp_once"`.

---

## Operator PASS

1. Restart Fleet (server.js).  
2. SOS → confirm Record (SD on).  
3. Ack if you want; **Stop live** (last viewer).  
4. BWC local record should **stop** (not re-light within ~2s).  
5. Log: one StopRecord at stop time — **no** second Record.
