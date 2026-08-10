# MOB DISC — Shotgun slow to hit; long gun OK; knife zero (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Operator after LONG-GUN-RECALL:** long gun **good**; **shotgun** needs many video replays; **knife** (long or short) — **no hits yet**.

---

## What this means

| Observation | Read |
|-------------|------|
| Long gun good | Gun floor **0.40** + context crop is working for clear long firearms |
| Shotgun needs many replays | Same **gun** class, harder shape (short barrel / pump / carry angle). Still path + 2-frame confirm often **misses the best frame**; not a separate shotgun engine |
| Knife never hits | Knife floor **0.55** is likely **too high** for this BWC/CCTV lab, **or** the Threat weights rarely fire knife on your scenes (tools/phone confusion cut both ways) |

Not broken install. Product gap = **class recall balance** + still timing for awkward gun shapes.

---

## Why shotgun feels “not fast”

Shotgun ≠ slower model. Same RF-DETR tick as long gun.

Difference: fewer stills clear the **0.40** gun bar + **2 confirms**. Replay until a lucky angle = what you feel as “not fast.”

Faster poll alone (already 2s) will not fix a weak angle. Options later: slightly lower gun floor further (risk pistol FP), or accept shotgun needs clearer frontal stills / fine-tune.

---

## Why knife is silent

Possible causes (honest):

1. **CONF_KNIFE 0.55** rejects real knives in your lighting.  
2. Model maps blades to noise / nothing more often than gun.  
3. Confirm streak never reaches 2.

We should **not** drop knife to 0.25 (Recent flood). Lab step: lower knife to **~0.42–0.45**, keep gun at **0.40** (or 0.38 if shotgun still weak).

---

## Recommendation (one next MOB)

**`WEAPON-KNIFE-RECALL-LAB-V1`**

1. Default **knife floor → 0.42** (env `FM_WEAPON_CONF_KNIFE`).  
2. Leave **gun at 0.40** (long gun PASS — do not touch unless shotgun still fails after knife PASS).  
3. Health/log show both floors.  
4. No YOLO. No new class. No alarm.

If after that knife still zero → weights are weak on knife for your cams → fine-tune disc, not more threshold games.

Optional follow-up only if shotgun still needs 10+ replays after knife PASS:  
`WEAPON-GUN-FLOOR-SHOTGUN-LAB-V1` (gun 0.40 → 0.35) — separate APPLY.

---

## APPLY when ready

`MOB-APPLY WEAPON-KNIFE-RECALL-LAB-V1`
