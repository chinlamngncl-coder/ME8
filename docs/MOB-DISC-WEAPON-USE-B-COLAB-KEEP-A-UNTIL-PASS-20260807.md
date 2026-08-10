# MOB DISC — Use B (Colab). Keep A until B PASS. Then delete A (2026-08-07)

**Status:** disc only. Locked operator intent. No code until APPLY.  
**Operator:** Forget A. We have new trained method. Make **B** work. Keep A until B OK, then delete A. Is B Google Colab? Use that.

---

## Got it (locked)

| Item | Decision |
|------|----------|
| Focus | **Track B only** — make Analytics Weapon use it |
| Track A (40-pic smoke / `checkpoint_pistol_smoke.pth`) | **Keep running as fallback** until B satisfies you |
| After B PASS | **Delete A altogether** (smoke weights + A-only train scripts path — named APPLY later) |
| Self-train / fetch negatives for A | **Stop.** Do not push A improvement |
| Colab | **Yes — B is the Google Colab / `ai_engine/train.py` path** → `ai_engine/weights/weapon_rfdetr_best.pt` |

---

## What B is (human)

1. Train in **Google Colab** (GPU) with `ai_engine/train.py` + Roboflow (or whatever you already used).  
2. Output: **`ai_engine/weights/weapon_rfdetr_best.pt`** (lab already has a `.pt` from this morning).  
3. CPU infer prototype: `ai_engine/main.py` on **8770** — **not** what Fleet Recent calls today.  
4. Fleet still talks to **8769** `weapon-sidecar` (`POST /detect` + file path) — that is why B “doesn’t work” in the product yet.

**B trained ≠ B live.** Next work = **wire B into 8769 / poller**, not more A talk.

---

## Make B work (one path)

### Next APPLY (when you say it)

`MOB-APPLY WEAPON-B-COLAB-WIRE-SIDECAR-V1`

Exact job:

1. Load **`weapon_rfdetr_best.pt`** on the engine Fleet already uses (**8769**), **or** make sidecar forward to B with the **same** `/detect` contract Fleet expects.  
2. Prefer **one process on 8769** (no ai_engine stealing the port).  
3. Keep **A file on disk** as fallback switch if B fails health (until you PASS B).  
4. Prove: health shows B/custom Colab weights; Recent gets real `detect_ms` + hits from B; Start = still `START-WEAPON.bat` (or updated bat that starts B-wired engine).  
5. **No** A retrain. **No** delete A in this MOB.

### Later (only after you say B PASS)

`MOB-APPLY WEAPON-DELETE-TRACK-A-SMOKE-V1` — remove pistol smoke preference, A train scripts clutter, etc.

---

## What you start (until wire APPLY)

Today without wire: product still on **A** via `START-WEAPON.bat`.  
After wire APPLY: same bat (or one updated Start) — you should **not** need 8770 for daily Weapon.

---

## Standing

- Forget improving A.  
- B = Colab `.pt`. Use that.  
- Keep A until B OK → then delete A.  
- Next talk/APPLY = **wire B**, nothing else.
