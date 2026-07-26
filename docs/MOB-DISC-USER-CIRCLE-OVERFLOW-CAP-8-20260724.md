# MOB DISC — User Circle: many pins → open max 8 (or 10 later)

**Date:** 2026-07-24  
**Status:** PAPER ONLY — **no code** (you asked Mob disc + “can do?”)  
**Parent:** `MOB-DISC-USER-CIRCLE-BATCH-OPEN-8-10-20260724.md`  
**Phrase when build:** `MOB-APPLY USER-CIRCLE-BATCH-OPEN-V1`

**Note:** You typed APPLY and then asked a cap question with **Mob disc**. Agent treats this turn as **paper lock on overflow**, not build. Say a clean APPLY (no “mob disc”) when you want code.

---

## Your question

> If we do User Circle, inside may have many more pins. We just take 8 or 10 maximum. Can do?

**Yes. That is the correct design.**  
Circle roster can be large (12, 20, whole shift). **Open Circle** never tries to paint everyone — it opens **at most N**, same as today’s Open All.

---

## Locked rule (V1)

| Rule | Lock |
|------|------|
| **Open cap** | **`N = 8`** for V1 |
| **Why 8** | Wall `PIN_SLOT_COUNT = 8`, `MAX_OPEN_PIN_POPUPS = 8`, `MAX_PIN_SELECT = 8`, `openAllLivePins(…).slice(0, 8)` |
| **10** | **Not in V1** — needs wall capacity MOB first. Paper only until then. |
| **Overflow** | Circle may store **more than 8** members; Open takes **first 8** (stable order) and tells the operator the rest were skipped |

### Overflow UX (must have)

When circle has e.g. 15 members and Open runs:

1. Open **8** via existing `openAllLivePins`.  
2. Short status/toast: **Opened 8 of 15 — wall full** (or equivalent).  
3. Do **not** silently pretend all 15 opened.  
4. Do **not** storm Invites for the leftover.

### Order (who is in the 8)

Recommend fixed, boring order so ops can predict:

1. **Saved circle order** (as listed when saved), then  
2. Prefer **online / GPS-present** first (optional polish in same MOB if cheap), else strict list order.

Do not randomize.

---

## Can we do 10?

| | 8 | 10 |
|--|---|-----|
| Today | Yes — engine already slices to 8 | No free slots |
| Cost | Circle UI + Open + overflow toast | New wall layout (10 panels) + popup dock + load |

**Recommendation:** V1 = **cap 8 + overflow message**.  
Later optional: `WALL-CAPACITY-10-V1` then bump circle open max to 10 in a tiny follow MOB.

---

## What APPLY will build (when you say clean APPLY)

`USER-CIRCLE-BATCH-OPEN-V1` (Ops):

- Named circles (roster can be **>8**).  
- **Open Circle** → `openAllLivePins(ids.slice(0, 8))`.  
- Overflow toast if `ids.length > 8`.  
- Reuse Open All stagger / WVP path — **no new player**.

Out of V1: Tactical incident circle, map geo-select, wall-10, VC restore.

---

## Conflict with VC FAIL

Live VC is still FAIL (black void / fake expand). Circle is Ops map/wall, separate genre.  
If you want agent priority: say whether **VC restore** or **User Circle** goes first. Agent default if you only APPLY Circle: build Circle only.

---

## Operator next step

1. Confirm: **CIRCLE CAP 8 OK** (overflow skip + toast).  
2. If you insist on 10 day-one: say **CIRCLE CAP 10** — agent will refuse V1 and require wall-capacity paper first.  
3. Build: **`MOB-APPLY USER-CIRCLE-BATCH-OPEN-V1`** alone (no “mob disc” on that line).
