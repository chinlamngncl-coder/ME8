# MOB DISC — Colab GPU limit: park train, do ops next (2026-08-08)

**Status:** disc only. **Colab BOTH train PARKED** until GPU quota returns.  
**Reminder:** Agent will nudge **Monday 2026-08-10 ~morning (lab local)** — or earlier if you open chat Sunday and say “GPU free.”  
**Do not** nag every session about Colab — only that reminder tick + if you ask.

---

## What’s ready (waiting on you + GPU)

| Item | Where |
|------|--------|
| Hard negatives zip | `weapon-finetune-dataset/negative_car_bar_pack.zip` |
| Knife positives zip | `weapon-finetune-dataset/positive_knife_pack.zip` |
| Colab cells (locked checklist) | `ai_engine/colab/WEAPON-B-BOTH-COLAB.md` |

When GPU is back:

1. Open BOTH guide → ▶ Cell 1–7 (API key; upload **both** zips).  
2. Overwrite `ai_engine/weights/weapon_rfdetr_best.pt`.  
3. `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`

Until then: **no** reload APPLY for a new train (nothing new to load).

---

## Do **now** (no GPU) — arranged order

| # | APPLY when you say it | What |
|---|------------------------|------|
| **1 next** | `MOB-APPLY WEAPON-ALERT-HISTORY-RETRIEVE-V1` | After Accidental Ack: find hit again / re-open |
| 2 | `MOB-APPLY WEAPON-CASE-ADDON-AUDIT-V1` | Add-on note; every touch = **time + username** |
| 3 | `MOB-APPLY WEAPON-ADDON-SUPERADMIN-GATE-V1` | Which add-ons need Super Admin |
| later | FP button / Report / HQ sounds / faster snap | After history+addon PASS |

**Recommendation:** start with **history retrieve** — unblocks Accidental Ack without waiting on Colab.

---

## Parked (do not jump)

- Colab BOTH train (GPU limit)  
- Track A retrain  
- Conf bump unless you ask as band-aid  

---

## Reminder text (for Monday tick)

> Colab GPU: packs + `WEAPON-B-BOTH-COLAB.md` ready. If quota is back → run Cell 1–7 → drop `.pt` → `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`. Ops queue may already be on history/addon.
