# MOB DISC — Tactical Basic / Command, load, manuals, MOB queue

**Date:** 2026-07-26  
**Status:** **LOCKED** — discuss only until named `MOB-APPLY`  
**Roadmap home:** after Phase 3 wrap; before Phase 4 (Phase 4 still PAUSED)

---

## Locked product facts (capacity)

| Plan | Map pin live | Overwatch | Glass markers / View | Live decode total |
|------|--------------|-----------|----------------------|-------------------|
| **Basic** | **8** | Off | — | **8** |
| **Command Tactical** | **16** | On (**+1** roof PTZ) | up to **~6** per View (labels only, not extra streams) | **17** |

- Views may **share** the same cams (overlap coverage). Shared markers ≠ extra live streams.
- **Do not** pitch one browser running full Ops wall **and** full Command Tactical 17.
- Command Tactical = **dedicated ops desk PC**; Basic = everyday / lighter PC.
- Bandwidth (~28–55 Mbps for 17) is fine on office LAN; risk is **browser CPU/GPU**, not ME8 “hanging the server” alone.

---

## Locked — client manuals (later, when we reach manuals genre)

**Load / capacity chapter is REQUIRED** in user manuals (EN and other ship languages when packing).

**Quality bar (locked):**

- Very professional and **detailed** — not one orphan sentence with “no head, no tail.”
- Readers must understand: Basic vs Command Tactical, what 8 / 16+1 means, Overwatch glass vs live, PC advice, “don’t stack two full walls.”
- Same standard for other manual chapters going forward: full sections (purpose → steps → limits → troubleshooting), not stub lines.

**MOB name (when manuals genre):** `MANUALS-TACTICAL-LOAD-CAPACITY-CHAPTER-V1`  
(Do **not** start until operator opens manuals / ship-manuals work.)

---

## Locked — licensing setup (must build in product)

Extend air-gap `license.lic` / entitlements (Phase 3.1 + 3.4 base) for:

| Entitlement | Basic | Command Tactical |
|-------------|-------|------------------|
| `tacticalPinLiveCap` | 8 | 16 |
| `tacticalOverwatch` | false | true |
| (optional later) `tacticalBlueprint` / `tacticalPopout` | as sold | as sold |

Generator + middleware + UI grey-out / upgrade badge must enforce pin open cap and Overwatch.

**MOB name:** `LICENSE-TACTICAL-BASIC-COMMAND-V1`

---

## Consolidated MOB queue (one APPLY → PASS → next)

### A — Finish Phase 3 (roadmap)

| # | Action | Status |
|---|--------|--------|
| A0 | Operator declares **Phase 3 COMPLETE** (3.1–3.4 product PASS; packaging robot smoke stays parked until ship/pack) | Await you |
| A1 | Do **not** auto-start Phase 4 | Locked PAUSED |

### B — Tactical finish + license (this genre — recommended order)

| Order | MOB | Why | Status |
|-------|-----|-----|--------|
| **1** | `TACTICAL-BLUEPRINT-SIZE-RAISE-V1` | 5 MB → **25 MB** (enterprise 50 MB optional) | **APPLIED** — treat PASS with UI smoke |
| **2** | `TACTICAL-BLUEPRINT-UI-V1` | Super Admin upload / select floor plan in UI | **APPLIED** |
| **2b** | `TACTICAL-BLUEPRINT-PLACE-RESIZE-V1` | Drag / resize / save placement | **PASS** |
| **2c** | `TACTICAL-POI-DRAG-DELETE-CLARITY-V1` | BWC GPS locked; prepared/fixed drag+delete clear | **PASS** (floor plan genre) |
| **2d** | `TACTICAL-BLUEPRINT-CLEAR-REMOVE-V1` | Clear from map + Remove plan | **PASS** |
| **2e** | `TACTICAL-BLUEPRINT-ZERO-RAW-ERRORS-V1` | No raw JSON/HTML on Floor plan status | **PASS** |
| **3** | `LICENSE-TACTICAL-BASIC-COMMAND-V1` | Wire Basic (8) / Command (16+Overwatch) into license + enforce | **APPLIED** — await eyes PASS |
| **4** | `TACTICAL-PIN-LIVE-CAP-FROM-LICENSE-V1` | `CIRCLE_OPEN_CAP` reads entitlement (8 or 16), not hardcode only | **Next** |
| **5** | `TACTICAL-POPOUT-SECOND-MONITOR-V1` | Dual-monitor pop-out (plan already agreed) | Pending |
| **6** | (optional) `TACTICAL-OPERATOR-PERMS-V1` | Who may upload plans / open Tactical | Pending |

**Already exists (no new login MOB):** multi-user Super Admin / Operator in Users. Smoke: create 2nd operator for 2nd desk.

### C — Later genres (not this queue)

| MOB / work | When |
|------------|------|
| `MANUALS-TACTICAL-LOAD-CAPACITY-CHAPTER-V1` | Manuals / ship manuals genre — professional load chapter |
| Phase 4 diagnostics / OTA | Only after you unpause Phase 4 |
| Cloud trial / overseas BWC | Separate later genre |
| Packaging robot live Actions smoke | Ship/pack only |

---

## Operator note

You own: restart / refresh / PASS-FAIL on what you see.  
Agent owns: one named APPLY at a time, verify, cache bust, no park of WVP handoff.

**Next concrete ask:** eyes **PASS** on license Basic/Command (Overwatch grey vs Tactical open), then  
`MOB-APPLY TACTICAL-PIN-LIVE-CAP-FROM-LICENSE-V1`.  
Generator disc: `MOB-DISC-LICENSE-GENERATOR-BASIC-COMMAND-20260726.md`.
