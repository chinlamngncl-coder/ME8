# MOB DISC — Train now with ~40 pistol pics? Doable? (2026-08-07)

**Status:** disc only. No train until APPLY.  
**Operator:** Put ~40 people / hand-holding **pistol** pics. Want train **first** so time is not wasted at the end. Ask: Mob disc — doable?

---

## Short answer

**Yes — doable as a first lab train (pipeline + pistol smoke).**  
**No — not enough for a final “Weapon product PASS.”**

40 pistol stills prove: folders → train script → new weights → sidecar swap → live test.  
They do **not** prove shotgun / knife / clean street. That needs more data later. Your “don’t waste time at the end” = **smoke the train path now**, then add folders and retrain. That order is smart.

---

## What you have vs what train needs

| Need | Ideal lab | Your pistol-first |
|------|-----------|-------------------|
| `gun_pistol` | ~80–150 | **~40** — thin but **usable for smoke** |
| `negative` (no weapon) | ~100+ | **Required** — if empty, model learns “person/hand = gun” and floods false hits |
| Other classes | later OK | Empty OK for **pistol-only v0** |

**Hard rule for this first train:** add at least **~40–80 negatives** (same kind of people/hands/scenes **without** pistol).  
Without negatives, first train is almost guaranteed to waste your time on false guns.

Pistol-only class map for v0: train **gun** (from `gun_pistol`) + **background/negative**. Knife/shotgun folders can wait for round 2.

---

## Doable plan (no cheat)

1. You add **negatives** (your method — not Ops cheat).  
2. APPLY **`WEAPON-FINETUNE-TRAIN-PISTOL-SMOKE-V1`** — train on `gun_pistol` + `negative` only.  
3. SWAP into sidecar.  
4. You PASS/FAIL on **different** pistol videos (not only the 40).  
5. Later: add shotgun / long / knife → full retrain APPLY.

If negatives stay **0**, I recommend **do not train yet** — result will look like a joke and burn trust.

---

## Recommendation

**Doable: yes, pistol smoke first.**  
**Blocker: negatives.** Put empty-hand / no-gun pics in `negative`, then say APPLY.

When ready:

`MOB-APPLY WEAPON-FINETUNE-TRAIN-PISTOL-SMOKE-V1`
