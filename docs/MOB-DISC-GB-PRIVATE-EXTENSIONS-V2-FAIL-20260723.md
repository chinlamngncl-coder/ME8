# MOB DISC — GB private extensions kill switch V2 · FAIL

**Date:** 2026-07-23  
**Status:** **FAIL** (operator) — **ROLLED BACK** to `ec0296d` (see `MOB-APPLIED-ROLLBACK-GB-PRIVATE-EXTENSIONS-V2-20260723.md`)  
**Failed MOB:** `MOB-EXECUTE-GB-PRIVATE-EXTENSIONS-WITH-KILLSWITCH-V2`  
**Checkpoint (safe rollback):** `ec0296d` — `auto-backup: checkpoint before private SIP/UDP extensions`  
**APPLIED doc (fail):** `MOB-APPLIED-GB-PRIVATE-EXTENSIONS-WITH-KILLSWITCH-V2-20260723.md`

---

## Plain English

You asked for private **SOS** and **PTT** signals that still work when video rides **GB28181 / WVP**, with a **kill switch** if it goes wrong.

Operator result: **failed**. Do not treat this MOB as done.

---

## What V2 actually did (honest)

| Claim in mandate | What landed |
|------------------|-------------|
| New private SIP/UDP parsers for orphaned buttons | Mostly **wrapped code you already had** (Fleet SIP Alarm + PTT TCP 29201 + group MESSAGE) behind `FM_ENABLE_PRIVATE_BWC_EXTENSIONS` |
| UDP listen for `dwCMD == 130` | Did **not** add a new UDP socket — gated the **existing TCP** PTT path |
| Kill switch | Real — env flag default ON |
| Do not break GB INVITE/video | Intentional — video path not rewritten |

So V2 was a **safety wrapper + light Alarm content-type check**, not a full “WVP orphans SOS/PTT → fix” build. That mismatch is the first reason a live FAIL is expected if the gap was on the **WVP/GB** side.

---

## Likely why it failed (risk order)

1. **Wrong layer** — Live video on WVP; SOS/PTT buttons still need proprietary signaling. Wrapping Fleet-only Alarm/PTT does not fix devices that only talk private SOS/PTT to a path we did not extend.  
2. **Alarm content-type gate** — V2 can **skip** SIP Alarm if `Content-Type` is not MANSCDP/xml/empty — may drop real SOS that previously worked.  
3. **No new UDP 130 listener** — mandate text said UDP; product PTT audio is TCP `:29201`. If the test assumed a new UDP port, it would look like “PTT signal missing.”  
4. **Env / restart** — flag must be `1` and server restarted; less likely if default ON and restart happened.

*(Agent does not know which symptom you saw — SOS dead, PTT dead, crash, or video — without your one-line result. Diagnosis above is from the code mismatch, not a guess at your screen.)*

---

## Recommendation (one path)

**Next step: roll back this MOB to the checkpoint**, then stop.

```text
MOB-APPLY ROLLBACK-GB-PRIVATE-EXTENSIONS-V2-TO-CHECKPOINT
```

Meaning: restore tree to **`ec0296d`** (or revert only the V2 files) so lab SOS/PTT/video return to the last known checkpoint before the kill-switch wrap.

**Do not** pile another “fix private extensions” APPLY on top of FAIL until rollback is clean.

After rollback PASS, a **new** paper MOB (separate name) can define the real WVP/GB private SOS+PTT path — one genre, with kill switch designed first — without pretending V2 already did it.

---

## What NOT to do

- Do not set `FM_ENABLE_PRIVATE_BWC_EXTENSIONS=0` as the “fix” and call V2 a PASS — that only disables private paths; it does not prove the MOB succeeded.  
- Do not rewrite INVITE/video while chasing this FAIL.  
- Do not reopen Settings UI polish.

---

## Operator one-line (only if useful)

When you next test after rollback, say only: **SOS fail / PTT fail / both / server crash / video fail** — so the next APPLY targets one thing.

---

## One line

**V2 FAIL — it wrapped old Fleet SOS/PTT behind a flag; it did not deliver the WVP/GB private-button fix. Next APPLY: rollback to checkpoint `ec0296d`, then a new disc for the real path.**
