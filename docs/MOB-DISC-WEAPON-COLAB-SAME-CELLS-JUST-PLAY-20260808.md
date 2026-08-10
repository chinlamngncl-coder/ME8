# MOB DISC — Same Colab cells? Just click play? (2026-08-08)

**Status:** disc only. No product edit.  
**Ask:** Same Cell 1→7? Can I just click play on Google Colab?

---

## Short answers

| Question | Answer |
|----------|--------|
| Same Cell 1 → Cell 7? | **Yes.** Same recipe. Same seven boxes. |
| Do I rewrite the notebook? | **No** — if your last Colab notebook is still there, **reuse it**. |
| Just click play? | **Yes — the ▶ on each box**, **one after another**, top to bottom. Wait for each to finish. |
| Click “Run all”? | **Better not.** Cell 3 needs you to pick a file. Run-all often skips or fails that step. |

---

## What is different this time (only this)

Upload the **new bigger** zip in Cell 3:

```text
C:\Users\user\Desktop\Enterprise Mobility\ME8\weapon-finetune-dataset\negative_car_bar_pack.zip
```

(~155 pictures, not the old ~61 zip.)

Everything else stays the same: GPU on, Cell 2 has your Roboflow **API key** (and workspace/project/version if that cell still asks), Cell 6 trains, Cell 7 downloads `.pt`.

---

## How you click (human steps)

1. Open your **existing** Colab notebook (GPU).  
2. ▶ **Cell 1** — wait until done.  
3. ▶ **Cell 2** — key still filled? If blank, paste key again. Wait.  
4. ▶ **Cell 3** — when it asks for a file, choose the **new** `negative_car_bar_pack.zip`. Wait until it prints `negatives: …` (should be ~150+, not ~60).  
5. ▶ **Cell 4** → ▶ **Cell 5** → ▶ **Cell 6** (long wait for train).  
6. ▶ **Cell 7** → download `weapon_rfdetr_best.pt`.  
7. Save over `ME8\ai_engine\weights\weapon_rfdetr_best.pt`.  
8. Tell agent: `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`

---

## If you lost the notebook

Open `ai_engine/colab/WEAPON-B-CAR-BAR-COLAB.md` → make **7** code boxes again → paste **code only** (not the English headings) → then ▶ 1 through 7 as above.

---

## Pass check after reload

Black SUV / bull-bar scene → no (or rare) gun toast. Real gun still hits.
