# MOB DISC — Weapon: still bad after knobs — is this the ceiling? (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Operator:** shotgun / long gun / anything still quite bad; false **knife**; captures **blurry** and not accurate. *Is that the best it can do?*

---

## Straight answer

**For this off-the-shelf stack: yes — we have hit the knob ceiling.**

What we already tried:

- Apache RF-DETR Threat weights (research card — not deployment gospel)  
- Context crop + magnify  
- Faster still poll  
- Gun 0.50 → 0.40 → **0.35**  
- Knife 0.55 → **0.42**

More conf tweaks will **not** turn this into a solid shotgun / knife product. Lower floors make **more jokes** (tools → knife, phone → gun), not sharper truth.

Your lab result (blurry Recent, wrong class, many replays) matches the HF author warning + still-from-FLV limits. That is not you failing the test.

---

## Why it looks like a joke

1. **Weights** — one “Gun” + “Knife” research fine-tune. Weak on BWC motion, shoulder shotgun, blade at distance.  
2. **Input** — one JPEG every ~2s from live FLV (ffmpeg grab ~1s). Motion blur / soft frames → model guesses.  
3. **Confirm** — needs 2 hits; bad frames still become Recent when conf clears the floor.  
4. **Crop** — wide context of a **blurry** still is still blurry.

Live tile can look OK while Recent is garbage: tile is continuous video; detect is **lucky stills**.

---

## What “best of best” still means (legal)

| Path | Honest outcome |
|------|----------------|
| More threshold MOBs | **Stop.** Diminishing / harmful |
| Ultralytics YOLO shotgun kits | **Banned** (AGPL) |
| Bigger RF-DETR (Small/Large) same Threat weights | Slight help possible; **same data gap** |
| **Sharper still grab** (higher quality JPEG, longer FLV sample) | Less blur → fewer jokes; **not** magic accuracy |
| **Fine-tune RF-DETR on your lab stills** (gun / shotgun / knife / hard negatives) | **Only real “best”** for *your* cams — days/weeks of labeling |
| Park Weapon detect as **demo / engine OK** until fine-tune | Honest product face |

---

## Recommendation (one path)

Do **not** APPLY another conf MOB tonight.

**Product choice (you pick with APPLY later):**

### A — Recommended if you still want this week’s UX better
**`WEAPON-STILL-SHARP-GRAB-V1`**  
Spend budget on a **cleaner JPEG** (quality / short settle), keep floors as now. Expect **less blur**, not rifle-range magic.

### B — Recommended if you want real accuracy (best of best)
**`WEAPON-RFDETR-FINETUNE-LAB-PLAN-V1`** (disc + schedule)  
You record / export stills of shotgun, long gun, knife, empty hands, tools. We train Apache RF-DETR Nano on that. Ship new weights. **This is the only honest upgrade past “research demo.”**

### C — Park
Leave engine OK + shell; no more detect polish until B. No fake marketing.

I recommend **B as the real fix**, **A only if blur is the main insult**. Conf is done.

---

## APPLY when you choose

- Soften blur: `MOB-APPLY WEAPON-STILL-SHARP-GRAB-V1`  
- Real accuracy: `MOB-APPLY WEAPON-RFDETR-FINETUNE-LAB-PLAN-V1` (paper first is fine)  
- Or say **park** — we stop Weapon detect MOBs.
