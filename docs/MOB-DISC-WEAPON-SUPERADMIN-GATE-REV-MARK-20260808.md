# MOB DISC — Super Admin gate + “Rev” mark (can’t fake) (2026-08-08)

**Status:** disc only. **`WEAPON-ADDON-SUPERADMIN-GATE-V1` HELD** until you lock this design.  
**You asked:** Super Admin for add-on / edit / changes; force a **heading mark** on the file name (like **Rev**) so nobody can fake it; audit can see Rev1 → Rev2 → … are real edits on the first case. How do enterprises do it?

---

## Short answer

**Yes, we can do Rev.**  
**No — do not trust the operator typing “Rev2” into a filename.** Anyone can rename a file. That is not enterprise-grade.

Enterprise pattern = **system assigns the Rev**, stores it in an **immutable audit chain**, and shows “Rev 2 of case X” in the UI. The human cannot edit that stamp without Super Admin (or at all).

---

## How enterprise usually does it (plain)

| Piece | What it means |
|-------|----------------|
| **Case ID** | Fixed forever when the hit is first closed (e.g. `WD-20260808-…`). Operator cannot change it. |
| **Rev number** | Integer **1, 2, 3…** assigned by **server** on each approved change. Not typed by user. |
| **Immutable log** | Each Rev stores: who, when, what changed (note text / fields), previous Rev link. Old Rev **never overwritten** — new Rev appended. |
| **Display mark** | UI shows badge **Rev 3** (and maybe softform title `Case … · Rev 3`). Looks like a heading; **not** a free-text filename. |
| **Integrity** | Optional later: hash of Rev payload so tampering shows. Lab can skip hash in v1. |
| **Who may bump Rev** | Operators can **add-on note** (new Rev) *or* only Super Admin may **edit / delete / change verdict** — your gate. |

So audit does **not** compare “two files on disk with Rev in the name.”  
They open **one case** and see **Rev list**: Rev1 (ack) → Rev2 (add-on note) → Rev3 (edit) with user + time each.

That matches “2 files or more edited onto the first one” — as **revisions of one case**, not duplicate fake-named files.

---

## What we have today (lab)

- History + Case + add-on notes + touch log in **browser sessionStorage**  
- Username from signed-in header  
- **No** Super Admin gate yet  
- **No** server Rev numbers  
- Operator could, in theory, clear session storage (lab limit) — not enterprise locked yet  

Super Admin role already exists in ME8 (`super_admin` vs `operator`).

---

## Proposed product lock (for next APPLYs)

### A — Gate (who may do what)

| Action | Operator | Super Admin |
|--------|----------|-------------|
| Ack / Dismiss / Open snap | Yes | Yes |
| Add-on **new note** (creates next Rev) | Yes | Yes |
| **Edit** an old note / change closed reason / delete case | **No** | **Yes** (gate) |
| Override FP ↔ real (later) | No | Yes |

### B — Rev mark (system, not fakeable filename)

On each saved change that matters:

1. Server (or, until server case store exists: **client still append-only** with `rev` auto-increment — interim) sets `rev = lastRev + 1`.  
2. UI heading: **`Weapon case · Rev N`** (fixed style).  
3. Touch log line: `Rev N · username · time · addon|edit|…`  
4. Operator **cannot** type or rename the Rev field.

**True “can’t fake”** needs **server-side case store** (not only sessionStorage). Recommend:

1. Gate UI first (role check) — still valuable.  
2. Then `WEAPON-CASE-REV-SERVER-V1` — persist cases + Rev on server so clearing the browser does not erase audit.

---

## Arranged MOB names

| # | APPLY | What |
|---|-------|------|
| **HELD** | `WEAPON-ADDON-SUPERADMIN-GATE-V1` | Block edit/delete of past notes unless `super_admin`; operators only **add** new add-on (new Rev) |
| next | `WEAPON-CASE-REV-MARK-V1` | Auto Rev N on each add-on/edit; show heading badge; append-only (client interim OK) |
| later | `WEAPON-CASE-SERVER-STORE-V1` | Persist case + Rev + audit on server (real can’t-fake) |

**Recommendation:** confirm gate rules above → APPLY gate → then Rev mark → then server store when you want hard evidence grade.

---

## What you do

1. Say if gate table is **PASS** (or change: e.g. “operators cannot add-on either — Super Admin only”).  
2. Then: `MOB-APPLY WEAPON-ADDON-SUPERADMIN-GATE-V1`  
3. After PASS: `MOB-APPLY WEAPON-CASE-REV-MARK-V1`

No code in this turn.
