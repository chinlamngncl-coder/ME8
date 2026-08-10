# MOB DISC — Human: we already trained — what’s wrong / which Start (2026-08-07)

**Status:** disc only.  
**Operator:** We already trained. How bad? What’s happening? Wrong server? Which one do I start? Speak human.

---

## Yes — we already trained

A few messages ago: **40 pistol photos** → smoke weights file:

`weapon-sidecar/models/checkpoint_pistol_smoke.pth`

That file is real. Training finished. The Weapon sidecar **is using it** when health says `weights_kind: pistol_smoke`.

---

## So how can it still be bad?

Training “score” was on **those same kinds of stills** (auto boxes, no “not a gun” photos).

Live video is harder: garage, black clothes, TV text, hands, different angles.  
With **zero negative pictures**, the model learned “dark shape ≈ gun.”  
So: **false alarms on black / screen**, and **miss or flicker** on a real pistol that doesn’t look like the 40 train shots.

**Trained ≠ ready for ops.** Smoke train ≠ finished product.

---

## Did we start the wrong server? (yes, for a while)

| Port | What | For Analytics → Weapon? |
|------|------|-------------------------|
| **8769** | Must be **`weapon-sidecar`** (`START-WEAPON.bat`) | **YES — this is the only one Fleet uses** |
| **8770** | `ai_engine` lab toy (different API) | **NO — ignore for daily Weapon** |

Earlier, **8769 was stolen by `ai_engine`**. Then Recent was empty / useless (`detect` in 3 ms, 0 hits).

We fixed that: **8769 = weapon-sidecar again** + your smoke weights.  
If health is `pistol_smoke` / `rfdetr-threat-apache` shape → **right server**.  
If health mentions `ai_engine\weights\…` on 8769 → **wrong again**.

---

## Which server should **you** start? (human)

**Every day for Weapon page:**

1. Fleet already running (`RESTART-FLEET` / service) — dashboard.  
2. Double-click **`START-WEAPON.bat`** — leave that window open.  
3. Browser → Analytics → Weapon → Start watch.

**Do not** start `ai_engine` for normal Weapon.  
**Do not** use port 8770 for the product page.

WVP / live video is separate (`START-WVP-LAB` if live is dead) — not the Weapon detector.

---

## One line

**Right Start = `START-WEAPON.bat` (8769).**  
**Already trained = weak smoke (no negatives), not “wrong Start” anymore.**  
Next quality step (when you want) = me fetch negatives + retrain — you already know that APPLY name.
