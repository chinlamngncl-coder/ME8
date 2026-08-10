# MOB DISC — SOS Record restarts after officer stops BWC (2026-08-10)

**Status:** LOCKED diagnose. **No code this turn.**  
**Read:** `.cursorrules` + DeviceControl once — Path B = **one** `Record` on **new** SOS raise only.  
**User:** SOS Record arrives fast (good). After they **stop** the BWC recording, it **starts again** even with **no** HQ call / video. How to stop that command?

---

## What ME8 does today

| Event | ME8 DeviceControl |
|-------|-------------------|
| **New** SOS / fall raise | **One** `Record` (`udp_once`) — Path B |
| **Merge** of same open alarm (repeat alarm while open) | **No** second Record (by design) |
| HQ voice/intercom connect (some profiles) | May send **`StopRecord`** on connect — not Record |
| Officer stops recording on the camera | **ME8 does not** auto-send Record again for that |

So Fleet is **not** supposed to keep “re-commanding Record” while you stop the unit with no new SOS and no HQ call.

---

## Most likely cause

**BWC firmware / SOS mode:** while the **SOS alarm is still active** on the camera, many models **force local record**. If the officer stops recording but SOS is still open, the unit **starts recording again by itself** — no HQ call needed, and **no second ME8 Record** required.

That matches: “no calls or video from HQ” + auto record again.

---

## How to prove (one lab SOS)

1. SOS → confirm log: `SOS device Record commanded` / `device control sent` `Record` `udp_once` (once).  
2. On the BWC, **stop** recording.  
3. When it starts again, check server log for **another** `Record` / `SOS device Record commanded`.  

| Log | Meaning |
|-----|---------|
| **No** second Record | **Firmware** — not a Fleet “keep recording” command |
| **Yes** second Record | Unexpected — then we hunt **new raise** / wrong path (named MOB) |

---

## How to stop it (operations / future MOB)

| Approach | Notes |
|----------|--------|
| **Ack / clear SOS** on Ops (and clear on device if required) | Stops “SOS active” mode that forces record on many firmwares |
| **Do not** only stop record while SOS still red | Firmware will often restart record |
| **Future APPLY (only if you want)** | e.g. on **SOS Ack** → one `StopRecord` `udp_once` — **not** done today; dual-record disc parked Stop as later policy |
| **Forbidden** | Spam Record/StopRecord / `sip_txn` “to fix” — DeviceControl once |

---

## Recommendation

1. Lab: prove **no second ME8 Record** after you stop → treat as **firmware SOS lock**.  
2. Ops habit: **Ack SOS** (clear alarm) then stop record if needed.  
3. If you want Fleet to send **`StopRecord` on Ack** → say  
   `MOB-APPLY SOS-ACK-STOP-RECORD-V1`  
   (discuss risk first: may cut ground evidence early if Ack is too soon).

**Not** a “faster Record” issue — separate from the 10s firmware start delay.
