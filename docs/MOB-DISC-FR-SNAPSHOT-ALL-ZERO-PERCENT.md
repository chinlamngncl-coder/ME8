# MOB DISC — All snapshots show 0%

**Status:** **APPLIED 2026-07-13** — `mob-fr-rail-window-score`  
**See also:** `MOB-DISC-FR-WHY-NO-MATCH-ENGINE-OK.md`  
**Date:** 2026-07-13  
**Trigger:** “0% for all snapshot” / see real near-miss %  
**Shipped:** best-of-window `matchProbe` % emitted to Recent even when rolling is on; near-miss % on card + lightbox; fake 0% still hidden.

---

## Plain answer

**0% on every Recent snap is mostly by design — not proof the ONNX engine is dead.**

Rolling snapshots are emitted **before** (or without) a real gallery score. The server hard-sets:

```text
match: false
scorePct: 0
```

on each rolling `fr-crop-tick` (`emitRollingFromCandidate` in `frLivePoller.js`).

The lightbox then shows **Match: 0%** because `0` is a number — so the UI treats it as a real score.

Meanwhile the **window winner** *does* run `matchProbe` and gets a real % — but with `FM_FR_ROLLING_RAIL` on, that scored tick is **not** pushed to the Recent rail. So you never see 73% / 62% on snaps anymore — only faces + **0%**.

| Layer | What happens |
|-------|----------------|
| Rolling grab → Recent | Face crop, **score forced to 0** |
| Best-of-window | Real cosine % computed |
| Rail (rolling on) | **Does not show** that real % |
| Known subjects / alert | Only if % ≥ threshold **and** gallery hit |

So: **snaps OK + 0% everywhere** ≠ engine off. It means **scores are hidden / zeroed on the strip.**

---

## Two meanings of “0%”

| Meaning | How to tell | Action |
|---------|-------------|--------|
| **A. Display zero (rolling)** | Every face card / lightbox = 0%, engine health OK | UX/probe wiring — see MOBs below |
| **B. True zero similarity** | Best-frame probe returns ~0 vs gallery | Enroll / wrong person / dim mismatch |

Your “all snapshot” report fits **A**. Match FAIL can still be **B** or “real % under threshold but invisible.”

---

## Why we zeroed rolling (history)

- Rolling = many faces/sec → matching every grab = CPU storm  
- Clean rail: image-first, no “73.7% no match” spam (`mob-fr-snapshot-rail-clean`)  
- Alarm / Known subjects stay on **thresholded** best-frame only  

That was correct for spam. It is **wrong for debugging** and for trusting “is FR alive?” — operators only see **0%**.

---

## What we should do (options)

### Locked direction (pick when APPLY)

**Show real score when we have one; never fake 0% as “Match: 0%”.**

| # | MOB | Delivers |
|---|-----|----------|
| **1** | `mob-fr-snap-hide-zero-score` | Lightbox/rail: if `scorePct` missing or `0` **and** not a match → show **—** / hide line (quick honesty) |
| **2** | `mob-fr-rail-window-score` | After best-of-window `matchProbe`, attach **real %** to that window’s best crop on Recent (even if &lt; threshold) — near-miss visible again |
| **3** | `mob-fr-rolling-score-sample` | Optional: score **1 of N** rolling grabs (e.g. sharpest only) — costlier |

**Recommend order:** **#1** (stop lying with 0%) then **#2** (see real near-miss % for lab).

**Do not** score every rolling frame by default.

---

## Relation to “engine not working”

| Symptom | Likely |
|---------|--------|
| Health Down | Restart Fleet |
| Faces + **0% on all** | Rolling zero — apply #1/#2 |
| Faces + **real 55–74%** after #2, no Known subjects | Threshold / enroll quality |
| Faces + **real ~0–20%** after #2 vs enrolled you | Wrong gallery / bad enroll / not same person |

---

## Apply cheatsheet

```text
MOB-APPLY mob-fr-snap-hide-zero-score
MOB-APPLY mob-fr-rail-window-score
```

---

## Bottom line

**All snapshots at 0%** = rolling path **writes 0**, UI **displays 0** — not “ONNX returns 0 for everyone.”  
Fix: **don’t show fake 0%**, then **surface best-frame score** on Recent so match lab is honest again.
