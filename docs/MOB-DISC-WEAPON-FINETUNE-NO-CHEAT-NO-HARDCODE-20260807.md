# MOB DISC — Fine-tune is real train, not cheat / hardcode (2026-08-07)

**Status:** disc only. No code.  
**Operator:** Will build the dataset **their own way**. Will play **different** videos to test. Will **not** do “Ops live → capture → you confirm same data.” Accuses cheat / hardcode.

---

## Confirm: you are right to demand this

**We will not hardcode.**  
**We will not “cheat” by only scoring the same pictures you trained on.**

Ops live capture in the simple manual was only **one optional way** to get JPG files. It is **not required**. Your own method is fine and better if you control the set.

---

## What fine-tune actually is

1. You put images in the 5 folders (any honest source: video export, phone, other NVR, etc.).  
2. Later TRAIN MOB: RF-DETR **learns weights** from those pixels (Apache). New `.pth` file.  
3. Live Weapon uses that file on **new** stills from **whatever** video is playing.  
4. No list of “if file = X then gun.” No cam-id hardcode. No “only pass if frame matches train set.”

If we ever only measured accuracy on the **same** train images and called it PASS — that would be a cheat. **We will not do that.**

---

## How we prove it (your rule)

| Phase | What you do | What counts |
|-------|-------------|-------------|
| Collect | Your method → fill folders | Train data only |
| Train | You say photos ready → APPLY train | Model learns |
| **Test PASS** | Play **different** videos (not only train clips) on already-live / Weapon | Gun / shotgun / knife / clean negatives on **unseen** footage |

**PASS = works on videos you did not stuff into the train folders as the only test.**  
Same scene type is OK (lab yard). Same exact frames used for training as the only proof = **FAIL / not accepted.**

Optional later: keep a small `holdout/` or you simply never put the test video frames into the train folders. Your call.

---

## What we will never do

- Hardcode BWC ids  
- Hardcode “this screenshot = always gun”  
- Fake Recent hits without the model  
- Declare PASS from train-set replay only  
- Require Ops-live capture as the only allowed dataset path  

---

## Manual update (when you APPLY a tiny doc fix — or accept this disc)

SIMPLE-MANUAL may say Ops live as optional. Locked meaning:

**Any JPG/PNG in the correct folder counts. Your method wins. Test on different videos.**

Say if you want:  
`MOB-APPLY WEAPON-FINETUNE-MANUAL-OWN-METHOD-V1`  
→ rewrite SIMPLE-MANUAL to remove “must use Ops live” language and add holdout / different-video PASS rule.

Until then, this disc is the lock.

---

## Bottom line

You collect however you want.  
We train for real.  
You judge on **other** videos.  
No hardcode. No confirmation-only cheat.
