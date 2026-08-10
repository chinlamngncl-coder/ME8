# MOB DISC — Colab cells: how you actually run 1→7 (plain) (2026-08-08)

**Status:** disc only.  
**Anger is fair.** Here is the simple way — no mumble.

---

## What “Cell 1 to 7” means

In Colab you must have **seven separate code boxes**, not one giant paste.

```
[ Cell 1 ]  ← box 1
[ Cell 2 ]  ← box 2
[ Cell 3 ]  ← box 3   ← THIS is “Cell 3”
[ Cell 4 ]
[ Cell 5 ]
[ Cell 6 ]
[ Cell 7 ]
```

**Cell 3** = the **third box** down the page.  
It is the box whose code starts with uploading `negative_car_bar_pack.zip`.

---

## How to set it up (once)

1. Colab → **Runtime** → GPU.  
2. Click **+ Code** seven times (seven empty boxes).  
3. From `WEAPON-B-CAR-BAR-COLAB.md`, copy **only the python code** under “Cell 1” into box 1.  
4. Same for Cell 2 → box 2, Cell 3 → box 3, … Cell 7 → box 7.  
5. Do **not** put all seven into one box.

---

## How to run (one by one)

Yes — **run individually**, in order:

| Order | What you do |
|-------|-------------|
| 1 | Click inside **box 1** → press the ▶ play button (or Shift+Enter). Wait until it finishes. |
| 2 | ▶ on **box 2**. Edit Roboflow key first. Wait. |
| 3 | ▶ on **box 3**. A **Choose Files** window appears. Pick `negative_car_bar_pack.zip` from your PC. Wait until it says `negatives: …`. |
| 4 | ▶ on **box 4**. Wait. |
| 5 | ▶ on **box 5**. Wait. |
| 6 | ▶ on **box 6** (long train). Wait until done. |
| 7 | ▶ on **box 7** → download the `.pt` file. |

You do **not** run Cell 3 at the same time as 1–7.  
You run **3 after 1 and 2 are done**.

---

## “If I put 1 to 7 into Colab” — wrong way

If you pasted everything into **one** cell → that is wrong. Delete it. Make **seven** boxes as above.

---

## Cell 3 only (reminder)

- **Which:** third box  
- **How:** click ▶ on that box only  
- **Then:** browser asks for a file → choose  
  `ME8\weapon-finetune-dataset\negative_car_bar_pack.zip`

---

## After Cell 7

Save file as `ME8\ai_engine\weights\weapon_rfdetr_best.pt`  
Then: `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`
