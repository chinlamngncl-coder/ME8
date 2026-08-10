# MOB DISC — Clear ask: I fetch negatives (not you, not FR) (2026-08-07)

**Status:** disc only. No download / no train until APPLY.  
**Operator:** Stop mumbling. Get the dataset yourself. FR ≠ Weapon. What do you want?

---

## Plain English (one screen)

1. **FR is Face.** It is **not** Weapon. I am **not** asking you to use FR for guns. Ignore any FR wording if it sounded mixed — that was noise.

2. **Weapon is broken on quality** because the pistol smoke train had **no “not a gun” pictures**. So it tags black clothes / TV / doorway as gun, and misses or flickers on a real pistol.

3. **You do not collect folders.** On APPLY I will **download public open datasets** into:

```text
weapon-finetune-dataset/negative/     ← no-gun scenes (people, hands, dark clothes, indoor)
weapon-finetune-dataset/gun_pistol/   ← keep your 40; may add more public pistol stills if license OK
```

Then rebuild COCO + retrain smoke weights + leave them on **8769 weapon-sidecar** (not ai_engine, not FR).

4. **What I want from you:** only the APPLY line below. No homework. No FR. No PowerShell cookbook.

---

## Exact next APPLY

`MOB-APPLY WEAPON-FETCH-NEGATIVES-AND-RETRAIN-V1`

I will:

1. Fetch **public** no-gun / hard-negative stills into `negative/` (Apache/CC/Roboflow-public only — no stolen private cams).  
2. Keep your existing pistol stills.  
3. Rebuild COCO + train → update `weapon-sidecar/models/checkpoint_pistol_smoke.pth`.  
4. Restart sidecar on 8769.  
5. Stop. You only: refresh Weapon → Start watch → pass/fail on **different** video than train stills.

Train may be **CPU slow** on this lab, or I stage for cloud GPU if CPU is unbearable — still **one** APPLY; I pick CPU first unless it cannot finish.

---

## Not in that APPLY

- FR / face / enroll  
- ai_engine on 8769  
- Live box overlay (later, separate)  
- Asking you to photograph negatives  

---

## Standing

Mumble = fail.  
This disc = **you say APPLY → I fetch + retrain.**
