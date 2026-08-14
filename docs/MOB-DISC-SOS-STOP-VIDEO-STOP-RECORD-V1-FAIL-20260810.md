# MOB DISC — SOS-STOP-VIDEO-STOP-RECORD-V1 FAIL (log) — 2026-08-10

**Status:** FAIL locked from `storage/fleet.log`. **No code this turn.**  
**Read:** `.cursorrules` · DeviceControl once.

---

## Latest run (kk `…0009`) — code **did** fire

| Time (+08) | Log |
|------------|-----|
| **20:17:25** | SOS → **Record** `udp_once` ok |
| **20:17:40** | Ack |
| **20:17:43** | stop-video → pool stop → **`StopRecord` commanded** + **device control once ok** |
| **20:17:47** | WVP **hard-stop** `ok:true` (4s grace after soft-stop) |

So V1 is **not** “never sent.” Fleet sent **one** StopRecord and UDP once-ok.

Earlier same evening (**20:11**, **20:13**) stop had **pool stop / hard-stop but no StopRecord** — those runs were **before** restart picked up the patch (or no arm). Ignore for V1 wire proof.

---

## Why you still see record after stop

| Hypothesis | Fit |
|------------|-----|
| **A — Hard-stop after StopRecord** | StopRecord at **20:17:43**; live BYE/hard-stop **4s later** at **20:17:47**. Unit may **re-assert SD record** on live tear-down even after StopRecord. |
| **B — Device ignores StopRecord** | Less likely alone — we got `once ok` — but firmware may no-op RecordCmd while SOS/live state odd. |
| **C — We never sent** | **False** for 20:17. |

Operator symptom “same as before” matches **A** best: LED comes back on **after** hard-stop, not because Fleet skipped StopRecord.

---

## Next APPLY (one path)

**`SOS-STOP-VIDEO-STOP-RECORD-V2`** — move (or add) StopRecord to **after WVP hard-stop completes**, not at pool-stop soft moment.

| Do | Don’t |
|----|-------|
| One `StopRecord` `udp_once` when hard-stop finishes for armed Path B cam | Spam / `sip_txn` |
| Keep arm until hard-stop (don’t clear at soft pool-stop only) | Touch FLV/pin attach |
| Optional: second StopRecord only if log proves first was too early | Freestyle live rewrite |

**Risk:** still firmware may ignore; if V2 log shows StopRecord **after** hard-stop and LED still returns → product limit / OEM, not missing Fleet cmd.

---

## Verdict

| Claim | Truth |
|-------|-------|
| V1 failed to send | **No** (20:17 sent + once ok) |
| V1 fixed BWC LED | **No** (operator FAIL) |
| Next | StopRecord **after** hard-stop → `MOB-APPLY SOS-STOP-VIDEO-STOP-RECORD-V2` |
