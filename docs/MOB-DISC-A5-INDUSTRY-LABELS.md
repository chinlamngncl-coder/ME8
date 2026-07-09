# MOB DISC — Display room labels (industry habit, not amateur copy)

**Status:** APPLIED 2026-07-09 — **Option A** (Milestone-aligned labels + deep link to Display room).  
**Rejected:** “this window = monitor 1”, “opens new window = monitor 2” — not used in Genetec / Milestone / Avigilon docs.

---

## What the industry actually says

| Vendor | Primary screen | Secondary screens | Layout concept | Action verbs |
|--------|----------------|-------------------|----------------|--------------|
| **Genetec Security Center** | Security Desk, **default monitor**, Monitoring task | **Full screen monitors**, video wall **tiles** | Video wall layout, tile pattern | Take control, enable sequence |
| **Milestone XProtect** | Smart Client **operator workstation** | **Smart Wall monitor**, **floating window** | **Preset**, **view layout** (2×2, 1+5) | Push content, send to monitor, drag onto monitor |
| **Avigilon ACC** | ACC Client (primary) | **Virtual Matrix** monitors, **new viewing window** | **View**, **view layout** | New window, add monitor, control what is displayed |

**Shared habit:** numbered **displays/monitors** with a **role** (video wall, map, alarms), plus **preset** or **layout** for the whole room. Buttons name the **function** (video wall, map, status), not “window vs this window”.

---

## What we ship today (weak spots)

| Key | Current | Problem |
|-----|---------|---------|
| `displayRoom.openOps` | Go to Operations | Vague — sounds like navigation, not “primary workstation” |
| `displayRoom.openWall` | Open wall window | “window” is amateur |
| `displayRoom.openMap` | Open map window | same |
| `displayRoom.openCentre` | Open status window | same |
| `displayRoom.monitor1Title` | Command | OK-ish; industry prefers **Operator workstation** |
| `displayRoom.presetSosTitle` | 4-Monitor SOS Room | OK; could be **4-display SOS preset** |
| `server.commandDisplays.*` (A5) | Multi-monitor layout / Open Command Wall | Wrong target tab; not industry wording |

---

## Locked structure (no engine change)

Keep **4 cards** = 4 **displays** in one **preset** (Milestone habit).

Do **not** explain browser mechanics in button labels. Use **display role** + **action**.

---

## Option A — Milestone-aligned (recommended)

Matches **preset / Smart Wall monitor / floating window** language tenders know.

| Display | Card title | Subtitle (hint) | Button |
|---------|------------|-----------------|--------|
| 1 | **Operator workstation** | Operations — map, SOS, PTT, fleet | **Show Operations** |
| 2 | **Video wall display** | Live multi-panel wall | **Open video wall** |
| 3 | **Map display** | Geography mirror (follows console) | **Open map** |
| 4 | **Status display** | Centre summary — fleet & SOS trends | **Open status board** |

**Preset block title:** `4-display SOS preset`  
**Launch button:** `Apply preset` or `Launch preset` (not “Launch all display windows”)  
**Footer note (stream):** `Each live source is decoded once. Do not assign the same camera to Operations and the video wall at the same time.`

**Settings (A5) note title:** `Video wall preset`  
**Settings button:** `Configure video wall` → opens Command Wall → **Display room** tab directly.

---

## Option B — Avigilon Virtual Matrix-aligned

| Display | Card title | Button |
|---------|------------|--------|
| 1 | **Control client** | **Show Operations** |
| 2 | **Matrix display — video** | **Open viewing window** |
| 3 | **Matrix display — map** | **Open viewing window** |
| 4 | **Matrix display — status** | **Open viewing window** |

Heavier “matrix” wording — use only if customer brief names Virtual Matrix.

---

## Option C — Minimal rename (smallest diff)

Only fix the worst buttons; keep card titles.

| Key | New text |
|-----|----------|
| `openOps` | **Show Operations** |
| `openWall` | **Open video wall** |
| `openMap` | **Open map display** |
| `openCentre` | **Open status display** |
| `launchAll` | **Apply SOS preset** |
| `server.commandDisplays.open` | **Configure display layout** |

---

## Deep link (technical — not shown to user)

On APPLY, wire only:

- Settings button → `showTab('command-wall', { panel: 'display' })`
- No change to Live Wall engine

User-visible text comes from **Option A/B/C** only.

---

## Duplicate camera — hint behaviour

| Today | After APPLY (any option) |
|-------|---------------------------|
| Static footnote only | Same — **no runtime block** in this MOB |
| | Optional later: toast if cam already live on Operations when dropped on Command Wall |

---

## Your call

Reply with one line:

- **`MOB-APPLY a5-labels option-a`** (recommended)  
- **`MOB-APPLY a5-labels option-b`**  
- **`MOB-APPLY a5-labels option-c`**  
- Or edit wording in this doc first.

**Do not APPLY** until you choose — per your request.
