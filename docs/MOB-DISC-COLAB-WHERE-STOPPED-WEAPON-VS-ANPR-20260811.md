# MOB DISC — Colab where we stopped (Weapon vs ANPR) — 2026-08-11

**Status:** Fact check. **No code this turn.**  
**Read:** `.cursorrules` · one genre at a time.

---

## Short answer

| Question | Answer |
|----------|--------|
| Where did we stop? | **ANPR Colab plan locked** (`ANPR-COLAB-PLAN-V1`). Weapon Track B parked until after ANPR detect PASS. |
| Have we finished Weapon? | **Not closed in ME8** until: (1) you finished Colab train, (2) weights in `ai_engine/weights/`, (3) **`MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`**, (4) lab PASS. Overnight brief assumed you would finish Colab “when back” — that is **your** GPU step, not an agent APPLY done while you slept. |
| Is it ANPR now? | **Operator override 2026-08-11:** ANPR Colab **first**; Weapon touch-up **later**. |

---

## Weapon Track B — checklist

| Step | Status |
|------|--------|
| Colab recipe locked | **Yes** — `ai_engine/colab/WEAPON-B-BOTH-COLAB.md` (negatives + knife packs) |
| You ran Colab GPU train | **You confirm** (agent cannot see your Colab run) |
| `weapon_rfdetr_best.pt` overwritten under `ai_engine/weights/` | **You confirm** on disk |
| `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1` | **Not done** in this chat (no APPLY recorded) |
| Lab PASS (fewer car FP, knife still hits) | **Pending** after reload |

If Colab is **already done** on your side → park until after ANPR PASS, then:

```text
MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1
```

Weapon Colab can wait — **ANPR detect Colab is current.**

---

## ANPR Colab — where it sits

| Step | Status |
|------|--------|
| `MOB-APPLY ANPR-COLAB-PLAN-V1` | **DONE** — `docs/MOB-DISC-ANPR-COLAB-PLAN-V1-APPLY-20260811.md` |
| Colab cells | **`ai_engine/colab/ANPR-DETECT-COLAB.md`** (Track A = plate detect → ONNX) |
| Dataset stash | `anpr-finetune-dataset/` |
| You run Colab GPU | **Pending** |
| `MOB-APPLY ANPR-WEIGHTS-RELOAD-V1` | **After** ONNX on disk |

Weapon reload stays **after** ANPR detect PASS.

---

## One next step

1. Label / export plate boxes → run **`ANPR-DETECT-COLAB.md`** on GPU.  
2. Overwrite `anpr-sidecar/models/plate_yolo11n.onnx` → restart **8768**.  
3. `MOB-APPLY ANPR-WEIGHTS-RELOAD-V1` → lab smoke → PASS.
