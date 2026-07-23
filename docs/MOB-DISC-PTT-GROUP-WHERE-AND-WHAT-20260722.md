# MOB DISC — PTT group: where / what / why it feels useless

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-22  
**Trigger:** Operator — Call/PTT work on wall; unmute listen silent (separate MOB). **Also:** PTT group feels useless — where do I group? Left panel or wall? Pressing PTT icon does not group. Is grouping HQ→all or BWC↔BWC?  
**Related:** `MOB-DISC-PTT-GROUP-SELECT-LOGIC-WRONG-20260720.md`, `MOB-DISC-PTT-GROUPING-ALREADY-ON-TEAM-20260720.md`, `MOB-DISC-WALL-AUDIO-PATH-V1-20260722.md`

---

## Short answers (plain English)

| Your question | Answer |
|---------------|--------|
| When HQ talks after group, should selected BWCs all hear HQ? | **Yes** — that is the product intent (**HQ → team**). |
| Where do I do the group action? | **Left panel only** — box **PTT GROUPS** → pick roster → **Join group PTT**. **Not** on the wall. |
| Wall / left **PTT icon** — does it group? | **No.** Icon = **talk now**. Grouping = **Join** first. If you never Joined, hold = **one cam only**. |
| Is grouping for PTT↔PTT (BWC to BWC)? | **Mostly no (today).** Join = put BWCs on one **dispatch channel** + HQ hold fans out to all joined. **Field BWC → other field BWC** is **not** fully relayed by Fleet server yet (separate mesh MOB). |

---

## Two different buttons (this is why it feels useless)

```
LEFT PANEL — PTT GROUPS box
  Dropdown / fleet / chips  →  choose WHO is on the team
  [Join group PTT]          →  push group to devices + set activeDispatchPttTeam
  [Ungroup all]             →  tear down team

WALL or LEFT — PTT icon (hold)
  →  talk RIGHT NOW to:
       • if Joined + team ≥ 2  →  all team cams hear HQ
       • if NOT Joined         →  only that one cam
```

**Pressing PTT never “groups.”** It only **talks**.  
**Join** is the group action. Without Join, group UI looks useless.

---

## Correct HQ workflow (baseline product)

1. **Two+ online BWCs** (today’s hard rule — see below).  
2. Left panel **PTT GROUPS**:
   - Pick a **map group** in the dropdown, **or**
   - Clear dropdown → tick **2+** online units on the fleet list.  
3. Press **Join group PTT** — wait until status shows team active.  
4. Then hold **PTT** on **any** joined cam’s wall slot / pin / fleet row → **all joined hear HQ**.  
5. **Ungroup all** when done.

**SOS path (separate):** SOS banner **PTT team** — same “HQ → all helpers” idea during an alarm. Not the wall PTT icon alone.

---

## What grouping is / is not

| Kind | What it is | Status |
|------|------------|--------|
| **A — HQ → all joined** | Desk hold PTT fans out to every cam on `activeDispatchPttTeam` (or SOS team) | **Designed**; works when Join succeeded + cams on PTT channel |
| **B — Put BWCs on same group channel** | Server pushes group XML (`pushPttGroupToTeam`) so devices share a gtid/channel | **Exists** |
| **C — Field BWC hears other field BWC** | Helper presses hardware PTT → other team BWCs hear (mesh) | **Not server-relayed today** — harm plan phase **11** `SOS-GROUP-FIELD-RX-RELAY-V1` |

So: grouping is **not** “tick on wall then PTT icon = group.”  
It is **Join on left panel**, then **HQ talk to many**.  
BWC↔BWC mesh = later MOB if you still want it after Join UX works.

---

## Why Join often feels broken (locked gaps)

From existing disc `MOB-DISC-PTT-GROUP-SELECT-LOGIC-WRONG-20260720.md`:

| Trap | Effect |
|------|--------|
| Join needs **2+** picked (client + server) | 1-member map group → Join disabled → “useless” |
| Dropdown **or** fleet ticks — not merge | Easy to think you selected cams when UI ignored them |
| Wall/fleet PTT without Join | Always **1:1** — looks like “group did nothing” |
| Cams not on `:29201` channel yet | Alert: wait after live / PTT team again |

**Also separate:** wall **unmute listen** (hear BWC ambient mic) ≠ PTT. That is `WALL-AUDIO-PATH-V1`. Call/PTT can PASS while unmute is silent.

---

## Where UI lives (so you don’t hunt the wall)

| Place | Role |
|-------|------|
| **Left panel — PTT GROUPS** | **Only** place to Join / Ungroup dispatch team |
| **Left fleet list** | Tick cams for ad hoc Join (when no map group / per rules) |
| **Ops wall slot PTT** | Hold talk (1 cam or whole Joined team) |
| **Map pin PTT** | Same as wall hold |
| **SOS banner PTT team** | Alarm helper team push (not daily dispatch Join) |

---

## Agent pick — next MOB for “group useless” (when you want APPLY)

**Not tonight’s wall-audio MOB.** After listen, or when you name it:

| Priority | MOB | Fixes |
|----------|-----|--------|
| **1 (UX)** | `PTT-GROUP-SELECT-1PLUS-V1` (aka `PTT-GROUP-SELECT-1PLUS-CROSS-GROUP-V1`) | Join with **1+**; clearer left-panel only; cross-group pick — so Join is usable |
| **2 (ops)** | Prove Join → hold → 2 BWCs hear HQ (lab) | Confirm A path still PASS under WVP |
| **3 (later)** | `SOS-GROUP-FIELD-RX-RELAY-V1` | Only if you need **BWC↔BWC** mesh |

**Default recommendation after wall listen:** **`PTT-GROUP-SELECT-1PLUS-V1`** — makes the left-panel Join match how you think (“select who hears HQ”), without inventing a wall group button.

---

## What PASS looks like (group genre — later)

| # | Test | Pass |
|---|------|------|
| 1 | Left **PTT GROUPS** — select Chin+kk (or map group) → **Join** succeeds | ☐ |
| 2 | Hold wall PTT on Chin → **Chin and kk both hear HQ** | ☐ |
| 3 | Without Join, hold PTT on Chin → **only Chin** hears (1:1) | ☐ |
| 4 | **Ungroup** → hold again → back to 1:1 | ☐ |
| 5 | (Optional later) Helper field PTT → kk hears → mesh MOB | ☐ |

---

## Honesty ledger

| Claim | Truth |
|-------|-------|
| “PTT group is useless” | Fair **feeling** — Join is easy to miss; 2+ rule blocks; PTT icon does not group |
| “Should hear all selected when HQ talks” | **Yes** — after **Join**, not after icon alone |
| “Where — left or wall?” | **Left panel Join**; wall = talk |
| “Grouping = PTT to PTT?” | **HQ→team yes**; **field↔field** = separate / not done |

---

## APPLY

No APPLY from this disc until you name one of:

- **`MOB-APPLY WALL-AUDIO-PATH-V1`** — unmute hear (current next in harm order)  
- **`MOB-APPLY PTT-GROUP-SELECT-1PLUS-V1`** — fix Join UX when you want group genre  

Do **not** invent a “group on wall PTT icon” without a named MOB — that would confuse talk vs join.
