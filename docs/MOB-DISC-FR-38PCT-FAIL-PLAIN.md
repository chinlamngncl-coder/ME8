# MOB DISC — FR quality FAIL (38%) · raw Score text · snap slow

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-14  
**Tone:** Operator is done with jargon. Answers in **desk language** only.

---

## What just happened (one screen)

You ran **Score vs last snap** again.

| What matters | Number | Plain |
|--------------|--------|--------|
| Match strength | **38.5%** | **FAIL** — under the locked **70%** bar |
| Saved face vs live | Same **38.5%** | Engine and live face are not close enough |
| Fingerprint health | drift **100%** | Saved person record is consistent — **not** a corrupt list |

**Verdict:** The “stronger engine” change did **not** help. Tonight’s score is **worse** than earlier mid‑50s / ~66%. Treat pack upgrade as **lab FAIL**. Do not keep chasing the same pack hoping it suddenly clears 70.

---

## Three separate problems (don’t mix them)

### 1) Match still useless at 70%
Face match is **not ship-ready**. Snaps can show a face; **recognition still fails** the product bar.

### 2) Score card still shows raw junk
Lines like engine names, file names, “dims g/p” are **builder text**. Operator should see something like:

> **Match: 39% — need 70% — fail**

That cleanup is a **UI MOB** (not done). Agreed: current card wastes time and looks broken.

### 3) Snapshot / Recent feeling slow again
Separate from the % number. Grabbing stills for the rail feels sluggish. **Park** unless you name a snap-speed MOB — don’t stack it into match % tonight.

---

## What we should **stop** doing

- More pack experiments without a clear PASS/FAIL rule  
- Pasting health JSON / file names at the operator  
- Asking you to “understand” internal engine names  
- Suggesting you lower the **70%** bar  

---

## Honest options next (you pick)

| Choice | Plain English | When you say |
|--------|----------------|--------------|
| **A — Undo the engine change** | Put face engine back to how it was before tonight’s upgrade (may not clear 70, but stop the worse 38% path) | `MOB-APPLY mob-fr-onnx-pack-rollback` |
| **B — Human Score card** | Replace raw Score text with one clear line: percent · need 70 · pass/fail | **APPLIED** `mob-fr-score-result-plain` (2026-07-14) |
| **C — Enroll from bodycam face** | Add/update person using a **camera face**, not only a phone/ID photo — often needed when ID vs bodycam never clears a hard bar | `MOB-APPLY mob-fr-enroll-from-bwc-still` |
| **D — Park FR match** | Leave live snaps as-is; **stop** match quality MOBs until you have time / another engine vendor | `PARK fr-match-quality` |

**Recommended order if you continue tonight:** **B** (stop the insulting Score card) then **A** (undo bad pack) or **D** (park).  
**C** only if you still want to fight for ≥70 with this stack.

---

## Checkpoint record

| Item | Result |
|------|--------|
| Match at locked 70% | **FAIL** — **38.5%** |
| Pack upgrade helped? | **No** |
| Operator trust | **Broken** — raw UI + slow snap + low % |

---

## Bottom line

**38% = fail. Stronger pack = waste for this test.**  
Next is your call: **plain Score UI**, **undo pack**, **bodycam enroll**, or **park FR match**.

No code until you type a **MOB-APPLY** or **PARK**.
