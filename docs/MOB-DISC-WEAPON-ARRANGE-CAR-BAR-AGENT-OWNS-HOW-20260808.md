# MOB DISC — Arrange car/bull-bar fix (agent owns how) (2026-08-08)

**Status:** disc only. No fetch / no train until APPLY.  
**Correction:** You do **not** invent Colab homework. Agent **arranges** what/how. You only: APPLY → (if needed) one Colab **Run** with cells we prepared → PASS/FAIL live.

Sorry for the earlier “you retrain Colab” dump. That was wrong.

---

## Truth (lab limits)

| Fact | Meaning |
|------|---------|
| Lab PC = **no NVIDIA GPU** | Cannot train RF-DETR Medium here |
| Track **B** = Colab / Roboflow → `weapon_rfdetr_best.pt` | Product path (you already got B working with Google) |
| Track **A** smoke | Keep until B PASS; **do not** use A retrain for car/bar |
| Car / bull bar FP | Needs **negatives in B’s dataset** + new B weights on **8769** |

Agent cannot press Colab’s GPU for you without your Google account — but agent **must** prepare data + steps so you only click Run (or paste one notebook we write on APPLY).

---

## Who does what (locked)

| Step | Who | What |
|------|-----|------|
| 1 | **Agent** (APPLY) | Fetch **public** car / SUV / bull-bar / empty-street stills (license-safe) into a B-negatives folder |
| 2 | **Agent** (same or next APPLY) | Pack for Roboflow/Colab: folder layout, README of classes, zip if useful; **do not** ask you to photograph |
| 3 | **Agent** (APPLY) | Write **exact Colab cells** matching **your B method** (RFDETR **Medium**, res **576**, **7** classes, same map Handgun→gun etc.) + “add background/negatives” instruction |
| 4 | **You** | Open Colab → paste/run **our** cells (or reopen **your** notebook and add the zip we built) → download new `weapon_rfdetr_best.pt` into `ai_engine/weights/` |
| 5 | **Agent** (APPLY) | Slim/reload sidecar on **8769**, prove `weights_kind: colab_b`, health OK |
| 6 | **You** | Hard refresh → Weapon watch → car/bar scene → PASS if no gun toast; real gun still hits |

You already know Colab. We do **not** teach Colab from zero. We **arrange the ME8-specific pack + cells + reload**.

---

## How (procedure — when APPLYed)

### A. Negatives pack (agent)

Target folder (on APPLY):

```text
weapon-finetune-dataset/negative_car_bar/
  car_*.jpg
  bullbar_*.jpg
  street_empty_*.jpg
```

Sources: public datasets / CC / Roboflow public only — **no** private customer cams.  
Focus: dark SUVs, metal bumpers, night parking, fixed-cam angles.

### B. Into your B train (same recipe you used)

Your B product load (sidecar already expects):

- `RFDETRMedium`, resolution **576**, `num_classes=7`  
- Classes: Handgun, Knife, Missile, Rifle, Shotgun, Sword, Tank  
- Product map: Handgun/Rifle/Shotgun→gun; Knife/Sword→knife; skip Missile/Tank  

Negatives = **background / no-box** images (or hard negatives with empty annotations) in the **same Roboflow project version** you train from — not a second Track A COCO smoke.

Agent Colab cells will say: upload zip → merge into dataset → train Medium → copy best → `weapon_rfdetr_best.pt`.

### C. Back on lab (agent)

1. Replace `ai_engine/weights/weapon_rfdetr_best.pt`  
2. Delete/rebuild `weapon-sidecar/models/checkpoint_colab_b.pth` slim if needed  
3. Restart Weapon on 8769 once  
4. Prove health `colab_b`

---

## MOB APPLY names (in order)

| # | You type | Agent does |
|---|----------|------------|
| **1 DONE** | `WEAPON-B-FETCH-CAR-BAR-NEGATIVES-V1` | Pack at `weapon-finetune-dataset/negative_car_bar/` (~61 JPGs + zip) |
| **2 DONE** | `WEAPON-B-COLAB-CELLS-CAR-BAR-V1` | Cells: `ai_engine/colab/WEAPON-B-CAR-BAR-COLAB.md` |
| 3 | (you) Run Colab → save new `.pt` into `ai_engine/weights/` | One GPU run |
| 4 | `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1` | Slim + 8769 reload + prove |

Optional later: conf bump only if still FP after new B.

---

## Not this work

- “You go figure Colab alone”  
- Retrain Track A for cars  
- Asking you to shoot negatives with a phone  
- Mixing FR face data  

---

## One next APPLY

`MOB-APPLY WEAPON-B-FETCH-CAR-BAR-NEGATIVES-V1`
