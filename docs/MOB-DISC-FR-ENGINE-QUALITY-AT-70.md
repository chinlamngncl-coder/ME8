# MOB DISC — Engine not good enough at fixed 70% (stop threshold theater)

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** Operator angry: stop “try 55/60”; threshold **locked 70%**; other FR outside is good; snaps already did dirty work; **this face engine is fucked up**  
**Tone:** Product truth — no more calibration lectures

---

## Locked (operator)

| Rule | Value |
|------|--------|
| Match threshold | **70% fixed** — do **not** tell operator to lower it |
| UI default / ship intent | **70** (not 75 Facenet leftover, not “try 55”) |
| Agent habit | **Forbidden:** “drop slider to 55” as the fix |

If live same-person scores sit at **~56%**, that is an **engine / embed-path failure against a 70% product bar** — not an operator education problem.

---

## What we agree

- Snapshots already crop usable faces — pipeline dirty work is largely done.  
- Other FR stacks the operator knows **clear same-person** above a serious bar.  
- **~56% on near-identical BWC vs enroll** with threshold **70** = **not acceptable**.  
- Explaining ArcFace “industry 0.4 cosine” while asking to lower the bar = **useless** to this product.

---

## Honest verdict

**Current ONNX path (`buffalo_sc` + our probe/enroll wiring) is not delivering match quality at the locked 70% bar.**

Self-match on the **same enroll file** can be 100% and still be meaningless for ops if **live stills of the same person** cannot clear **70**. That is the bug to treat as **engine/quality**, not threshold.

Possible causes (fix list — not excuses):

| Suspect | Why it can crush live % |
|---------|-------------------------|
| **Weak / small pack** (`buffalo_sc`) | Fast lab pack; may be too weak vs commercial FR |
| **Enroll vs probe path drift** | Different gates, detectors, or crop context between `/represent` and `/represent-probe` |
| **Grab still quality** | Tiny / compressed BWC JPEG into SCRFD even when “near” |
| **Wrong vector flavor** | `normed_embedding` vs raw; any mix across enroll/live |
| **1:N only vs one weak enroll** | Single enroll photo domain ≠ BWC |

**Not the answer:** restart FR, rename Known subjects, hide 0%, lower threshold.

---

## What “good” means (acceptance)

At **threshold = 70%**, with BWC close and same enrolled person:

| Must | |
|------|--|
| Live window score | Typically **≥ 70** (often high 70s–90s), not stuck mid-50s |
| Known subjects | Fires for that person without slider games |
| Stranger | Stays under 70 |

Until that PASS, call the engine path **not ship-ready** for matching — regardless of health “OK.”

---

## Next MOBs (quality at 70% — pick order)

| # | MOB | Purpose |
|---|-----|---------|
| **1** | `mob-fr-threshold-lock-70` | Code + UI default **70**; remove “try lower” from agent/docs habit; min clamp 70 if needed |
| **2** | `mob-fr-match-debug-enroll-vs-live` | One forced score: **latest live crop ↔ enroll photo** logged — prove path |
| **3** | `mob-fr-onnx-pack-upgrade` | Stronger InsightFace pack (e.g. buffalo_l / better recog) — lab bench vs `buffalo_sc` at **70** |
| **4** | `mob-fr-enroll-from-bwc-still` | Enroll/re-embed from BWC snap of subject (same camera family) |
| **5** | `mob-fr-probe-align-enroll` | Same preprocess/gate for enroll + live probe (kill path drift) |

**Recommended start:** **#2** (prove numbers) then **#3** or **#5** (make 70 achievable).  
**#1** if UI/env still defaults 75.

---

## Agent rule (locked)

After this DISC, do **not** reply with “lower threshold to 55/60.”  
If scores are mid-50s at 70% bar → say **engine/path not good enough** and name a **quality MOB**.

---

## Bottom line

Threshold = **70%**, fixed.  
Mid-50s same-person = **failed engine quality**, not operator error.  
Snaps did their job; **recognition stack must clear 70** or we replace/upgrade the pack and align enroll↔probe.

```text
MOB-APPLY mob-fr-match-debug-enroll-vs-live
MOB-APPLY mob-fr-onnx-pack-upgrade
MOB-APPLY mob-fr-threshold-lock-70
```
