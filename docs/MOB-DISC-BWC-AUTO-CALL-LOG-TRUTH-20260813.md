# MOB-DISC BWC still “calling” — Fleet log truth (2026-08-13)

## Log checked
`storage/service-stdout.log` (UbitronC2 service). Time = today ~18:38–18:50.

## Plain facts

### 1) Real video call (ANPR) — once
- **18:38:22** `invite skipped` + **`wvp video handoff start`**  
  `camId=34020000001329000009` **`surface=analytics-anpr`**
- Then `[anpr-native] POST /watch/start` — ANPR was reading that stream.
- **That is Start watch / ANPR Live** starting video (not a ghost).

### 2) Stop happened
- **18:42:39** soft-stop → **18:42:43** hard-stop for that cam.  
- `setWatchSlots … []` — watch list cleared.

### 3) After stop — no new dashboard video start in this log
- **No** further `wvp video handoff start`
- **No** further `invite skipped` / ANPR `watchStart`
- So **Fleet UI is not repeatedly Start-watching** in this window.

### 4) What keeps hitting the BWC every ~30s (this is the “still calling” feel)
Fleet log spam:
- `bwc activity sweep` every **30s**
- `device status query` **DeviceStatus** (direct + target)

That is **status polling**, not Live video Start watch.  
Some BWCs wake / beep / show activity on DeviceStatus — feels like a “call.”

### 5) Extra INVITE answers (~18:44, ~18:47)
- SIP **INVITE 100/200** via `wvp-sip-lan-proxy`
- Same second as **PTT client disconnected** (camera PTT drop)
- **No** matching Fleet `handoff start` line  
→ Invite is on the **WVP/SIP path**, not a new ANPR Start watch in this log.

Also: camera **PTT reconnect** `login ok` / disconnect — device itself talking to server.

## Who is NOT the caller right now
- Nobody opening Ops/ANPR in the log after 18:42 for a new handoff.
- ANPR bat alone does not SIP-invite (only reads FLV after play exists).

## Immediate stop (operator)
1. ANPR → **Stop all** (if open).  
2. Close **START-ANPR.bat**.  
3. If BWC still wakes every ~30s → that matches **DeviceStatus sweep** while **UbitronC2** runs — stop service only if you want zero SIP traffic: `STOP-UBITRON-SERVICE.bat` (lab choice).

## Next APPLY (pick one after you say which symptom)
| If | APPLY |
|----|--------|
| BWC wakes every ~30s with no Live open | `FLEET-BWC-STATUS-SWEEP-QUIET-V1` — slow/stop DeviceStatus sweep when no viewers |
| Video LED / stream without Start | `WVP-NO-REINVITE-WITHOUT-VIEWER-V1` — dig WVP re-INVITE after hard-stop |

No code this turn — disc only.
