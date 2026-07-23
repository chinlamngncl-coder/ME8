# MOB DISC — Agent directive: no park, no menus, risk analysis → one path

**Date:** 2026-07-20  
**Status:** LOCKED — rule `.cursor/rules/me8-wvp-finish-no-park.mdc`  
**Operator ask:** Tell me what to do. Don’t give up. Don’t ask to park. Don’t give multiple options — do risk analysis. Correct?

---

## Correct — yes

| Old agent habit | New rule |
|-----------------|----------|
| “Park handoff” / “turn WVP off” | **Forbidden** — WVP/ZLM is the base |
| “Pick A or B?” at end of reply | **Forbidden** — agent picks after risk analysis |
| Long MOB books without next step | **Forbidden** — one **next MOB-APPLY** named |
| “New Fleet might be faster” | **Forbidden** — finish migration |
| Give up / 80% OK | **Forbidden** |

**Risk analysis** = agent compares paths (time, risk, operator cost), **writes the winner once**, does not dump the menu on the operator.

---

## What you do (operator)

1. **Keep WVP/ZLM running** — no env flip to disable handoff.  
2. **Next code change** (when you say go): **`MOB-APPLY FLV-WALL-LIFECYCLE-PARITY-V1`** — Stopped by BWC, signal lost, stall on ops wall with FLV video.  
3. **You test PASS** — restart, refresh, one wall cam: stop/signal behavior.  
4. **Then:** **`MOB-APPLY COMMAND-WALL-FLV-HANDOFF-V1`** — Command Wall stops hanging on Connecting.  
5. Repeat down the locked order in `MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md`.

You do **not** choose between park vs fix. **Fix**, in order.

---

## What agent does

- Consolidate harm from WVP (100% list doc).  
- Recommend **only the next MOB** in the locked sequence.  
- Apply code **only** when you say **MOB-APPLY** for that exact name.  
- Never suggest parking WVP again.

---

## Risk analysis (why this order — not shown as a menu to operator)

| If we did CW first | Lifecycle still dead on ops wall — ship fail on stop/signal |
| If we parked handoff | Violates product lock; throws away WVP base work |
| If we rebuilt Fleet | Months; loses Evidence/FR/SOS PASS |
| **Lifecycle → CW → FR → pin** | Same `attachFlvPrimary` pattern; unblocks daily lab fastest |

**Winner:** locked phase 1 → 2 → 3 → 4.

---

## One line

**Correct:** agent **finishes WVP+Fleet migration**, **never parks**, **never option-menus the operator** — risk analysis picks **one next MOB**; you say **MOB-APPLY** when ready to code.
