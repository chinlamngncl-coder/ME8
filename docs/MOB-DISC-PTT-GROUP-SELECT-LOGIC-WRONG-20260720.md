# MOB DISC — PTT group select logic wrong (1+ / cross-group)

**Date:** 2026-07-20  
**Status:** APPLIED — see `MOB-APPLIED-PTT-GROUP-SELECT-1PLUS-V1-20260722.md`  
**Operator:** Map group “PP - Chin (1)” → **Need 2+ selected (1 now)** → cannot Join → cannot test group PTT.  
**Ask:** Select **1 or more** across **different** map groups, **or** select **all in one** group. That should be the logic.

---

## What you mean (locked intent)

| Mode | Expected |
|------|----------|
| **One map group** | Pick group in dropdown → **Join** pushes **all members in that group** (1, 2, or N). Optional ×/+ to drop/add individuals **within** that roster. |
| **Cross-group / ad hoc** | Tick **any 1+ online** units on fleet list — **mix colours / map groups** — → Join builds one PTT team from that pick. |
| **Not** | Hard block at “must be 2+” when you deliberately want a 1-person group or a single-group roster of 1. |

---

## What the code does today

### UI (`public/index.html` — PTT GROUPS box)

| Rule | Code |
|------|------|
| Join disabled unless **≥ 2** picked | `updatePttGroupJoinButton`: `btn.disabled = … \|\| n < 2` |
| Alert on Join | `joinDispatchPttGroup`: `if (pick.length < 2) alert(...)` |
| Hint text | `ptt.groupBox.pickNeedTwo`: *“Need 2+ selected ({n} now)”* |
| **Either** dropdown **or** fleet ticks — **not both** | `fullPttCandidatesMeta()`: if map group selected → **only that group’s members**; fleet pin ticks **ignored** |
| Fleet ticks source | `getPinnedPttCamIds()` → `FleetUi.getSelectedCamIds()` **online only** |
| Single fleet tick | `pinnedNeedMore` hint: need more than 1 pin |

### Server (`POST /api/dispatch-ptt-group`)

| Rule | Code |
|------|------|
| No group + `< 2` camIds | 400 *“tick at least 2 online units”* |
| Group + subset camIds | Subset must be **≥ 2** |
| Full group roster | Used when no subset — **but client always sends `camIds: pick`** after client 2+ gate |
| Final guard | `team.length < 2` → 400 *“Need at least 2 units for group PTT”* |

### Hold fanout (`video-wall.js`)

| Rule | Code |
|------|------|
| Dispatch team talk | `resolvePttTalkCamIds`: fanout only if `activeDispatchPttTeam.length > 1` |
| SOS team | Same `> 1` pattern |

### Ship manuals

En/Ko/Zh manuals say: *“Select map group **or tick 2+ online**”* — **2+ is baked into product docs**, not just a bug.

---

## Your screenshot (PP - Chin (1))

- Dropdown = saved map group **PP - Chin** with **1 device** in Server → Map groups.
- Members chip shows **Chin** only (correct roster).
- **Join disabled** — UI requires 2 picked; roster has 1.
- Even if Join were forced, **server would reject** (`team.length < 2`).

So with **one BWC in that group** you **cannot** test dispatch group PTT on current rules — not a WVP regression.

---

## Gap vs your intent

| Your intent | Today |
|-------------|--------|
| Join **whole group** with 1 member | ❌ client + server need 2 BWCs |
| Pick **1+** from fleet across groups | ❌ need 2+ online ticks; dropdown blocks cross-group when group selected |
| Pick **subset** 1 person from larger group | ❌ subset must be 2+ |
| × exclude before Join | ✓ works **when** roster ≥ 2 |

**Root issue:** Dispatch group PTT was designed as **“radio net = 2+ field units”** (plus HQ row in XML). Your ops model is **“any team size 1+”** and **“fleet multi-select is the source of truth, groups are presets.”**

---

## How to test group PTT **right now** (no APPLY)

Need **2+ online BWCs** and one of:

1. **Map group** with **≥ 2 devices** in Server → Map groups → select group → Join (or × down to 2+).
2. **Clear dropdown** (no group) → tick **2+ online** fleet pin checkboxes (can be different map colours) → Join.
3. **SOS PTT team** button (separate path) — alarm + helper; not the PTT GROUPS box.

If only **Chin online** and group has **1 member** → **blocked by design** until logic MOB.

---

## Proposed APPLY (when you say MOB — one MOB, named)

**`MOB-APPLY-PTT-GROUP-SELECT-1PLUS-CROSS-GROUP-V1`**

### Client

- Join enabled when **≥ 1** BWC picked (HQ added server-side in XML as today).
- **Map group selected + Join, no × changes** → send `{ groupId }` only (full roster) — **do not** require 2+ when roster is 1.
- **Fleet ticks** → build ad hoc list; allow **1+** online; **merge with or override dropdown** per your choice:
  - **Recommended:** dropdown = preset; fleet ticks **add** to pick; show chips from **union** with group colours; × still excludes.
- Update hints / i18n (`pickNeedTwo` → `pickNeedOne` or “Ready with {n}”).

### Server

- Allow `team.length >= 1` for dispatch group (still push HQ in `buildTeamPttDevices`).
- Ad hoc: `adhocCamIds.length >= 1` when no groupId.
- Group subset: allow 1 if operator explicitly picked 1 from chips.

### `video-wall.js`

- `resolvePttTalkCamIds`: treat dispatch team active when `length >= 1` (or keep fanout to single target — same as 1:1).

### Docs

- Manuals: replace “2+ online” with “1+ online” where true.

**Out of scope:** field BWC → BWC mesh relay (separate MOB).

---

## One line

PTT GROUPS box is **hard-coded 2+ everywhere** and **dropdown OR fleet, not cross-group merge** — so your 1-member map group and mixed-group picks cannot Join; needs a named select-logic MOB before you can test the way you described.
