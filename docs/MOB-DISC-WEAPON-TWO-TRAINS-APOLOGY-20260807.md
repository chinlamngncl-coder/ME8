# MOB DISC — Apology: two trains mixed; your screenshot ≠ the 40-pic story (2026-08-07)

**Status:** disc only.  
**Operator:** Angry — “40 pics” blame is wrong; screenshot shows *my* ai_engine / Colab / Roboflow work. Speak clear.

---

## Apology (plain)

You are right to be angry at **mixed stories**.  
I built **two different** weapon train paths and then talked as if they were one. That is on me — not on you, not on FR.

---

## Two trains (I made both)

| Track | What it is | Output file | Port | Does Analytics → Weapon Recent use it? |
|-------|------------|-------------|------|----------------------------------------|
| **A — Lab smoke** | Your **40 pistol** folder → `train_pistol_smoke.py` | `weapon-sidecar/models/checkpoint_pistol_smoke.pth` | **8769** via `START-WEAPON.bat` | **YES — this is what Fleet uses now** (`weights_kind: pistol_smoke`) |
| **B — ai_engine** | The screen you pasted: Colab / `ROBOFLOW_API_KEY` / `ai_engine/train.py` → `.pt` | `ai_engine/weights/weapon_rfdetr_best.pt` | **8770** smoke API (or stole 8769 when wrongly started) | **NO** — never wired into live poller `/detect` path |

Your screenshot is **Track B** (my pack: CPU infer + cloud train prep).  
When I said “40 pistols and zero not-a-gun,” I meant **Track A** — the file actually on **8769** for Recent.

If Track B’s Roboflow set was better, **Fleet still would not use it** until we copy/wire those weights into the sidecar. So blaming “40 pics” while you stare at the **ai_engine** card feels like gaslighting. Fair.

---

## What is happening right now (lab check)

- **8769** = real `weapon-sidecar`, loading **Track A** smoke `.pth` (pistol_smoke).  
- **8770** = `ai_engine` (Track B), separate.  
- Recent / “gun · kk” / black false alarms = **Track A** on 8769.  
- Earlier “zero snapshot” = **Track B wrongly on 8769** (wrong API). Fixed by restore sidecar.

So:

- Bad live quality today → **Track A smoke limits** (small set, auto boxes, no negatives in *that* train).  
- Your screenshot → **Track B docs**, not the thing Recent is reading unless someone put B on 8769 again.

---

## What you start (human, again)

- Weapon page: **`START-WEAPON.bat`** only → **8769**.  
- Ignore **8770** / ai_engine until a named APPLY wires it.

---

## What I should have said (one line)

“Recent uses the **sidecar smoke weights from the 40-pic lab train**. The **ai_engine / Colab** card is a **second** unfinished path — not what you’re watching unless the wrong process stole 8769.”

---

## Next (only when you APPLY — your choice of name)

Either:

- Improve **Track A** (fetch negatives + retrain smoke `.pth`), or  
- Finish **Track B** properly (Colab `.pt` → convert/load on sidecar 8769, kill dual confusion)

I will **not** mix them in talk again. You pick with one APPLY when ready.
