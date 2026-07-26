# MOB DISC — Tactical split naming & UI (drop confusing “AR” chrome)

**Date:** 2026-07-25  
**Status:** DISC — **LOCKED** (words + layout proposal)  
**Context:** Operator PASS on Task **2.3 split** (map left / panel right works).  
**Pain:** “PTZ AR split”, “Close AR”, “AR idle…” are tech/jargon — hard to understand; design feels buried.

**Casing lock:** If the letters AR appear anywhere (docs/internal), write **AR** (both caps). Never **Ar**. Prefer **not showing AR to operators at all**.

---

## What the feature actually is (plain)

| Tech name (internal) | Operator meaning |
|----------------------|------------------|
| PTZ AR split | **Map + roof camera side by side** |
| Glass / UV pins | **Markers on the roof camera picture** (only when that camera is on a saved view) |
| Lock preset | **Use saved camera view** (e.g. North Gate) |
| Unlock on pan | Camera moved → markers hide (picture no longer matches) |

Internal code may keep `tactical-ar.js` / `TacticalAr` until a rename MOB. **Operator-facing text must not say AR.**

---

## Recommended operator words (LOCKED — operator choice 2026-07-25)

**Product name:** **Overwatch (AR)**

| Control | Label |
|---------|--------|
| Open | **Overwatch (AR)** |
| Close | **Close Overwatch** |

Casing: **AR** (never **Ar**). Internal code may still say `tactical-ar`.

**APPLIED:** `MOB-APPLIED-TACTICAL-OVERWATCH-AR-WORDS-V1-20260725.md`

Earlier “Roof view” draft is **superseded** by Overwatch (AR).

---

## What the feature actually is (plain)

| Tech name (internal) | Operator meaning |
|----------------------|------------------|
| Overwatch (AR) split | **Map + overview camera side by side** |
| Glass / UV pins | **Markers on the overview picture** (only on a saved view) |
| Use this view | Camera on that saved angle — show markers |
| Camera moved | Markers hide |

---

## Layout note

Top **Map / Map + Overwatch** tabs = optional later MOB. This APPLY = **words only** (operator: “just define these will do”).

---

## Where the control should live (layout)

Today: button buried under PREPARE (**PTZ AR split**) — easy to miss / misread.

| Option | Placement | Verdict |
|--------|-----------|---------|
| **1 — Top of Tactical stage (recommended)** | Tab strip over the map area: **Map** \| **Roof view** (and later **Map + Roof**) | One glance; matches “tab on top” ask |
| **2 — OPERATE block** | Next to Grab circle (live ops tools) | Good if only used under pressure |
| **3 — Keep under PREPARE** | Current | Worst for findability |

**Recommended UI shape:**

```text
Tactical stage top tabs:
  [ Map only ]  [ Map + roof ]  [ Roof only ]   ← optional third later
```

Default = **Map only**.  
**Map + roof** = today’s split (left map / right live).  
No button named AR.

---

## Status line words (right pane)

| State | Text |
|-------|------|
| Idle | Pick a roof camera and a saved view |
| Live, not locked | Live — press **Use this view** to show markers |
| Locked | Using **{saved view}** — markers on |
| Moved | Camera moved — markers hidden |
| No PTZ | No roof camera registered yet |

---

## Proposed APPLY (when you want the rename — not auto)

`MOB-APPLY TACTICAL-ROOF-VIEW-OPERATOR-WORDS-V1`

Scope:

1. Replace operator-visible strings (index + `tactical-ar.js` fallbacks + `en.json` keys) with **Roof view** set above  
2. Add top **Map / Map + roof** tabs on `#ax-tactical-stage` (move open/close off PREPARE)  
3. Keep internal ids `ax-tactical-ar-*` unless a follow-on rename  
4. Out: PTZ hardware, pin CRUD, Phase 3  

Until that APPLY — **zero rename code** (PASS already recorded for split behavior).

---

## Task 2.3 PASS (this message)

Operator: **PASS** for split (map left / panel right) without needing a PTZ.

Phase **2** Tasks 2.1–2.3 = **complete**.  
Phase **3** stays **PAUSED** until you open it.
