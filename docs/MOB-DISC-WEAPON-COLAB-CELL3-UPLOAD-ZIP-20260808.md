# MOB DISC — Colab Cell 3: what to upload and how (2026-08-08)

**Status:** disc only. No code.  
**Ask:** What do I upload in Cell 3? How?

---

## What to upload

**One file only:**

```text
C:\Users\user\Desktop\Enterprise Mobility\ME8\weapon-finetune-dataset\negative_car_bar_pack.zip
```

That zip = car / truck / parking stills (no guns). Cell 5 merges them into your Roboflow train as background.

Do **not** upload the whole ME8 folder. Do **not** upload `.pt` weights in Cell 3.

---

## How (Colab)

1. Finish **Cell 1** and **Cell 2** first (GPU + your Roboflow settings).  
2. Open **Cell 3** (the upload cell — code only, inside the `python` fence).  
3. Run Cell 3.  
4. Colab shows **Choose Files** (or “Browse”).  
5. On your PC, go to the path above → select **`negative_car_bar_pack.zip`** → Open.  
6. Wait until the cell prints something like `negatives: 61` (or similar count).  
7. Then run Cell 4, 5, 6, 7.

If the zip is already on **Google Drive**: put it in Drive, mount Drive in Colab, and set:

```python
NEG_ZIP = Path("/content/drive/MyDrive/negative_car_bar_pack.zip")
```

(then skip the Choose Files upload — only if you know Drive paths).

---

## If Choose Files never appears

- You pasted markdown prose again — re-paste **only** Cell 3’s Python block.  
- Or Runtime disconnected — reconnect GPU, re-run Cell 1–3.

---

## After Cell 7

Download `weapon_rfdetr_best.pt` → save as:

```text
ME8\ai_engine\weights\weapon_rfdetr_best.pt
```

Then: `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`
