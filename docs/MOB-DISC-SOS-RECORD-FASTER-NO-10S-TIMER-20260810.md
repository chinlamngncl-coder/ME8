# MOB DISC — Faster SOS Record? (ME8 has no 10s wait) (2026-08-10)

**Status:** LOCKED paper. **No code this turn.**  
**Read:** `.cursorrules` + `me8-device-control-once` — one SOS → one `Record` `udp_once`; no retransmit storm.  
**User:** Path B is good; **>10s** is not good — can we do a faster version?

---

## Verdict

**ME8 Path B already sends Record immediately on new SOS raise.**  
There is **no** 10-second timer in `scheduleDeviceRecordOnSos` (server.js). Call chain: alarm raise → `scheduleDeviceRecord` → `deviceControl.sendDeviceControl(… Record …)` same turn.

So a “faster MOB” that only “sends Record sooner in our code” **does nothing** if the command is already at t≈0 and the **camera** starts writing/LED ~10s later.

| Where time goes | Faster via ME8 code? |
|-----------------|----------------------|
| Our send after SOS raise | Already ASAP — **no sleep** |
| SIP reach / contact restore | Small; restore is best-effort then send |
| **BWC firmware** starts file after Record/SOS | **No** — OEM behavior / device menu |
| Duplicate Record / sip_txn “for speed” | **Forbidden** — DeviceControl once (worse, not faster) |

---

## What “faster” can mean (honest)

1. **Prove first (lab)**  
   - Note SOS button time.  
   - Log: `SOS device Record commanded` + `device control sent` `mode:"udp_once"` — how many ms after raise?  
   - If log is **&lt;1s** but red light / file is **~10s** → **firmware**, not Fleet.  
   - If log itself is **~10s late** → we hunt **alarm path delay** (named MOB after evidence).

2. **Firmware / OEM**  
   - Device SOS auto-record settings, pre-buffer, “alarm record delay” if the model has one — **camera config / vendor**, not a Fleet APPLY.

3. **HQ Path A**  
   - If live is already up, server capture can start on stream-ready — parallel to belt; does **not** make the SD file appear faster.

4. **Do not**  
   - Second Record, Timer E / `sip_txn`, or “ping Record every second” — violates DeviceControl once and can storm the BWC.

---

## Recommendation

**No “faster Record MOB” until lab proves the delay is in ME8.**  
Next step: one SOS → you watch the unit; agent checks log timestamp vs raise.  

- Log ASAP + LED late → document as **firmware**; optional OEM menu check.  
- Log late → then name a MOB on the **alarm→scheduleDeviceRecord** path only.

**Not next:** invent a parallel Record channel without PASS evidence.
