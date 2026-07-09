# MOB DISC — Reject “4-display SOS preset” (naming reset)

**Status:** **APPLIED** 2026-07-09 — enterprise-neutral labels; no “(optional)” in UI.

---

## What went wrong

We said we followed Milestone, then shipped:

**`4-display SOS preset`**

That string combines three ideas no enterprise product puts in **one default label**:

| Piece | Why it fails |
|-------|----------------|
| **4-display** | Installer math — not an operator concept. Milestone/Genetec name **monitors** by role, not “4-display” in the title. |
| **SOS** | One alarm type — not the name of a **control room layout**. Hospital, airport, utility customers do not buy “SOS preset”. |
| **preset** | Valid Milestone **admin** term — but operators see **named layouts** (“Control room A”), not “4-display SOS preset”. |

Result: sounds like an internal MOB id, not software customers have used for 20 years.

**Same class of mistake as NHQ/Corporate** — tender/feature words in customer UI.

---

## What industry actually does (research)

| Vendor | How they name it |
|--------|------------------|
| **Milestone** | **Smart Wall definition** (admin). Operators: **Select preset** → **Activate** (customer-named preset). Docs: “control room”, “video wall”, “view layout”. |
| **Genetec** | **Monitoring task**, **video wall layout**, **tile pattern**. No “SOS preset”. |
| **Avigilon** | **Virtual Matrix**, **monitor view**, **view layout**. Customer names monitors. |

**Pattern:**  
- **Room** = control room / dispatch / operations center  
- **Layout** = what goes on each **monitor** (video wall, map, status)  
- **Preset** = saved layout the operator **activates** — **name is customer-defined or generic**, never “4-display SOS”

---

## Locked rename (enterprise-neutral — any vertical)

### Settings → Server Config → Site readiness

| Current (bad) | Locked |
|---------------|--------|
| Video wall preset | **Display layout** |
| Configure video wall | **Set up displays** |
| Hint (long) | **Configure monitors for a control room — workstation, video wall, map, and status board.** |

### Command Wall → sub-tab

| Current | Locked (pick one) |
|---------|-------------------|
| Display room | **Display layout** (matches Settings) |

### Main card title (was “4-display SOS preset”)

| Locked (recommended) | **Standard control room layout** |
| Alt (shorter) | **Control room layout** |

Subtitle (one line): **Workstation, video wall, map mirror, and status board.**

**Banned in default UI:** SOS preset, 4-display, N-display counts in titles, tender codenames.

### Buttons (keep Option A verbs — those were OK)

| Display | Title | Button |
|---------|--------|--------|
| 1 | Operator workstation | Show Operations |
| 2 | Video wall | Open video wall |
| 3 | Map | Open map |
| 4 | Status board | Open status board |

### Launch action

| Current | Locked |
|---------|--------|
| Apply preset | **Launch layout** |

Milestone habit = **Activate**; we use **Launch layout** (clearer in browser pop-out context).

### Footnote (stream)

**Each camera is shown once across displays. Do not view the same live source on Operations and the video wall together.**

---

## UX logic (one screen story)

```
Settings → Set up displays
    → Command Wall → Display layout
        → Standard control room layout
            → [4 role cards] → Launch layout
```

No SOS in the path. SOS stays on **Operations** where it belongs.

---

## Fix MOB (when approved)

**Name:** `mob-a5-labels-enterprise-neutral`  
**Risk:** 1 — i18n only + optional tab rename `Display room` → `Display layout`  
**Files:** `en.json` + locales, `index.html` fallbacks, `commandWall.tabDisplayRoom`

---

## Apply

`MOB-APPLY mob-a5-labels-enterprise-neutral`

Or reply with edits to the locked table first.
