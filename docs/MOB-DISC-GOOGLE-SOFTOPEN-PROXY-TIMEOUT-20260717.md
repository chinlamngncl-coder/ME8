# MOB DISC — Soft Open FAIL again: Google handoff (proxy INVITE + soft timeout) 2026-07-17 ~16:14

**Status:** Historical FAIL · **Google EXECUTION APPLIED 2026-07-17 evening**  

**APPLIED (strict order):**  
1. `MOB-APPLIED-SOFTOPEN-SINGLE-INVITE-PATH-V1.md`  
2. `MOB-APPLIED-WVP-SOFT-TRY-BUDGET-V1.md`  
3. `MOB-APPLIED-PROXY-INVITE-REPLY-TRACE-V1.md`

---

## Operator after APPLY

1. **Restart Fleet**  
2. **Restart host SIP proxy** (200 OK trace)  
3. Hard refresh dashboard  
4. Soft Open Chin (then kk)

| Pass | Fail |
|------|------|
| Real picture | Black / can’t play |
| `live broker wvp-zlm primary` | `wvp_soft_try_timeout` |
| No Fleet `invite requested` on Soft Open | Double INVITE |
| Proxy: `200 OK from cam → WVP` | INVITE only · no 200 |
| softTryMs **15000** if timeout | Still softTryMs **2000** |

---

## Original fail (pre-APPLY, ~16:14)

Broker: `wvp_soft_try_timeout` · `softTryMs: 2000` · then `zlm_relay_inactive`.  
Proxy: INVITE forwarded to Chin `.131` / kk `.132`. Fleet SIP also `408`.  
Cause: **Fleet + WVP double INVITE** + **2s soft budget**. Not GPS · not TooManyResults.

## One line

**Google pack APPLIED — Soft Open WVP-only + 15s budget + 200 OK proxy trace; restart Fleet + proxy then prove.**
