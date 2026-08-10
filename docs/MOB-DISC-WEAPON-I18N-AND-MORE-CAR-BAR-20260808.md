# MOB DISC — Toast labels fixed + more car/bull-bar stills (2026-08-08)

**Status:**  
- `WEAPON-ALARM-I18N-STRINGS-V1` — **DONE** (product UI)  
- Extra hard-negatives pack — **DONE** (agent fetched; you retrain in Colab)  
No more product edit until next named APPLY.

---

## Part A — What we fixed (labels)

**Was broken:** popup said **Toast Title**; lightbox said **Lb Zoom Hint**; buttons said **Hq Open Weapon**.

**Why:** English strings were missing. The language helper invented titles from code names.

**Now:** real words — **Weapon detection**, **Open Weapon**, **Show on map**, **Hover to magnify**.  
Also: if a string is ever missing again, code uses the English fallback instead of fake “Toast Title”.

**You do:** hard refresh the dashboard (Ctrl+F5). Trigger any weapon hit or open a Recent snap.  
**PASS:** no “Toast Title”, no “Lb Zoom Hint”.

---

## Part B — Car still false-gun (accuracy)

Labels do **not** fix the black SUV / bull-bar false **gun**. That needs **another Colab train** with **more** no-weapon car/bar pictures.

### What agent did

| Item | Detail |
|------|--------|
| Folder | `weapon-finetune-dataset/negative_car_bar/` |
| Count | **~155 JPGs** (was ~61) — more COCO cars/trucks (prefer darker / large vehicle) + a few bull-bar / black SUV stills |
| Zip for Colab | `weapon-finetune-dataset/negative_car_bar_pack.zip` (**rebuilt**) |
| Colab guide | same: `ai_engine/colab/WEAPON-B-CAR-BAR-COLAB.md` |

Wikimedia rate-limited mid-fetch — COCO bulk carried the count. Pack is still **no guns**, background-only merge.

### What you do next (train again)

1. Open Colab (GPU). Use the same **7 cells** from `WEAPON-B-CAR-BAR-COLAB.md` (code only inside each fence).  
2. Cell 3 — upload the **new** zip:  
   `C:\Users\user\Desktop\Enterprise Mobility\ME8\weapon-finetune-dataset\negative_car_bar_pack.zip`  
3. Run through train → download new `weapon_rfdetr_best.pt`.  
4. Overwrite: `ai_engine\weights\weapon_rfdetr_best.pt`  
5. Tell me: `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`  
6. Live check: same car / bull-bar scene → should **not** alarm (or rare); real gun still hits.

---

## Plain order

| Step | Who | What |
|------|-----|------|
| 1 DONE | Agent | I18N strings + harden fallbacks |
| 2 DONE | Agent | Bigger car/bar negative pack + zip |
| 3 | **You** | Colab train with new zip → drop new `.pt` |
| 4 | You type APPLY | `WEAPON-B-NEGATIVES-RELOAD-V1` |
| 5 | You | Hard refresh → PASS/FAIL car scene |

Optional later band-aid only: `WEAPON-CONF-GUN-LAB-BUMP-V1` — not instead of this train.
