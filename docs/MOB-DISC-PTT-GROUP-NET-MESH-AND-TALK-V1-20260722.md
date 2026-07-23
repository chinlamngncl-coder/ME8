# MOB DISC — Real group PTT: HQ in + BWCs + mesh (not “reuse 1-cam icon”)

**Status:** APPLIED 2026-07-22 — awaiting operator PASS/FAIL  
**APPLY:** `MOB-APPLY PTT-GROUP-NET-MESH-AND-TALK-V1`  
**Date:** 2026-07-22  
**Update 19:00:** Operator asks — after Join forms the radio net, **where / how do we click to talk together?** UX locked below.  
**Trigger:** Operator on `PTT-GROUP-SELECT-1PLUS-V1` — **PASS** on Join 1+, but product is **useless**: “we can already PTT on our own icon.”  
**Want (locked):** Join a group → **HQ is in by default** + selected BWCs (e.g. 2) → must **push something** for **group PTT** = **HQ→all** + **BWC↔BWC** + **HQ hears field**.  
**Related:** `MOB-DISC-PTT-GROUPING-ALREADY-ON-TEAM-20260720.md`, `MOB-DISC-PTT-GROUP-WHERE-AND-WHAT-20260722.md`, harm phase **11** mesh

---

## Got it — clear lock

| What you mean | Yes / no |
|---------------|----------|
| Join = build a **radio net**: **HQ + selected BWCs** | **Yes** |
| After Join, need a clear **group PTT** action (not “same wall icon as 1:1”) | **Yes** |
| When someone talks on that net: **HQ→all BWCs** | **Yes** |
| When a **BWC** talks: **other BWCs + HQ** hear | **Yes** (mesh) |
| Today’s Join that only makes wall PTT fan out HQ→cams | **Not enough** — feels same as holding PTT on one cam |

**One sentence:** Group PTT = **shared channel** (HQ always member) + **dedicated talk**, not a shortcut for the existing 1-cam PTT button.

---

## UX — where / how you talk after Join (agent pick — locked)

Yes — Join only **forms the net**. Talk is a **second step**.

### Flow (plain English)

```
1. Left panel — PTT Groups
   Pick Chin + kk (map group and/or fleet ticks)
   → [ Join group PTT ]

2. Net is live  →  status:  “Radio net · HQ + Chin, kk”
   Box shows a big new control:

   ┌─────────────────────────────────────┐
   │  Radio net · HQ + 2 units           │
   │  [ 🎙 Hold Group PTT ]   [Ungroup]  │
   └─────────────────────────────────────┘

3. HQ press-and-hold  [Hold Group PTT]
   → Chin + kk both hear HQ
   → release = stop

4. Chin (or kk) presses  hardware PTT on the BWC
   → HQ hears + the other BWC hears
   (no dashboard click needed for field)

5. [Ungroup]  →  net gone; wall/pin PTT icons back to 1:1 only
```

### Where is the button?

| Control | Where | Who uses it |
|---------|--------|-------------|
| **Hold Group PTT** | **Left panel — inside PTT Groups box** (appears **only after Join**) | **HQ desk** |
| Hardware PTT | On each BWC body | Field |
| Wall / pin per-cam PTT icon | Ops wall / map pin | 1:1 when ungrouped; see below when grouped |

**Why left panel (agent pick):** Same place you Joined. One big hold button = obvious “we are on the squad channel.” No hunting wall slots.

### While net is active — wall / pin icons

| State | Wall / pin PTT icon |
|-------|---------------------|
| **Ungrouped** | 1:1 to that cam (today) |
| **Group net active** | Hold a **joined** cam’s icon = **same as Hold Group PTT** (whole net). Cam **not** on net = 1:1 or toast “not on group net.” |

Primary = **left Hold Group PTT**.  
Convenience = wall icon on a joined cam does the **same** group talk (not a second product).

### What you see when Joined

- Status: **Radio net · HQ + N**  
- **Hold Group PTT** (press-hold, same mic as today)  
- **Ungroup**  
- Hint: “Field units use their PTT button — all hear”

### What you do **not** do

- No second hidden Join  
- No “group = only reuse old icon with no new chrome”  
- No Call Groups mixed into this MOB  

---

## What we built vs what you want

| Piece | Select 1+ (PASS) | Your product |
|-------|------------------|--------------|
| Pick roster | Done | Keep |
| Join | XML + team list | **HQ + BWCs on one net** |
| Talk UI | Same 1-cam-style icon | **Hold Group PTT** on left |
| BWC→BWC+HQ | Missing | **Required** |

---

## Engine (no invent)

| Path | Exists? |
|------|---------|
| HQ → many cams | Yes |
| Group XML push | Yes |
| Field → other joined BWCs | **No** — mesh in this MOB |
| Hold Group PTT button | **No** — add in this MOB |

---

## APPLY name

**`PTT-GROUP-NET-MESH-AND-TALK-V1`**

1. Join → show **Hold Group PTT** + “HQ + N”  
2. Hold = HQ to full net  
3. Wall icon on joined cam = same group talk  
4. Server: field PTT from joined cam → other joined + HQ  
5. Ungroup clears all  

---

## PASS checklist (later)

| # | Test | Pass |
|---|------|------|
| 1 | Join Chin+kk → left shows **Hold Group PTT** | ☐ |
| 2 | Hold Group PTT → both hear HQ | ☐ |
| 3 | Chin field PTT → kk + HQ hear | ☐ |
| 4 | kk field PTT → Chin + HQ hear | ☐ |
| 5 | Ungroup → button gone; icons 1:1 | ☐ |

---

## APPLY phrase

**`MOB-APPLY PTT-GROUP-NET-MESH-AND-TALK-V1`**

Until then: disc only.
