# MOB DISC — SOS stop-video → StopRecord only (NEXT MOB) — 2026-08-10

**Status:** LOCKED — **next APPLY**. Mute-hold V2 = operator **PASS** (short). **No code this turn.**  
**Read:** `.cursorrules` · DeviceControl **`udp_once`** · Firmware Gold live cores **off limits**.

---

## Problem (log-proven)

After SOS Path B **`Record`**, operator stops panel live → WVP hard-stop only → **no** `StopRecord` → BWC can re-light local record (~2s) with no second Fleet Record line.

---

## Intent

Operator **stop video** after Path B Record for that cam → **one** `StopRecord` `udp_once`.

| In | Out |
|----|-----|
| One StopRecord on operator stop / hard-stop if Path B Record was sent | Spam / `sip_txn` |
| Flagged cams only | FLV/pin rewrite |
| | Mute-hold (PASS) |
| | StopRecord on Ack (not this MOB) |

---

## APPLY

**`MOB-APPLY SOS-STOP-VIDEO-STOP-RECORD-V1`**

When applied (not now): Path B flag → on stop-video/hard-stop → one `deviceControl.sendDeviceControl` `StopRecord` → log `udp_once`.

**Risk:** ends ground file when HQ stops watching — **wanted**.  
**Rollback:** one MOB; checkpoint already on remote.
