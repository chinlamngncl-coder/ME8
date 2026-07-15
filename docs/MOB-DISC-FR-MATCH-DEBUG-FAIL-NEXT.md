# MOB DISC — Match-debug FAIL (&lt;59%) → next quality step at locked 70%

**Status:** CHECKPOINT FAIL recorded → **APPLIED** lab `mob-fr-onnx-pack-upgrade` (2026-07-14)  
**Legal:** See `MOB-DISC-FR-ONNX-PACK-COMMERCIAL-LICENSE.md` — buffalo_* **non-commercial** without paid InsightFace model license; lab proof ≠ ship.  
**Date:** 2026-07-14  
**Trigger:** Operator **CHECKPOINT FAIL** on `mob-fr-match-debug-enroll-vs-live` — score **did not clear ~59%** (same person, forced gallery ↔ live probe).  
**Lock:** Threshold stays **70%**. Do **not** propose lowering the bar.

---

## Verdict (plain)

**Debug did its job. The engine path failed the product bar.**

| What we proved | Meaning |
|----------------|---------|
| API + drawer score ran | Plumbing OK — not a “UI empty” bug |
| Gallery ↔ live probe **&lt;59%** | Same path live poller uses — **under 70** honestly |
| Known subjects empty at 70 | Expected — math agrees with the desk |

Snaps / crops are not the scapegoat anymore. **Recognition quality at 70% is not ship-ready** on current `buffalo_sc` lab pack + enroll/probe wiring.

**Forbidden reply:** “try 55/60 on the slider.”

---

## What the number means

Forced compare uses:

1. **Gallery embedding** (stored at enroll / re-embed)  
2. **Live snap** → `/represent-probe`  
3. Same **cosine → %** as `matchProbe`

So **&lt;59%** is not “rail lottery” or “wrong card.” It is the real 1:1 strength of **this stack** on **ID/enroll photo vs BWC crop**.

Optional second lines from the drawer (if shown):

| Line | If… | Suggests |
|------|-----|----------|
| Fresh enroll ↔ live also &lt;60 | Same weakness after re-`/represent` | Pack / domain, not stale gallery vector |
| Enroll↔gallery drift ~100 | Gallery vector healthy | Not a corrupt index |
| Enroll↔gallery drift low | Stale / wrong dims | Re-embed again, then re-debug |
| Dim mismatch | Engine mix | Fix engine/dims before pack talk |

*(If you still have the exact drawer lines — paste once; not required to pick next MOB.)*

---

## Root-cause shortlist (fix)

| Rank | Suspect | Why |
|------|---------|-----|
| **1** | **Weak pack** (`buffalo_sc`) | Fast lab model; commercial FR the operator trusts clears a real bar — we don’t |
| **2** | **Domain gap** | Clean enroll photo ≠ BWC angle/compress/IR; mid-50s classic for that |
| **3** | **Enroll vs probe drift** | `/represent` (enroll) vs `/represent-probe` (live) different gates/crops |
| **4** | Grab still soft | Less likely now — debug used an actual ledger crop that already passed detect |

---

## Next MOB (recommended)

```text
MOB-APPLY mob-fr-onnx-pack-upgrade
```

**What:** Switch primary ONNX pack lab → stronger InsightFace pack (e.g. **`buffalo_l`** or next proven recog), keep API shape, **re-embed gallery**, re-run **Score vs last snap** at **70**.

**Accept:**

| Must | |
|------|--|
| Same person, close BWC | Debug **≥ 70** (prefer high 70s+) |
| Stranger crop | Stays **&lt; 70** |
| Health | Sidecar still UP; no wall/PTT touch |

**Risk:** Medium — sidecar + models + **must re-embed** after pack change. Not Ops wall / pool.

---

## Parallel / follow if pack alone isn’t enough

| MOB | When |
|-----|------|
| `mob-fr-enroll-from-bwc-still` | Pack helps but ID-photo domain still kills % — enroll from a BWC snap of the subject |
| `mob-fr-probe-align-enroll` | Fresh enroll % ≠ gallery↔probe or preprocess differs |
| `mob-fr-threshold-lock-70` | Small hygiene — UI/env still default **75** in places (does **not** fix mid-50s) |

**Not next:** holds UX, map restore, F5 grace, lowering threshold.

---

## Agent rule

On mid-50s / “crazy failed” at 70:

- Say **engine/pack not good enough**  
- Name **`mob-fr-onnx-pack-upgrade`** (or enroll-from-BWC if user prefers domain-first)  
- **Never** “drop threshold”

---

## Bottom line

Checkpoint **FAIL** = proof, not confusion.  
**&lt;59% same-person** at locked **70%** → upgrade recognition pack (then re-debug).  

```text
MOB-APPLY mob-fr-onnx-pack-upgrade
```
