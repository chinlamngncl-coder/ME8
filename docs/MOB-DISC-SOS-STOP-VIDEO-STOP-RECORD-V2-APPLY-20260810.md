# MOB DISC — APPLY SOS-STOP-VIDEO-STOP-RECORD-V2 — 2026-08-10

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY SOS-STOP-VIDEO-STOP-RECORD-V2`  
**Files:** `server.js` + small hook in `lib/wvpVideoHandoff.js` (`setOnHardStopComplete`).  
**Not touched:** FLV attach, pin mirror, DeviceControl stays `udp_once`.

---

## Change vs V1 FAIL

| V1 | V2 |
|----|----|
| StopRecord at **pool stop** (~same time as soft-stop schedule) | StopRecord when **hard-stop finishes** (~4s later, after live tear-down) |
| Arm cleared early; then hard-stop could re-light SD | Arm held until hard-stop → StopRecord |

Fallback: if WVP handoff **off**, still StopRecord at pool stop (same as V1).

Log reason: `operator_live_hard_stop`. Expect order: soft-stop → **hard-stop** → **StopRecord** + once ok.

---

## Operator PASS

1. **Restart Fleet** (new hook must load).  
2. SOS → Record.  
3. Stop live → wait through grace (~4s).  
4. Log: `wvp video handoff hard-stop` **then** `SOS device StopRecord commanded`.  
5. BWC SD record stays **off** (no re-light).
