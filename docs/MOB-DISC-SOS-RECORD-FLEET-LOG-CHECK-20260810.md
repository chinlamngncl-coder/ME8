# MOB DISC — fleet.log check: SOS Record today (2026-08-10 ~18:05)

**Status:** LOCKED from **live log** `storage/fleet.log` + `sos-incidents/ledger.json`. **No code this turn.**  
**Read:** `.cursorrules` · DeviceControl once.

---

## Apology / method

You asked for the **last log**. Checked. Not guessing firmware without looking.

---

## What the log shows (kk / `…0009`)

### Today — every Fleet `Record` on this cam

| Local time | Event |
|------------|--------|
| **17:59:37** | `device alarm raised` → **`device control sent` Record `udp_once`** → `SOS device Record commanded` |
| **18:05:55** | same (second SOS) → **one** Record `udp_once` again |
| **After 18:05:55 through 18:15+** | **No** further `recordCmd":"Record"`, **no** second `SOS device Record commanded`, **no** new `device alarm raised` |

Ack for second SOS: ledger `ackAt` **18:06:12** (+08). After that window: status/keepalive only — **not** Record.

### Ledger (same story)

- `alarm-1786356355160`: Record cmd **18:05:55.170Z**, Ack **18:06:12.658Z** — **one** cmd flag.  
- `alarm-1786355977616`: Record at raise, Ack ~9s later — **one** cmd flag.

### Why “only since yesterday”

First Path B hit in this log for Chin: **2026-08-09 22:32:16** `SOS device Record commanded`. That is **`SOS-DEVICE-RECORD-ON-ALARM-V1`** going live — we **do** send Record on each **new** SOS. That part is **our side**.

---

## Verdict (log-backed)

| Claim | Log |
|-------|-----|
| We send Record on SOS | **Yes** — once per new raise (`udp_once`) |
| We send Record **again** after Ack / stop panel (this run) | **No** — zero second Record after 18:05:55 |
| Stop panel = Record | **No** — not in log |

If the BWC **lights record again** after Ack with **no** second `device control sent` Record line, that restart is **not** a second Fleet Path B in this capture. Next lab: note the **exact clock** when it restarts; we re-grep that second. If a new Record appears, we own it and APPLY suppress/StopRecord-on-Ack.

---

## Product options (still need APPLY)

- Keep Path B (wanted for ground evidence).  
- Optional later: `SOS-ACK-STOP-RECORD-V1` or suppress Record after Ack — **only after** a log line proves a second Fleet Record, or you accept StopRecord on Ack by policy.
