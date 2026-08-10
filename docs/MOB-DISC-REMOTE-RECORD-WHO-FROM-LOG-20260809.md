# MOB DISC — Remote Record: who activated it (fleet.log checked) (2026-08-09)

**Status:** LOCKED from `storage/fleet.log`. **No code.**

---

## Verdict

**Who activated Remote Record:** the **SOS raise pipeline** (system), **not** Archive, **not** a dashboard operator click on Cases.

**When (your case `SO-20260809-cf396e` / SOS `alarm-1786285936609` / cam `…0008`):**

| Time (+08) | Log |
|------------|-----|
| **22:32:16.609** | `[SIP] device alarm raised` — SOS from device via `wvp_sip_proxy`, GPS `1.316711, 103.759466` |
| **22:32:16.621** | `[SIP] device control sent` — `recordCmd:"Record"`, `mode:"udp_once"` |
| **22:32:16.625** | `[SIP] SOS device Record commanded` — same `incidentId` |
| **22:32:16.629** | `[Web] ops case SOS raise wire` — creates/links case `SO-20260809-cf396e` |
| **22:32:38** | `[SIP] sos acknowledged` — Ack ~22s later (note `wedsd`) |

**Actor:** not a username on Record. Trigger = **BWC SOS alarm received** → `deviceAlarm.raiseDeviceAlarm` → **Path B** `scheduleDeviceRecord` → DeviceControl **Record** once.

Archive / Cases desk clicks are **not** in this chain. Record fired **at raise**, ~22s **before** Ack, and **long before** later archive/unarchive testing (~23:23 in UI).

---

## Who is “the user”?

| Role | Role in this event |
|------|---------------------|
| **BWC / wearer** | Pressed SOS (alarm arrived on wire) |
| **Fleet server** | Auto Path B Record on new SOS |
| **Operator `global`** | Acked later; did **not** send the Record command in this log |
| **Archive button** | **Not present** in Record log lines |

---

## One line

**Log proves: SOS alarm at 22:32:16 auto-commanded DeviceControl Record; Archive did not.**
