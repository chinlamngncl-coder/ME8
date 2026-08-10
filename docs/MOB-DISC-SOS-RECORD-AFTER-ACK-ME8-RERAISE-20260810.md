# MOB DISC — Record again after Ack + stop panel (ME8 hypothesis) (2026-08-10)

**Status:** LOCKED diagnose. **No code this turn.**  
**Read:** `.cursorrules` · DeviceControl once · Path B = Record on **new** SOS raise only.  
**User:** Ack/cleared SOS, stopped panel video (BWC live stopped too), then **local record starts again** — believes **Fleet is re-triggering**.

---

## Code fact (live tree)

In **ME8 source**, the **only** automatic `recordCmd: 'Record'` path is:

`scheduleDeviceRecordOnSos` ← **new** `raiseDeviceAlarm` when **no** open incident for that cam.

| Event | Sends `Record`? |
|-------|-----------------|
| First SOS raise | **Yes** (once) |
| Alarm **merge** while SOS still open | **No** |
| Stop wall / panel / BYE live | **No** Record in code |
| SOS **Ack** | **No** Record and **no** StopRecord today |
| HQ voice connect (some profiles) | May send **`StopRecord`**, not Record |

Stopping the panel only tears down **live**. It does **not** call Path B by itself.

---

## Why it can still be “from our side”

After you **Ack**, `hasOpenAlarm(cam)` is **false**.

If the **BWC still sends another SOS/alarm SIP MESSAGE** (late retransmit, uncleared device SOS, second press, firmware re-alarm):

1. Fleet treats it as a **new** raise  
2. Path B runs again → **second** `Record` `udp_once`  
3. Camera starts recording again — **even with no HQ live**

That matches your sequence: Ack → stop panel → record again, **without** a new HQ call.

Less common: pure firmware restart with **zero** second log line — then not Fleet.

---

## Prove in one run (you + log)

After Ack + stop panel, when record starts again, search the server log around that second:

| Look for | If present |
|----------|------------|
| Second `device alarm raised` / new SOS | Device (or late SIP) opened a **new** alarm |
| Second `SOS device Record commanded` | **Confirmed ME8 Path B again** |
| `device control sent` + `Record` + `udp_once` | Same |
| **No** second Record / alarm | Firmware-only — Fleet innocent |

Also note: `sos server pull scheduled` / live INVITE = **live video**, not SD Record — do not confuse the two.

---

## How to stop it (options — APPLY later)

| Option | MOB idea | Risk |
|--------|----------|------|
| **A** After Ack, **suppress** Path B Record for N seconds / until device quiet | `SOS-ACK-SUPPRESS-RECORD-V1` | Late real SOS in window ignored for Record |
| **B** On Ack, send one **`StopRecord`** | `SOS-ACK-STOP-RECORD-V1` | May cut ground file early |
| **C** Clear/ack on **device** as well as Ops | Ops + OEM habit | Firmware must leave SOS mode |
| **D** Debounce identical alarm MESSAGE | Harder — don’t invent without log | |

**Recommendation:** First paste or confirm log for a **second** `SOS device Record commanded` after Ack.  
If yes → next APPLY **A or B** (I pick **A** suppress after Ack as safer than always StopRecord).  
If no → firmware; OEM SOS clear.

---

## Agent must not

Blame panel stop as “Record command.”  
Add Record spam / `sip_txn` to “fix” it.
