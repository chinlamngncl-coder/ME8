# MOB DISC — Operator already wants WVP-ZLM — **stop asking**

**Status:** DISC locked — agent behavior  
**Date:** 2026-07-16  
**Search:** `stop asking`, `i want wvp zlm`, `do not ask soak`, `agent bring up`  
**Operator:** Angry again — “then why the fuck are you asking? I want it. Why keep wasting my time?”

---

## Locked intent (already decided — do not re-ask)

| Fact | Detail |
|------|--------|
| Operator wants | **WVP → ZLM → wall live** (multi-cam / Open All included) |
| Not optional | Not “when you want” / “say if you want a ZLM run” / “prefer FFmpeg?” |
| Agent job | **Make it real** — preflight, bring up WVP/ZLM, fix gates, prove with log |
| Operator job | Desk PASS/FAIL from what they **see** after path is actually ZLM — not decide the architecture again |

Re-asking “do you want to soak / start Docker / try live?” after they already ordered WVP-ZLM is **another waste of time**.

---

## Forbidden agent lines (after this disc)

- “When you want a real ZLM run…”  
- “Say if you want me to…” (for WVP bring-up / preflight already in scope)  
- “Open live and we’ll see” **before** WVP preflight PASS  
- Treating FFmpeg fallback soak as progress toward “you wanted ZLM”  
- Soft language that puts the **decision** back on the operator when the decision is already **WVP-ZLM**

---

## Required agent behavior

1. **Assume WVP-ZLM is the live target** until operator explicitly changes it.  
2. If WVP/Docker is down → **agent diagnoses and states exact bring-up steps / runs what it can** (docker start, compose, health check). Do **not** ask whether they still want ZLM.  
3. If wall/broker gate blocks ZLM → **MOB to fix** (already partially done: multi-cam soft). Do not ask for another FFmpeg soak.  
4. Only after preflight PASS (`:18080` up, not ECONNREFUSED) → tell operator **one line**: ready — open 2 BWC; log must show `live broker wvp-zlm primary`.  
5. Log check first sentence = path name (**WVP-ZLM** or **FFmpeg fallback**). No hedging.

---

## Relation to preflight disc

`MOB-DISC-WVP-NO-SOAK-WITHOUT-PREFLIGHT.md` = don’t burn soak while stack is dead.  
**This disc** = don’t **ask** the operator to re-choose ZLM or volunteer for wasted soaks.  
Together: **agent owns bring-up + honesty; operator owns eyes on video after ZLM is actually selected.**

---

## One line

**They already want WVP-ZLM. Stop asking. Fix / bring up / prove — don’t waste another minute on “do you want…?”**
