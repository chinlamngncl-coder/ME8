# MOB-DISC — kk OK (operator platform); live closed; next = voice

**Date:** 2026-07-20 ~16:37  
**Status:** DISC only — **no code**  
**Operator:** Wrong BWC platform input on kk — **not a code bug**. kk is up (pin positioning off). Reminder: layout polish later. **Move on.**

---

## Corrections

| Prior fear | Fact |
|------------|------|
| kk hardcoded / broken in code | **Withdrawn** — wrong platform on BWC |
| Chin-only live | **No** — both cams on same handoff path |
| kk dead | **Up** — positioning/layout only |

Prior disc `MOB-DISC-KK-FAIL-CHIN-PASS-NO-HARDCODE-20260720.md` — root cause was **operator config**, not product.

---

## Live video arc — **CLOSED**

| Item | Status |
|------|--------|
| WVP handoff + proxy + token | PASS |
| Wall picture (`hasAudio:false`) | PASS |
| Pin mirror from wall video | PASS (Chin + kk) |
| kk platform | PASS after correct BWC input |

**No more video / FLV / proxy / pin MOBs** unless regression.

---

## Layout polish — **PARKED** (your reminder)

Not forgotten; **not** next:

- Panel 16×9 / fit-five / rail width (Jul 19 MOBs to re-apply on this tree)
- Pin popup positioning / sizing
- Panel 5 poll duplicate (classic behaviour — cosmetic tuning later)

Named when ready: e.g. `MOB-APPLY-REAPPLY-PANEL-16x9-FIT-FIVE-V1` + pin layout MOB if needed.

---

## Scorecard (major job)

| Function | Status |
|----------|--------|
| Cold SOS (ACL) | PASS (prior) |
| Live wall + pin | **PASS** |
| Panel / pin layout polish | **PARKED** |
| PTT hold | **NEXT** |
| PTT grouping / SOS team | **NEXT** (same wire) |
| Call | **NEXT** (after PTT contact) |
| 16×9 panel | **PARKED** |

---

## Next arc — **Fleet voice / 29201** (not WVP)

**Problem (locked):** Cams SIP-home WVP `:5060`. Fleet sends group MESSAGE (`gtid` + `:29201`) but cam often **never TCP-logins** to Fleet → soft PTT / grouping / call dead ear.

**Not:** more video patches.  
**Not:** WVP broadcast / VoiceAdapter (ARCH cancelled).

**Likely MOB when you APPLY:**

| Name | Intent |
|------|--------|
| **`MOB-APPLY-FLEET-PTT-CONTACT-WVP-HOMED-V1`** | Ensure Fleet can reach WVP-homed cams for group config → `:29201` login |
| or split | contact/register fix first, then matrix re-test PTT + grouping + call |

Docs: `MOB-DISC-NATIVE-29201-RESTORED-STILL-DEAD-20260720.md`, `MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT-20260720.md`.

**Operator test after APPLY:** hold PTT on kk + Chin, SOS team fan-out, Call — pass/fail from ear + log `login ok` on `:29201`.

---

## One line

Live done (both cams). Layout noted for later. **Next named arc = Fleet PTT / grouping / call on native 29201** — say MOB-APPLY when ready.
