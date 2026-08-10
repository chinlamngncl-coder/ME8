# MOB DISC — Do the real best: fine-tune RF-DETR on your lab (2026-08-07)

**Status:** disc only. No code until APPLY.  
**No more threshold mumbling. No YOLO. Apache only.**

---

## What we will do (one sentence)

**Train our own Apache RF-DETR Nano weights on your BWC stills** (shotgun, long gun, knife, hard negatives), then **swap** them into `weapon-sidecar` and ship that as the Weapon engine.

That is the real “best.” Off-the-shelf Threat weights stay a demo until this is done.

---

## What YOU do (operator — not tech)

You do **not** write code. You collect pictures.

1. Keep `START-WEAPON.bat` / ME8 as now for capture help later.  
2. From **already-live** cams (Ops open), get **stills** of:

| Folder (we will make these) | What to put in |
|-----------------------------|----------------|
| `gun_long` | Long rifle / long firearm clear in frame |
| `gun_shotgun` | Shotgun / short long-gun carry (shoulder, walk, side) |
| `gun_pistol` | Handgun if you use it |
| `knife` | Long knife + short knife (hand, belt, table) |
| `negative` | Same scenes **without** weapon: empty hands, phone, broom, tools, fence |

3. Aim for **lab v1:** about **80–150 images per weapon folder**, **100+ negatives**. More is better; less than ~40/class will stay weak.  
4. Mix: close, far, blur, outdoor, indoor, one person walking.  
5. Export as **JPEG/PNG**. Naming does not matter; folders do.

You can also freeze Weapon Recent crops that were **wrong or right** into those folders later — we will tell you where to drop them after MOB 1.

**Time:** one focused lab session (or a few) filming / pausing video. Not months.

---

## What I do (after you APPLY)

| Step | MOB | What happens |
|------|-----|----------------|
| 1 | `WEAPON-FINETUNE-DATASET-LAYOUT-V1` | Create folders + short README in ME8 (where to drop images). No training yet. |
| 2 | You fill folders | You say when ready. |
| 3 | `WEAPON-FINETUNE-TRAIN-RFDETR-V1` | Train RF-DETR Nano Apache on that set; write new `.pth` under `weapon-sidecar/models/`. |
| 4 | `WEAPON-FINETUNE-SWAP-WEIGHTS-V1` | Point sidecar at new weights; restart; you PASS shotgun / knife / long gun on live. |

Also still owed when you want UX (separate): `WEAPON-LIVE-KEEP-AND-FAST-OPEN-V1` (don’t kill Ops live; don’t need refresh). **Accuracy = fine-tune. UX = keep/fast.** Different MOBs.

---

## What you get after PASS

- Same Weapon tab / Recent / already-live rules  
- **Your** gun/shotgun/knife behavior on **your** cameras  
- Still Apache-2.0 — no Ultralytics  

What you will **not** get overnight: 100% perfect CCTV magic. You get **lab-fit** that is actually trainable and honest.

---

## First APPLY (do this next)

**`MOB-APPLY WEAPON-FINETUNE-DATASET-LAYOUT-V1`**

I create the drop folders + one-page “put photos here” only.  
Then you fill them. Then you APPLY train.

---

## Parallel if live keeps dying

**`MOB-APPLY WEAPON-LIVE-KEEP-AND-FAST-OPEN-V1`**  
(anytime — does not replace fine-tune)
