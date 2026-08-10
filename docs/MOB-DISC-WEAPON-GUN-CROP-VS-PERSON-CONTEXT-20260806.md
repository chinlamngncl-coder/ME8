# MOB DISC — Weapon analytics: gun box vs person carrying (2026-08-06)

**Status:** disc only. No code until APPLY.  
**Operator:** sees gun hits; Recent snaps are **weapon-only**, not people carrying weapons. Feels weak.

---

## What analytics we are doing (v1 — honest)

| Layer | What it is | What it is **not** |
|-------------------|---------------------|
| Engine | RF-DETR Threat (Apache) — classes **gun + knife** only | Not “armed person” / not pose / not FR face |
| Input | Still JPEG from **already-live** Weapon tiles (~every 3s) | Not continuous video classify |
| Confirm | Same cam must hit **2 frames** before Recent keeps it | Not one lucky frame |
| Recent crop | Tight box around the **weapon** (+ ~12% pad) | Not full body / not scene |

So today: **object detect gun/knife in the still → keep a small crop of that object.**  
It is **not** “find person holding a weapon and snap the person.”

That matches the locked engine plan (`MOB-DISC-WEAPON-ENGINE-MIT-APACHE-PLAN-20260806.md`): best legal gun/knife detector, not a person+weapon product yet.

---

## Why snaps look “only the gun”

In `weapon-sidecar/app.py` the crop is:

1. Take the gun/knife bounding box from the model  
2. Pad by **12%** of box size  
3. Save that small JPEG to Recent  

If the box is the pistol only, Recent shows the pistol only. Person torso/face is **outside** that box on purpose (tight crop = easy to see “what was detected”).

Live tiles still show full scene. Recent is evidence of **the detection**, not a full scene still.

---

## Why it can feel “not strong”

1. **Model job** = find gun/knife shapes, not “threat behavior” or “person with weapon.”  
2. **HF weights** are research-grade (author said not deployment gospel). Lab gun on table / close-up works better than distant pocket carry.  
3. **Still poll** (few FPS of JPEGs) misses fast motion; FR/ANPR style, not 25 fps inference.  
4. **Tight crop** makes product feel weaker than the live tile even when detect is correct.  
5. **No person link yet** — we do not run a person detector and expand to “carrier.”

Engine OK + gun in Recent = **v1 detect path working.** Weak **ops usefulness** of the snap is a **product crop / context** gap, not “engine dead.”

---

## What we should do next (one recommendation)

Do **not** swap to YOLO (AGPL). Do **not** invent FR-on-weapon yet.

**Next MOB after you APPLY:** expand Recent to **context crop** (person/scene), keep weapon as overlay later if needed.

### Recommended MOB

**`WEAPON-RECENT-CONTEXT-CROP-V1`**

- Keep detect = gun/knife (same engine).  
- Recent image = **wider context**: e.g. expand box to ~2–3× or clamp to person-sized pad (min height/width % of frame), or save **full still + weapon highlight** (PiP micro like ANPR).  
- Goal operator sees: **who / where**, not only the metal.

Alarm / nearby radio stays **later** (`WEAPON-ALARM-NEARBY-V1`) — still after useful snaps.

Optional later (bigger): person+weapon association (second Apache person model) — only if context crop still not enough.

---

## You do now

No code. Say if context crop direction is right.  
When ready: **`MOB-APPLY WEAPON-RECENT-CONTEXT-CROP-V1`**
