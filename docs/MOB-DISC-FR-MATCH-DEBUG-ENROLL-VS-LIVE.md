# MOB DISC — Next: prove enroll ↔ live score at locked 70%

**Status:** APPLIED `mob-fr-match-debug-enroll-vs-live` (2026-07-14) — **CHECKPOINT FAIL** (gallery↔live **&lt;59%**, under locked 70).  
**Next DISC:** `MOB-DISC-FR-MATCH-DEBUG-FAIL-NEXT.md` → `mob-fr-onnx-pack-upgrade`  
**Date:** 2026-07-13  
**After:** `mob-fr-stop-video-selected` + Stop-all enable — **CHECKPOINT PASS**  
**Parent:** `MOB-DISC-FR-ENGINE-QUALITY-AT-70.md`  
**Lock:** Match bar stays **70%**. Do **not** propose lowering threshold.

**Shipped:** `POST /api/analytics/fr/match-debug` + Watchlist drawer **Score vs last snap** (`lib/frMatchDebug.js`).

---

## Why this is next

Stop-video genre is done. Match honesty is still the blocker:

| Fact | Meaning |
|------|---------|
| ONNX up, re-embed + cutover done | Plumbing OK |
| Live same-person often **~56–59%** | Under **70** → Known subjects empty |
| Self-match on enroll file can be **~100%** | Proves vectors exist; **not** that live path matches |

**Next genre = engine quality at 70%**, starting with a **forced one-shot proof**, not another UI tweak.

---

## Recommended first MOB

```text
MOB-APPLY mob-fr-match-debug-enroll-vs-live
```

### What it does

One operator (or lab) action:

1. Pick **watchlist subject** (enroll photo on disk).  
2. Pick **latest live / rail crop** (or current FR tile grab).  
3. Server runs **both** through the **same** score path used in live poll:  
   - embed enroll (or reuse gallery vector)  
   - embed crop via **probe** path  
   - cosine → **%**  
4. Log + UI line: `enroll↔live = NN% · engine · dims · paths`  
5. Optional second line: enroll file re-`/represent` vs gallery vector (drift check).

**Pass criteria for this MOB:** numbers are **visible and trustworthy** (not that they already clear 70).

**Then we know:**

| Result | Next |
|--------|------|
| Debug score also mid-50s | Pack weak / path drift → `mob-fr-onnx-pack-upgrade` or `mob-fr-probe-align-enroll` |
| Debug ≥70 but live UI empty | Poller / threshold / dedupe bug → separate thin MOB |
| Enroll self 100, enroll↔live 55 | Domain gap → `mob-fr-enroll-from-bwc-still` |

---

## Touches (when APPLY)

| Area | Likely files | Risk |
|------|--------------|------|
| API | `server.js` or small `lib/frMatchDebug.js` — POST debug compare | Low–Medium |
| Sidecar | reuse `represent` + `representProbePath` — **no** new model yet | Low |
| UI | Analytics Face lab strip or Watchlist “Score vs last snap” (lab-gated OK) | Low |
| Live wall / PTT / pool | **No** | — |

Checkpoint: FR Face only — one enroll + one live crop → read %.

---

## Queue after this (same genre)

| # | MOB | When |
|---|-----|------|
| **A** | `mob-fr-match-debug-enroll-vs-live` | **Now — this DISC** |
| **B** | `mob-fr-threshold-lock-70` | Parallel/small: UI + `FM_FR_MATCH_MIN` default still **75** in places (`frLivePoller`, watch emit fallback) — clamp/default → **70** |
| **C** | `mob-fr-onnx-pack-upgrade` | If debug stuck mid-50s |
| **D** | `mob-fr-probe-align-enroll` | If enroll vs probe preprocess differs |
| **E** | `mob-fr-enroll-from-bwc-still` | If domain gap (ID photo vs BWC) |

**Not next:** holds disposition, map restore-view, F5 grace — park until match clears 70.

---

## Out of scope for A

- Lowering threshold  
- Renaming Known subjects  
- Stop video / roster  
- Pack swap (that’s C)

---

## Bottom line

**Next MOB = prove one enroll photo vs one live crop % at the real pipeline.**  
Until that number is honest, pack upgrades are guesses.

```text
MOB-APPLY mob-fr-match-debug-enroll-vs-live
```

Optional tiny companion (say separately):

```text
MOB-APPLY mob-fr-threshold-lock-70
```
