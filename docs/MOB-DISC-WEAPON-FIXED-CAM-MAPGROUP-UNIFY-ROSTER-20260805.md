# MOB DISC — Fixed cams in FR/ANPR? Online? Group unify (2026-08-05)

**Status:** APPLIED `WEAPON-LIVE-WATCH-SHELL-V1` (2026-08-05).  
**Related:** weapon need/fixed-cam weight disc; FR roster group cards.  
**Scope:** product lock for analytics live rosters (FR + ANPR + Weapon shell). No engine change.

## Confirm: I understand

1. Did we actually put **fixed cams into FR and ANPR**?
2. How do we know a fixed cam is **online**? They have **no team / group**.
3. Shall we **plan grouping** for fixed cams on **both FR and ANPR**?
4. Do **Weapon Live Watch first** and plan UI — **one unify method** for the whole product.

## Honest answers

### Did we “do” fixed cam → FR / ANPR?

**Not as a named feature.** There is no separate “send IPC to analytics” job.

What exists:

- One **fleet** list (`camId` + name + `mapGroup` + online).
- FR / ANPR live sample **any cam that is already live** (WVP/ZLM stills). They do **not** say “BWC only” in that grab.
- If a fixed channel is in fleet **and** live, the **pipe can** read it.
- We did **not** productize it: no fixed-cam label, no grouping plan, ANPR roster is still a **flat list**, FR uses **group cards**. Ungrouped IPC may look lost or missing.

So: **same pipe, not finished product.**

### How do we know online?

Same presence brain as Ops: **`GlobalDevicePresence`**.

| Signal | Meaning |
|--------|---------|
| `device-status` / heartbeat / WVP ACL status | **Online** (device reachable) |
| `device-offline` | Offline |
| WVP **startPlay** / live FLV | **Live video** (not the same as online) |

BWC: SIP / heartbeat. Fixed / GB: WVP catalog + status on the **same** `camId`.

**Online ≠ streaming.** Analytics still only runs when the stream is **live** (same as last weapon disc).

### Team / group — do not invent a second system

Whole product already groups devices with **`mapGroup`**:

- Settings → device catalog (`map_group`)
- Ops map pins / dispatch scope
- **FR Live Watch** roster = **group cards** by `mapGroup`, leftover → **Ungrouped**

**PTT team** is radio talk groups — for officers, not site CCTV. Do **not** fake PTT teams for fixed cams.

**Plan:** put fixed cams in **mapGroup** like BWC (examples: Gate, Lobby, Car park, Armory). Admin sets this in **Settings**, once. FR, ANPR, Weapon, map all read that field. No analytics-only groups.

### Unify live-watch UI

| Surface | Roster today | Target |
|---------|--------------|--------|
| FR Live | Group cards + Ungrouped + online filter | **Keep — this is the pattern** |
| ANPR Live | Flat row list (has `mapGroup` in data, not shown as cards) | **Same group cards as FR** (later MOB) |
| Weapon Live | Not built | **Copy FR from day one** |

One method: **mapGroup cards + Ungrouped + online / in-watch / offline filter + already-live stills.**

## Locked order

1. **Now (next APPLY):** Weapon Live Watch **shell** — FR-style roster (groups + Ungrouped). Fixed + BWC if they appear in fleet. Already-live poll only. Engine stub OK.
2. **Plan (after Weapon shell PASS):** `ANALYTICS-LIVE-ROSTER-MAPGROUP-UNIFY-V1` — ANPR Live roster → same group cards as FR. Settings: assign IPC `mapGroup` (no new group feature).
3. Do not build a third grouping UI inside Analytics.

## One next APPLY

**`MOB-APPLY WEAPON-LIVE-WATCH-SHELL-V1`** — applied 2026-08-05.

Weapon tab + FR-like live layout (roster groups, tiles, Recent). No fake SOS. No ANPR roster rewrite in this MOB.

Later (not this MOB): `ANALYTICS-LIVE-ROSTER-MAPGROUP-UNIFY-V1` (ANPR roster → same group cards).

## Operator pass (after that APPLY)

Analytics → Weapon opens. Roster looks like FR (groups / Ungrouped). Online fixed cam can appear if it is in fleet. Idle cams are not auto-lived. FR/ANPR behavior unchanged until the later unify MOB.
