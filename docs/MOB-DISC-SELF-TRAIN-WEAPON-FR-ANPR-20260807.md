# MOB DISC — Self-train Weapon? FR? ANPR? (2026-08-07)

**Status:** disc only. No code. No APPLY.  
**Operator:** What does `WEAPON-FINETUNE-DATASET-LAYOUT-V1` mean? Can we self-train? What about Face and especially ANPR?

---

## Weapon — yes, real self-train (Apache)

**Yes.** That is what “best” means for Weapon.

| Piece | Meaning |
|-------|---------|
| **LAYOUT MOB** | I only create folders + a short “put photos here” note. **No training yet.** |
| **You** | Drop JPEGs: long gun, shotgun, pistol, knife, empty/negative. |
| **TRAIN MOB** | We run RF-DETR Nano **fine-tune** on that set (Apache). New `.pth` weights. |
| **SWAP MOB** | Weapon sidecar uses **your** weights instead of the public research file. |

So: not magic cloud AI. **You teach the same legal engine on your cameras / your weapons.** After that, live detect uses **your** model.

`MOB-APPLY WEAPON-FINETUNE-DATASET-LAYOUT-V1` = step 1 only (folders). Training is a later named APPLY when folders are full.

---

## Face (FR) — different kind of “train”

| What you already have | What it is |
|-----------------------|------------|
| **Known Subjects / watchlist enroll** | You add face photos → gallery embeddings. That **is** “teaching who to alarm on.” |
| **Full retrain of Seeta / FR CNN** | **Not** the same easy path as Weapon folders. Vendor engine + enroll pipeline. We do **not** offer a casual “drop 100 faces and retrain the whole FR backbone” MOB like Weapon RF-DETR. |

So for Face: **enroll people** = yes, product today. **Fine-tune the face neural net from scratch on your data** = not the same open Apache DIY as Weapon. Don’t expect a Weapon-style LAYOUT→TRAIN for FR unless we open a separate big project later.

---

## ANPR — especially important (honest)

| What you already have | What it is |
|-----------------------|------------|
| **Plate lists** (suspicious / wanted / blacklist) | Teach **which plates** matter — not how to read shapes. |
| **Engines** (FastALPR live; HyperLPR / dual on heavy CCTV) | Pretrained readers. Region / pipeline tuning. |
| **Self-train a new plate OCR on your country plates** | **Possible in theory**, hard in practice: need large labeled plate crops, train time, and **license-clean** trainers (no Ultralytics AGPL sneak-in). |

**Honest ceiling today:** ANPR “gets better” mainly by:

1. Better stills / live path (already many MOBs)  
2. Right engine for the job (FastALPR vs dual heavy)  
3. Plate list / match rules  
4. Optional later: **custom plate-detect or OCR fine-tune** on **your** plate crops — only with **MIT/Apache** stack, as its own genre (not Weapon copy-paste)

There is **no** one-click “ANPR-FINETUNE-DATASET-LAYOUT” ready like Weapon tonight. We can **paper** an ANPR fine-tune plan when you want that genre — after Weapon train is rolling or instead, your call.

**ANPR is not “we cannot improve.”** It is “improvement ≠ same RF-DETR photo-folder MOB.” Weapon is the first analytics surface where **open Apache fine-tune on your stills** is the clear next accuracy path.

---

## One-line summary

| Analytics | Self-train like Weapon folders? |
|-----------|----------------------------------|
| **Weapon** | **Yes** — LAYOUT → you fill → TRAIN → SWAP |
| **Face** | Enroll gallery **yes**; full CNN fine-tune **not** that MOB |
| **ANPR** | Lists + engines **yes**; custom OCR/detect train **later, separate plan**, license-careful |

---

## What you say next

- Start Weapon data folders: **`MOB-APPLY WEAPON-FINETUNE-DATASET-LAYOUT-V1`**  
- Want ANPR fine-tune paper next: say **Mob disc ANPR fine-tune plan** (no APPLY until you name it)  
- Face: keep using Known Subjects enroll; say if you want a separate FR-train disc later
