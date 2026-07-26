# MOB DISC — SEC 1.1 PASS meaning + Google vs MOB process

**Date:** 2026-07-25  
**Status:** **LOCKED** (operator question)  
**Related:** Phase 1 Task 1.1 `SEC-BWC-COMPANION-TIMING-SAFE-HASH-V1`  
**Roadmap:** `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`

---

## 1) “I can open BWC — is that PASS?”

**Short answer:** For Task **1.1**, opening BWC live from the dashboard is a **good regression check** (we did not break Fleet video). It is **enough for operator PASS** on 1.1 **if** you are not actively testing the companion APK token path today.

### What 1.1 actually changed

Only `secureTokenEqual()` — used when checking **`FM_BWC_COMPANION_TOKEN`** (companion Bearer / `x-bwc-companion-token` routes).

| Smoke | Proves |
|-------|--------|
| Dashboard Open BWC / live wall | Server still runs; video path OK — **regression** |
| Companion call with **correct** token → 200 | Timing-safe compare still accepts good token — **direct 1.1** |
| Companion call with **wrong** token → 401 | Reject still works — **direct 1.1** |
| `npm run verify:sec-companion-timing` | Static + unit check of hash-then-`timingSafeEqual` — **already OK** |

**Operator rule for 1.1:**

- If you **only** use dashboard Open BWC (no companion token in daily lab): **Open BWC works = PASS for 1.1** (plus verify already green).  
- If you use **companion APK / battery / companion APIs**: also confirm those still work with your usual token once after restart.

We do **not** need Google to re-scan before you say PASS.

---

## 2) Did Google say “show Google first, then MOB”?

**No — that is not the locked process.**

What Google / Architect asked for:

1. **Record** the findings (we did — SEC discs + master roadmap).  
2. **Mob programming:** agent implements **one** named task → **you** review / test / approve → next task.  
3. For 1.1: implement the timing patch, then **wait for your approval** (not Google’s).

| Myth | Fact |
|------|------|
| Google must approve each MOB before code | **False** — you (operator) PASS/FAIL |
| Agent must send Google a patch pack before APPLY | **False** — Disc records findings; APPLY is your command |
| “Output code for 1.1 then wait” | **True** — wait for **your** PASS before 1.2 |

Google’s list = **what to fix**.  
Your **PASS** = **when** we move to the next task.

---

## 3) Locked process going forward (Phase 1)

```text
Architect roadmap task N
  → Agent MOB-APPLY / implements ONLY that task
  → You smoke (as defined for that task)
  → You say PASS or FAIL
  → Only then Task N+1
```

Phases 2–4 stay **PAUSED** until Phase 1 is done.

---

## Next

If you confirm **PASS** on 1.1 (Open BWC OK is fine for that):

Say: **PASS** or **`MOB-APPLY SEC-SOS-OPEN-EXPLORER-NO-CMD-V1`**

Until then — **zero code** on Task 1.2.
