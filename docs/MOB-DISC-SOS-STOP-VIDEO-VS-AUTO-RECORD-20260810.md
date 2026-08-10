# MOB DISC — This run: stop video vs BWC auto-record (2026-08-10 ~18:24)

**Status:** LOCKED from **`storage/fleet.log`** this reproduce. **No code edited.**  
**Read:** `.cursorrules` · DeviceControl = `udp_once` only · zero change without APPLY.

**Operator steps:** SOS → Ack → stop panel video → “off” → BWC local record within ~2s.

---

## Exact timeline (kk `…0009`, incident `alarm-1786357495217`)

| Local (+08) | Fleet log | To BWC? |
|-------------|-----------|---------|
| **18:24:55.216** | `device alarm raised` SOS | alarm path |
| **18:24:55.229** | `device control sent` **`recordCmd":"Record"`** `mode":"udp_once"` | **Yes — one Path B Record** |
| **18:24:55.232** | `SOS device Record commanded` | (same) |
| **18:24:58.683** | `wvp video handoff start` (live) | WVP play / INVITE side — **not** Record |
| **18:25:05.579** | `sos acknowledged` note `fffff` | **No** Record, **No** StopRecord |
| **18:25:17.703** | `stop-video from dashboard` `clientReason":"stopSlot:panel-stop"` | live stop request |
| **18:25:17.705** | `wvp video handoff soft-stop scheduled` `graceMs":4000` | tear-down timer |
| **18:25:21.735** | `wvp video handoff hard-stop` `ok":true` | **complete live stop** (WVP) |
| **After 18:25:21 →** | keepalive / device-status only | **No second Record**, **no StopRecord** |

Ledger: one `deviceRecordCmdAt` at raise; `ackAt` 18:25:05; **no** second cmd flag.

---

## What we send when you stop video

**Live stop only (this path):**

1. Dashboard `stop-video` / panel-stop  
2. Soft-stop (4s grace) → **hard-stop** WVP handoff  
3. Wall listen stop  

**We do not** send DeviceControl **`Record`** on stop.  
**We do not** send DeviceControl **`StopRecord`** on stop (today).  
**We do not** send Record on Ack.

So the “starts recording again within 2s after off” is **not** a second Fleet Record line in this log.

---

## Why it can still light Record after stop

1. **Path B already ordered Record at SOS** (18:24:55). That command is still “on” from the device’s view unless something sends **`StopRecord`**.  
2. Stopping **live** (hard-stop) ends the stream. It does **not** cancel Path B local record.  
3. Some BWCs, when live BYE/hard-stop lands while SOS-Record was armed, **re-assert local record** with **no** new HQ Record MESSAGE — matches “no second log line + LED within ~2s of hard-stop (~18:25:21).”

That is **not** “we secretly re-sent Record.” It **is** “we started Record on SOS and never sent StopRecord when live ended.”

---

## “Complete stop like last time”

**Live:** this run **did** complete stop — soft → hard-stop `ok:true`.  
**Local record from Path B:** **not** completed — no `StopRecord` on Ack or on panel-stop.

If product intent is: **operator stop video after SOS = end live + end the Record we started**, that is a **named APPLY** (not freestyle):

| APPLY (pick one) | Behavior |
|------------------|----------|
| **`SOS-STOP-VIDEO-STOP-RECORD-V1`** (recommended) | On operator `stop-video` / hard-stop, if this cam had Path B Record for open/recent SOS → **one** `StopRecord` `udp_once` |
| `SOS-ACK-STOP-RECORD-V1` | On Ack → one `StopRecord` (may cut ground file earlier than stop-video) |

**Forbidden without APPLY:** spam Record/StopRecord, `sip_txn`, rewrite stop/live cores.

---

## Verdict

| Question | Answer from this log |
|----------|----------------------|
| Did we send Record again after Ack/stop? | **No** |
| What did stop video send? | WVP soft-stop → **hard-stop** only |
| Why BWC records after off? | Path B Record at SOS + **no** StopRecord on stop; device may re-light after live end |
| Code changed this turn? | **No** |

---

## Next step

Say **`MOB-APPLY SOS-STOP-VIDEO-STOP-RECORD-V1`** if you want one `StopRecord` when panel/live stop completes after SOS Path B.
