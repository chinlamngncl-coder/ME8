# MOB APPLIED — DEVICE-CONTROL-SIP-NO-RETRANSMIT-STORM-V1

**Date:** 2026-07-23  
**Phrase:** (operator) DeviceControl retransmit storm MOB  
**Canonical name:** `DEVICE-CONTROL-SIP-NO-RETRANSMIT-STORM-V1`  
**Proof disc:** `MOB-DISC-SNAPSHOT-143-ACK408-AND-WALL-ICON-MOJIBAKE-20260723.md`  
**Prior:** `DEVICE-CONTROL-SIP-ACK-TRACE-V1` (01:43: 1× sent → ack timeout → late **408**)

## Root cause (locked)

`sip.js` non-INVITE client transaction **Timer E** retransmits MESSAGE (500ms, 1s, 2s, …) until **Timer F ~32s** → synthetic **408**.  
~6 UDP copies of the same TakePicture → BWC can shutter many times while Fleet logs **one** `device control sent`.

## What changed

`lib/deviceControl.js` — default send path is **`udp_once`**:

- Build SIP MESSAGE once
- `dgram.send` **one** datagram to cam contact (`wvp_register_peer` LAN host:port)
- **No** sip.js client transaction → **no Timer-E storm**

Log lines:

| Line | Meaning |
|------|---------|
| `device control sent` `mode:"udp_once"` | One logical command |
| `device control once ok` | Datagram handed to OS |
| (no more) `ack timeout` / late `408` on this path | Expected — we are not waiting on txn |

`server.js` passes `publicHost` / `sipPort` for Via.

### Escape hatch

`FM_DEVICE_CONTROL_SIP_TXN=1` → old transactional `sip.send` (retransmit risk returns). Do **not** set unless debugging.

## Operator verify

1. **Restart Fleet** (server change).
2. Ctrl+F5.
3. Note time → **Snapshot once**.
4. BWC should take **one** picture (not ~6).
5. Agent can confirm log: `mode:"udp_once"` + `device control once ok` — **no** 408 storm for that callId.

**PASS** = one shutter feel + one `udp_once` in log.  
**FAIL** = still multi-fire (say time; we re-read log).

## Out of scope

Turning off WVP. Button debounce. Call Groups. Icon encoding (already PASS).
