# MOB DISC — Colab Cell 1 “doesn’t work” = no GPU (2026-08-08)

**Status:** disc only. **Not a new-code bug.** No product edit.  
**Your screen:** `nvidia-smi: command not found` then  
`AssertionError: Enable GPU: Runtime → Change runtime type → T4/A100`

---

## Plain English

Cell 1 is doing its job. It **checks** that Colab gave you a GPU.

Right now Colab is running on **CPU only** (or no accelerator). Training Track B on CPU will burn hours and is not the path we use.

This is the **same** Cell 1 check as last successful train — not a broken rewrite of the model.

---

## Fix (about 30 seconds)

1. In Colab top menu: **Runtime**  
2. **Change runtime type**  
3. **Hardware accelerator** → pick **T4 GPU** (or any GPU Colab offers: A100 / L4 / etc.)  
4. Click **Save**  
5. Colab may restart the runtime (normal).  
6. Click ▶ on **Cell 1 again**.  

You should see a GPU name printed (e.g. `CUDA Tesla T4`), **not** the red AssertionError.

Then continue ▶ Cell 2 → 3 (new zip) → … → 7 as before.

---

## If you already “have GPU” but still fail

- Confirm it says **GPU**, not **CPU** / **None**.  
- Free Colab sometimes says GPU is busy — wait, or **Runtime → Disconnect and delete runtime**, then set GPU again.  
- After any runtime change, **re-run Cell 1** (and re-paste API key in Cell 2 if the session wiped).

---

## What not to do

- Do **not** delete the `assert torch.cuda.is_available()` line to “make it pass.” That only hides the problem; train will be wrong/slow.  
- Do **not** switch to Track A smoke train for car/bar.

---

## After Cell 1 is green

Same path: new `negative_car_bar_pack.zip` in Cell 3 → train → drop `.pt` →  
`MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`
