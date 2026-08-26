# MOB-DISC — VMS Command Spatial Shell (Brainstorm)

**Status:** DISCUSSION ONLY — not locked, not APPLY  
**Date:** 2026-08-20  
**Parties:** Operator + Cursor agent + Google AI (pending)  
**Product:** Mobility Axiom — unified BWC + Fixed Cam VMS (no peer product exists in this form)

---

## 1. Problem we are solving

We already have:

- **Live Ops** — GIS map + BWC GPS + outdoor / street fixed cams (ops design for field officers).
- **Fixed cameras** — many indoor: floors, exits, entrances, lobbies. Same building ≈ same lat/lon. Floor plans + pin placement required.
- **Backend VMS spine** — volumes, NAS writer, timeline/stream APIs, sites/zones, case cart, forensic playback UI (isolated).

If we put all indoor cams on Ops GIS, we get a **pin storm** and break BWC ops. If we build a second island app, we lose the **one incident** story.

We are designing something operators have not seen as one product: **mobile BWC ops + enterprise indoor VMS** in one Axiom shell.

---

## 2. Working recommendation (agent — for debate, not locked)

### Two maps, two jobs

| Surface | Job | What belongs there |
|---|---|---|
| **Ops GIS** | Officers in the field | BWC GPS, street / outdoor fixed cams with real lat/lon |
| **VMS floor plan** | Inside a building | Indoor cams, doors, alarms at **normalized x%/y%** on uploaded plan |

Same site = one GIS point (building) + many floor pins. Different layers. **Never** store live BWC x/y on `bwc_devices` (already rolled back in migration 024).

### Preferred shell: **VMS Command tab** (not Ops rewrite, not Command Wall as editor)

- Left: Site → Zone / Floor → camera tree + search  
- Center: **one map at a time** — site click → GIS; floor click → floor plan  
- Live tiles / alarm strip from selected branch  
- Forensic playback stays on isolated playback page  
- Command Wall stays **watch grid** only — do not dump floor upload + pin drag there  
- Pop-out (floor / playback) = later dual-monitor option, not primary path  

### Share with BWC / Ops via **context**, not one mashed canvas

- Outdoor cam with GPS → Ops GIS **and** VMS site GIS (same stream)  
- Indoor cam → VMS floor only  
- Alarm → VMS pin + nearest live BWC by GPS; optional “open officer on Ops”  
- Case / Evidence Cart already mixes BWC + fixed — keep one evidence spine  

---

## 3. Open brainstorm (must discuss with Google AI)

### 3.1 Map multi-select (circle / rectangle / lasso)

**Idea:** On GIS or floor plan, draw a **circle, rectangle, or polygon** → open all cams whose pins fall inside → one batch live grid (or Command Wall handoff).

**Questions for the three parties:**

- Does multi-select live on **VMS Command only**, or also on Ops GIS for outdoor clusters?  
- Cap how many tiles open at once (license / browser memory / FLV pool)?  
- Floor plan: select by pin hit-test in x%/y% space — same UX as GIS?  
- After select: open in VMS tile strip, or push IDs to Command Wall?  

**Why it matters:** Control-room operators already think in “open this area,” not “click 12 tree nodes.”

### 3.2 Analytics-driven auto-open (fixed-cam alert cascade)

**Idea:** When analytics fires on one (or two) fixed cams (weapon / FR / ANPR / motion / line-cross):

1. Auto-open the alerting cam(s).  
2. Auto-open **nearest** related cams (graph or distance on floor plan / GIS).  
3. Prefer **exits / entrances / choke points** on the same floor or toward likely escape path.  
4. Optionally surface nearest **live BWC** toward that site.

**Questions:**

- Is “nearest exit” a **static graph** (admin tags cams as Exit / Entrance / Corridor) or pure geometric nearest neighbor on the floor plan?  
- Do we store a simple **adjacency graph** (cam A → B, C) per floor? That is how real VMS products win pursuits — not GPS alone indoors.  
- Two simultaneous alerts in different buildings: two cascades, or operator focus lock on newest / highest severity?  
- Operator override: cascade can be dismissed; never steal the whole Ops wall without consent.  
- License / entitlement: auto-cascade only when analytics modules are licensed?  

**Pursuit narrative (product story):**  
Alert on Lobby Cam 3 → auto Lobby Cam 4 + Stair B + Exit North + nearest BWC → operator watches where the subject is running **without hunting the tree**.

### 3.3 GIS + floor upload in one command station

Already sketched in §2. Still open:

- Admin: upload floor plan, drag pins, assign zone — **right slide-out on VMS Command**, or Settings-only?  
- Operator vs Super Admin: who may move pins?  
- Tablet long-press parity later?  

### 3.4 Pop-out vs in-tab

- Single monitor: everything in **VMS Command tab**.  
- Dual monitor later: pop-out floor plan and/or playback.  
Do not require pop-out for v1.

### 3.5 What we must not forget

- Growing-file rule: `recording` segments → live FLV, not historical stream (409).  
- Rough snip on VMS timeline → Case Cart → **existing** Evidence trim / redact (no second editor).  
- Zone RBAC on tree / timeline / stream.  
- No absolute NAS paths to the client.  
- Forbidden UI words / brand rules still apply.  

---

## 4. Proposed build order (after three-party agree)

| Order | Candidate MOB | Scope |
|---|---|---|
| A | `VMS-COMMAND-TAB-SHELL-V1` | Tab + tree + GIS/floor swap shell only |
| B | Floor pin admin (upload + drag) | Settings or slide-out |
| C | Live tile strip from tree selection | FLV via existing AxiomFlvManager |
| D | Map multi-select (rect / circle) | Batch open capped |
| E | Alert cascade + exit graph | Analytics → auto-open neighbors |
| F | Pop-out dual monitor | Optional polish |

Do **not** start code until operator says the exact `MOB-APPLY …` after Google discussion.

---

## 5. Decision log (fill after Google returns)

| Topic | Cursor lean | Google lean | Operator lock |
|---|---|---|---|
| VMS Command tab vs Ops-only vs Wall-only | Tab | | |
| Indoor cams never on Ops GIS | Yes | | |
| Multi-select shape tool | Yes (VMS first) | | |
| Exit / adjacency graph for cascade | Strong yes | | |
| First APPLY name | `VMS-COMMAND-TAB-SHELL-V1` | | |

---

## 6. One-line pitch (sales / internal)

**Mobility Axiom is the first ops shell that runs body-worn GPS and building-floor VMS as two spatial languages under one incident and one evidence cart — with area-select open and analytics-driven chase of exits and nearest officers.**

---

*End of disc. Update §5 when Google AI feedback arrives. No product edits from this file alone.*
