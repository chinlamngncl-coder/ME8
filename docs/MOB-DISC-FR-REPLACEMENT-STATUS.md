# MOB DISC — Is FR replacement up? (status + suggested next)

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** Operator: “is my FR replacement up?” + want habit of **suggestion** after status  
**Search:** FR replacement, ONNX up, DeepFace backup, re-enroll, cutover  
**Related:** `MOB-DISC-FR-ENGINE-LAB-ENABLE-ONNX.md`, `MOB-DISC-FR-ENGINE-PRIMARY-BACKUP.md`, `MOB-DISC-TECH-HEALTH-FR-ENGINE.md`

---

## Short answer

| Question | Answer |
|----------|--------|
| Is the **fast FR engine wired and selected in lab**? | **Yes** — lab `.env` has `FM_FR_ENGINE=onnx`; `fr-sidecar-fast` on **8766**; Platform health can show **FR engine: OK** |
| Is replacement **fully done** (match + ship)? | **No** — DeepFace still the **code default**; old watchlist embeddings are wrong dim until **re-enroll**; ship cutover not done |

**One line:** Lab primary path is **up**; matching + ship default are **not finished**.

---

## Scorecard (honest)

| Layer | State | Verdict |
|-------|--------|---------|
| Fast sidecar code (`fr-sidecar-fast/`) | Built (ONNX pack) | **Up** |
| Lab flag `FM_FR_ENGINE=onnx` | Set in ME8 `.env` | **Up** |
| Auto-start `FM_FR_SIDECAR_AUTO=1` | On | **Up** |
| Batch probe + faster grab | APPLIED | **Up** |
| Platform health **FR engine** card | APPLIED | **Up** (visibility) |
| Watchlist re-enroll on new embed | `mob-fr-gallery-re-enroll-migrate` | **APPLIED 2026-07-13** — Analytics Watchlist → **Re-embed gallery** (backup JSON; photos kept) |
| Code/ship default = onnx | `mob-fr-engine-cutover` | **APPLIED 2026-07-13** — default `onnx`; rollback `FM_FR_ENGINE=deepface` |
| Side-face / walking BWC gate | `mob-fr-probe-side-face-gate` | **Parked** |
| Seeta primary | Reserved | **Not wired** |

```
DeepFace (backup :8765)  ←── rollback only
         ▲
Lab now: ONNX primary (:8766)  ←── YOU ARE HERE for runtime
         │
         ├── need: re-enroll gallery  → honest matches
         └── later: cutover default  → ship packs without hand-editing .env
```

---

## What “up” means for you today

If after restart **FR engine → OK** and face watch snaps feel faster:

- Replacement **runtime** = **up** (lab).
- If hits are still rare after that → almost always **old DeepFace embeddings** still in gallery → **re-enroll** before blaming the engine again.

---

## Suggested next (habit)

**Suggested next MOB (pick one):**

1. Run **Re-embed gallery** in Analytics Watchlist (if not yet) + live walk-test match PASS.  
2. **`MOB-APPLY mob-fr-engine-cutover`** — only after match PASS.  
3. Optional: `mob-fr-probe-side-face-gate` if walking side-face still misses.

**Suggestion locked for this reply:** after re-embed, live walk-test; then cutover when PASS.

---

## Habit (agent)

After FR / health status questions: end with **one clear suggested next MOB** (or “test X first”), not a laundry list dump.

---

## No code in this DISC
