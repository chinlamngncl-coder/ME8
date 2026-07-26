# MOB DISC — Open grabbed: BWC on pin + cycle (not wall dump)

**Date:** 2026-07-24  
**Status:** APPLIED — `TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1` (await eyes PASS/FAIL)  
**Corrects:** `TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1` shipped **fixed-on-pin** but wrongly sent **BWC → wall only**

---

## Agent error (own it)

Agent treated BWC as “wall spill” because pin popup only had fixed-cam `zlm/start`.  
That is an **implementation excuse**, not the product.

You are in **Tactical**. Logic:

> Circle grab → targets in the circle appear **on pins with video**.  
> Cap the batch (max 8). If more than max → keep the set and **quickly step through** pin videos.  
> Do **not** dump BWC onto the ops wall as the answer — the wall may **already** be watching that BWC. Video must stay **flexible** (pin live independent of wall).

Wall is **not** the home for Open grabbed.

---

## Locked logic (plain English)

| Rule | Detail |
|------|--------|
| **Primary surface** | **Pin popup / pin video** on the Tactical map |
| **Who gets a pin video** | Everything grabbed that we can place: **POI pins** (fixed and/or BWC linked) **and online BWC with GPS** in the circle (ephemeral grab pin at GPS if no POI yet) |
| **Cap** | Max **8** live pin videos at once (same budget as Open All) |
| **More than max** | Still “take” the grab set; show **up to 8**; UI to **cycle / next-prev** through the rest quickly (pager on the grab set) — not “overflow to wall” |
| **Wall** | Optional later / operator choice — **never** required for Open grabbed success; must not steal or assume exclusive ownership of a BWC the wall already has |
| **Flexibility** | Pin FLV is its **own** attach. Wall watching cam X must not block pin watching cam X (second consumer / own lease path as Fleet already allows elsewhere) |

### Cycle meaning (locked)

```text
Grab finds N targets (POI + BWC online in circle)
→ arm pin videos for min(N, 8)
→ if N > 8: keep list; Next / Prev (or equivalent) swaps which pins are live
→ operator flips through pin videos under pressure — no wall hunt
```

---

## Why wall-only for BWC was wrong

1. Tactical AR face is **video on the pin**, not “call the wall.”  
2. Wall may **already** show that BWC → dumping again fights the desk and feels broken.  
3. Under pressure you need **pin stack + cycle**, not another panel storm.  
4. Fixed-on-pin + BWC-on-wall = **split brain** — not one Operate tool.

Partial V1 (fixed → pin) can stay as a step. **BWC → wall** in that APPLY is **rejected** as product behavior going forward.

---

## Recommended next APPLY (one)

**`TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1`**

Scope:

1. **BWC online in grab circle** → pin video on Tactical (ephemeral pin at GPS if needed, or existing POI with BWC link). Same FLV factory as wall/soft-open, **into pin stage** — not `openAllLivePins` as primary.  
2. **Grab set list** + **cycle** when count > cap (or always expose Next/Prev among grabbed). Cap still 8 live at once.  
3. **Do not** auto-send grabbed BWC to the wall.  
4. Toast: opened N on pins / cycling M of total / nothing online.  
5. Out: Turf, dual-pane, mode-banner rework, forcing wall mirror.

**Risk note (agent owns):** BWC pin needs the existing WVP/ZLM handoff URL into `Me8LivePlayerFactory` on the popup stage (parity with wall attach, separate owner/lease so wall + pin can coexist).

---

## Ladder

| Item | Status |
|------|--------|
| `TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1` | APPLIED partial — fixed-on-pin OK; **BWC→wall rejected** |
| **`TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1`** | **NEXT** |
| `TACTICAL-ZONE-TURF-ENTRY-EXIT-V1` | Waits |

---

## Next command

`MOB-APPLY TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1`

Until APPLY — **zero code**.
