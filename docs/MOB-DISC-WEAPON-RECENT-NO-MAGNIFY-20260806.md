# MOB DISC — Weapon Recent: no click / magnify (2026-08-06)

**Status:** disc only. No code until APPLY.  
**Operator:** cannot click-open / magnify Weapon Recent snaps like FR / ANPR.

---

## Confirm

You are right. That is missing — not operator error.

Weapon Recent today is **display-only**:

- `paintDetectGrid` puts an `<img>` + label in `.ax-wd-detect-slot`
- **No** `onclick`, **no** lightbox, **no** magnifier button

FR / ANPR already have open-big:

- ANPR → `ax-anpr-snap-lightbox` (big snap + crop / time)
- FR → alarm / recent magnify path (FrAlarm family)

Weapon never got that chrome in `WEAPON-DETECT-STILLS-RECENT-V1` (fill Recent only).

---

## Recommendation (one path)

Do **context crop** and **magnify** together so one APPLY gives useful evidence, not two half MOBs.

### MOB name

**`WEAPON-RECENT-CONTEXT-MAG-V1`**

1. Recent still = **wider context** (person/scene), not weapon-only 12% pad.  
2. Click Recent slot → **lightbox** (same idea as ANPR: big image, cam name, class gun/knife, time).  
3. Close on backdrop / Esc. No fake SOS. No nearby alarm in this MOB.

If you want magnify **only** first (keep tight gun crop): say so — smaller MOB  
`WEAPON-RECENT-LIGHTBOX-V1`.  
I still recommend the combined MOB above.

---

## Order vs alarm

1. This (see + enlarge useful snap)  
2. Then `WEAPON-ALARM-NEARBY-V1`

---

## APPLY when ready

`MOB-APPLY WEAPON-RECENT-CONTEXT-MAG-V1`
