# MOB DISC — CleanData+StopRecord FAIL (log) — 2026-08-10

**Status:** FAIL locked from log. **No code this turn.**  
**Read:** `.cursorrules` · CREDIT-LEAN · DeviceControl `udp_once`.

---

## This run (kk `…0009`) — Fleet **did** send OEM order

| Time (+08) | Event |
|------------|--------|
| **20:35:42** | SOS → **Record** `udp_once` once ok |
| **20:35:54** | Ack |
| **20:35:58** | stop-video → soft-stop (4s grace) |
| **20:36:02.875** | WVP **hard-stop** ok |
| **20:36:02.877** | **`CleanData: 1`** sent |
| **20:36:02.878** | SOS device CleanData commanded |
| **20:36:02.879** | **StopRecord** sent + commanded |
| **20:36:02.880–.881** | both **device control once ok** |

So this is **not** “CleanData missing” or “StopRecord missing.” Wire order matches what you asked: CleanData then StopRecord after hard-stop. Operator still FAIL on SD re-light.

---

## What that means

| Claim | Log |
|-------|-----|
| Code path ran | **Yes** |
| UDP once delivered to peer | **Yes** (once ok both) |
| Device cleared 警情 / stopped SD | **No** (your eyes) |

Likely (OEM / timing — not inventing new cmds):

1. **No gap** — CleanData and StopRecord fired in the **same millisecond** as hard-stop; device may need time after CleanData before StopRecord (or after live tear-down).  
2. **CleanData too late** — 警情 clear may need to happen on **Ack** (or before live stop), not only at hard-stop.  
3. **String form** — we sent `CleanData: 1` (space). Codebase also lists `CleanData:1` (no space). OEM PDF may require one exact form.  
4. **once ok ≠ device accepted** — UDP send success only; no MANSCDP 200 body proving CleanData applied.

---

## Do **not** (without new OEM line + APPLY)

- Spam more Record/StopRecord / `sip_txn`  
- Touch UI / mute / FLV  
- Invent ResetAlarm / extra cmds not in §10  

---

## Next APPLY (only if you order — pick one)

| APPLY | Change |
|-------|--------|
| **`SOS-CLEANDATA-GAP-THEN-STOP-V1`** (recommended first) | After CleanData, wait **N ms** (e.g. 300–500) then StopRecord — same hard-stop hook |
| **`SOS-ACK-CLEANDATA-V1`** | On Ack: one `CleanData: 1`; on hard-stop: StopRecord only |
| Confirm with OEM | Exact `CleanData: 1` vs `CleanData:1` + required delay |

**My call:** try gap first (smallest). If still FAIL with gap in log → CleanData on Ack next.

No more APPLY until you say the exact name.
