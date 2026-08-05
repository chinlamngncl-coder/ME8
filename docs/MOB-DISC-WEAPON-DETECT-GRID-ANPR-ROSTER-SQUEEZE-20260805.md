# MOB DISC — Weapon Recent 16:9 grid + ANPR roster group/pin squeeze (2026-08-05)

**Status:** APPLIED `WEAPON-DETECT-GRID-ANPR-ROSTER-SQUEEZE-V1` (2026-08-05).  
**Related:** Weapon shell APPLIED; ANPR live tiles wider PASS; mapGroup unify lock.  
**Scope:** Weapon Recent rail chrome + ANPR Live roster/columns only. No engine. No FR layout rewrite. No fake SOS. No PTT-team invent.

## Confirm: I understand

1. Weapon **Recent** is empty words (“Awaiting detections”). Operator cannot see that detections will live there. Put a **16:9 detection grid**, **one column, row by row**.
2. ANPR Live roster is still a **flat name list** (your screenshot: Chin / kk only). No **group**, no **pin colour**, no clear **user/name** row like FR / Weapon. Squeeze the **page row** so there is just enough room — shrink Recent a bit, shift the **2×2 (4) live tiles** right.

One shot. Exact sizes locked below so we do not iterate for days.

## 1) Weapon Recent — detection grid

Keep Weapon FR-style layout (tiles + roster below + right rail). Change **only the Recent rail**.

Now:

```
Recent
Awaiting detections
(empty dark box)
```

Target:

```
Recent
┌─────────────────┐
│  16:9 ghost #1  │
├─────────────────┤
│  16:9 ghost #2  │
├─────────────────┤
│  16:9 ghost #3  │
├─────────────────┤
│  16:9 ghost #4  │
└─────────────────┘
```

Locked:

- **1 column**, stack **row by row** (not 2-col like ANPR plates).
- Each slot **`aspect-ratio: 16 / 9`**, dashed/ghost chrome (same family as ANPR rail skeleton).
- **4** empty slots always visible as the shell. Overflow scrolls if the rail is short.
- Drop the sentence “Awaiting detections” — the boxes are the explanation. Title stays **Recent**.
- No fake crops. No fake weapon hits. Later real detections **replace/fill from the top** (newest first). This MOB does not add detect logic.

## 2) ANPR Live — same roster facts, squeeze not rebuild

**Correction (your call-out):** live video is **not 3 tiles / not 3 video columns**. It is **2×2 = 4 tiles**. That stays.

What I wrongly called “3-col live wall” was only the **page chrome** on one row:

```
[ left roster ]   [ 2×2 live tiles ]   [ Recent plates ]
     strip              4 cameras            strip
```

Do **not** transplant FR’s 5-col group-card strip under the tiles. Do **not** change 4 tiles into 3 or 6.

Do **squeeze that page row** and teach the left roster the same **facts** as FR/Weapon.

### Page row widths (locked) — video stays 2×2

Now:

```
[ roster ≤170px ] [ 2×2 live 1.35fr ] [ recent 0.95fr ]
```

Target:

```
[ roster 280px ] [ 2×2 live 1.40fr ] [ recent 0.72fr ]
```

- Roster grows **170 → 280** (fixed). Enough for pin + name + group.
- The **4 live tiles** stay **2 across × 2 down**. They shift a bit right. 16:9 read stays.
- Recent plates **a bit smaller** (0.95 → 0.72). Still 2-col plate cards, just tighter. Not a big cut.

### Roster row style (locked)

Keep Start watch / Stop all / search / cameras meta.

Replace the flat `Name` labels with **grouped list**:

```
● Gate                    2/3 online
  [ ] Chin (user name)
  [ ] kk
● Ungrouped
  [ ] IPC-Lobby
```

| On screen | Source | Not this |
|-----------|--------|----------|
| Pin colour dot | Same colour brain as FR (`mapGroup` / dispatch lookup) | Random colours |
| Group header | `mapGroup`, leftover → **Ungrouped** | Fake PTT team |
| User / name | Device display name | camId-only dump |

**Team:** whole product group is **`mapGroup`** (Settings). PTT talk-group is radio, not CCTV. We do **not** add a second Team column. Group header **is** the team/site name.

Search also matches group name. Offline rows stay grey / unchecked like today.

No new online/offline filter dropdown in this MOB (ANPR already has search). FR filter stays on FR/Weapon.

## Out of scope

- Weapon detect engine / alarm / nearby
- ANPR offline / lists / history
- FR Live Watch layout
- Inviting idle cams
- Rewriting ANPR recent into 1-col (plates stay 2-col, just narrower)

## One next APPLY

**`MOB-APPLY WEAPON-DETECT-GRID-ANPR-ROSTER-SQUEEZE-V1`**

Both chrome items in this one APPLY (one refresh, one pass).

## Operator pass

Restart only if server was already running from the Weapon shell (this MOB is UI+CSS+ANPR roster JS). Hard-refresh.

**Weapon:** Recent shows four 16:9 empty boxes, stacked. No fake hits.

**ANPR Live:** left roster shows group headers + pin colour + names; live 2×2 still readable; Recent plates a bit narrower, still usable.
