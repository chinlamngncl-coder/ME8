# MOB APPLIED — DEVICE-CONTROL-SIP-ACK-TRACE-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY DEVICE-CONTROL-SIP-ACK-TRACE-V1`  
**Disc:** `docs/MOB-DISC-REMOTE-ONE-CLICK-MULTI-FIRE-LOG-20260723.md`

## What changed

### `lib/deviceControl.js`
Each DeviceControl MESSAGE now logs:

| Log line | Meaning |
|----------|---------|
| `device control sent` | One send: `callId`, `sn`, `contact`, `contactSource`, `recordCmd` |
| `device control provisional` | 1xx (if any) |
| `device control ack` | Final response: `status`, `ok` (200?), `elapsedMs`, `responseN` |
| `device control ack timeout` | No final response within ~8s — **UDP retransmit risk** |
| `device control ack late` | Response after timeout |

### `server.js`
- `resolveContactForCam` returns `{ uri, source }` (e.g. `wvp_register_peer`, `fleet_sip_cache`).
- Remote-control / kill-switch / TakePicture pass `contactSource` into the tracer.

No debounce. No change to RecordCmd itself. WVP handoff stays ON.

## Operator verify

1. **Restart Fleet** (this is server code).
2. Hard refresh dashboard (Ctrl+F5).
3. Note the clock time.
4. Click **Snapshot once** (or Start SD record once).
5. Tell agent the time (or say PASS/FAIL after we read logs).

## How we read the log (agent)

After your click, look for the same `callId`:

| Pattern | Verdict |
|---------|---------|
| 1× `sent` + 1× `ack` `ok:true` (~fast) | Clean wire — multi-feel is **device-side** |
| 1× `sent` + `ack timeout` | Cam may not be ACKing — **retransmit risk** |
| N× `sent` with different `callId` | Dashboard/server multi-emit (unexpected) |
| 1× `sent` + many `ack` / high `responseN` | Stack callback oddity — dig further |

## PASS / FAIL (ops)

- **PASS (trace works):** After restart + one click, you see new lines (`ack` or `ack timeout`) in `fleet.log` for that click.  
- Product “BWC stopped multi-firing” is **not** this MOB’s job — this MOB only **proves the wire**.
