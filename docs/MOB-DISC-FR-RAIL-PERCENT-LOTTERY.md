# MOB DISC — Same-looking snaps: one has %, one blank (confusing)

**Status:** **APPLIED 2026-07-13** — `mob-fr-rail-scored-only` · **CHECKPOINT PASS**  
**Date:** 2026-07-13  
**Trigger:** Operator: almost same pic — one has %, one does not — confusing.  
**Shipped:** Recent = window-scored cards only (each with real %). Rolling faces no longer emit to the rail (ledger save may continue). Rollback: `FM_FR_RAIL_SCORED_ONLY=0`.

---

## Plain answer

**You are right — that UI is confusing.**  
Two thumbs that look the same, one stamped **56%** and one **empty**, reads as broken. It is **not** “human eye vs AI magic.” It is **our rail mixing two different pipelines in one grid.**

| Card type | How it got there | % shown? |
|-----------|------------------|----------|
| **Rolling face** | Every usable grab → Recent | **No** (by design) |
| **Window score** | Best grab in the poll window → `matchProbe` → Recent | **Yes** (real cosine×100) |

Same face, same second, two cards: one is “we saw a face,” one is “we scored this still against the watchlist.”  
**The grid does not label which is which** → looks insane.

---

## What it is *not*

- Not “this frame matched / that frame didn’t” in a way a human can see.  
- Not proof one pic is a stranger and the twin is you.  
- Not fixed by threshold talk (threshold stays **70%** — separate quality DISC).

---

## Locked product problem

**Recent must not look like a random % lottery on identical faces.**

---

## Fix directions (pick one when APPLY)

### A — **Score strip only** (clearest)

Recent = **only** frames that were scored (window winners).  
Rolling faces → drop from Recent **or** move to a quieter place.  
**Pros:** Every thumb with a face either has % or isn’t there.  
**Cons:** Fewer snaps (less “flood”).

### B — **Label the two kinds** (keep flood)

Keep rolling + scored, but mark scored cards clearly, e.g. badge **Score** / **ID check**, and never leave a bare twin with no explanation.  
**Pros:** Keep density.  
**Cons:** Still two pipelines; must be visually obvious.

### C — **Score every Recent card** (heavy)

Run matchProbe on each rolling grab.  
**Pros:** Every pic has %.  
**Cons:** CPU; may lag — usually reject for live wall.

### D — **One card per window** (merge)

Don’t push rolling thumbs; only push the window best **with %** (back toward pre-rolling rail).  
**Pros:** Simple.  
**Cons:** Less continuous strip (you previously wanted rolling).

---

## Recommendation

**A or D** if confusion must die.  
**B** if you refuse to lose rolling density.

Agent default if you say “just fix the confusion”:

```text
MOB-APPLY mob-fr-rail-scored-only
```

= Recent shows **only scored window frames** (each with %). Rolling no longer pollutes the same grid unlabeled.

Optional lighter:

```text
MOB-APPLY mob-fr-rail-score-badge
```

= Keep rolling; scored cards get an explicit **Score** chip so blank ≠ “broken twin.”

---

## Bottom line

Same-looking pics, one % / one blank = **two pipelines, one unlabeled grid** — bad UX, your call-out is correct.  
Fix the **rail contract**, not the threshold.

```text
MOB-APPLY mob-fr-rail-scored-only
MOB-APPLY mob-fr-rail-score-badge
```
