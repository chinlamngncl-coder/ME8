# MOB DISC — Tactical tool flow: Prepare pins → Operate circle (FAIL repair)

**Date:** 2026-07-24  
**Status:** APPLIED — `TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1` (await eyes PASS/FAIL)  
**Operator:** Drawing circle is hard / easy to miss mode; map pans or Place POI drops a pin; circle open did nothing. Want **one clear flow**, not tools scattered. Pins **first** (prepare); circle **during ops** (fast view).

---

## Understanding (locked)

| Phase | When | What operator does |
|-------|------|---------------------|
| **1 — PREPARE** | Before / quiet time | Place / name / link **POI pins** only. Map click = pin (or pan if idle). No circle grab mixed in. |
| **2 — OPERATE** | Live incident | Switch to **Operate** → draw **one grab circle** → open everything inside (cap 8 + toast). |

Circle is **not** another random button next to Place POI. It is the **ops grab tool** after pins exist.

Agent got it: stop “pin here / circle there / map moves if you missed the mode.” One **mode heading**, one map meaning at a time.

---

## Why it felt broken today

1. **Modes fight:** Place POI + Draw Circle + map pan all use map click/drag without a big visible “you are in X mode”.  
2. **Circle tool is two-step and easy to miss:** must arm **Circle**, then click-drag; if not armed → pan. If Place POI armed → new pin.  
3. **Open in circle = nothing** (likely one of):  
   - No durable circle seen as grab target  
   - Circle drawn but **no POI / fixed latlng / BWC GPS inside** (empty hit-test → silent-feeling toast)  
   - Toast only on tiny status line / easy to miss  
   - Wall/open path no-op if targets empty after online filter  

Repair must fix **flow + feedback**, not only another button.

---

## Recommended UX (single path)

### Rail structure (headings)

```text
PREPARE
  [ Place POI ]   ← only map tool in this mode
  name / link / list / Open linked (one POI)

OPERATE
  [ Grab circle ] ← arms circle draw; banner: “Drag on map to grab”
  [ Open grabbed ] ← enabled when a grab circle exists
  hint: Opens POIs + fixed + BWC in circle (max 8)
```

### Rules

| Rule | Detail |
|------|--------|
| **Exclusive mode** | Idle (pan) \| Prepare-Place \| Operate-Grab. Arming one **cancels** the other. |
| **Banner on map** | Always show current mode in plain English (e.g. “PREPARE — click to place pin” / “OPERATE — drag circle to grab” / “Idle — drag to move map”). |
| **Esc** | Back to Idle. |
| **Open grabbed** | Loud toast + status: need circle / nothing inside / opened N of total. Never silent. |
| **Zones** | Keep zone Save / Polygon separate under Zones (not mixed into Prepare/Operate grab). |

### Open logic (keep from V1, harden)

- Hit-test: POIs in circle + linked ids; fixed cams with coords; BWC GPS if present.  
- Cap 8 + wall-full toast.  
- If zero hits: **big clear message** (“Nothing in this circle — place POIs or check cam GPS”).

---

## APPLY name (next — before Turf)

**`TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1`**

Scope:

1. Split rail into **PREPARE** / **OPERATE** headings.  
2. Exclusive modes + map banner.  
3. Fix Open-in-circle feedback + empty/miss cases (so “nothing” is explained).  
4. Do **not** start Turf entry/exit until this PASS.

**Out:** Dual-pane PiP, video AR pins, Turf GPS loop.

---

## Ladder update

| Order | MOB | Status |
|-------|-----|--------|
| Was | `TACTICAL-AR-CIRCLE-BATCH-OPEN-V1` | APPLIED but **FAIL** (UX + open nothing) |
| **Next** | `TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1` | Repair flow |
| Then | `TACTICAL-ZONE-TURF-ENTRY-EXIT-V1` | After flow PASS |

---

## Confirm

Say **TACTICAL PREPARE/OPERATE FLOW DISC OK**, then:

`MOB-APPLY TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1`

Until APPLY — **zero code**.
