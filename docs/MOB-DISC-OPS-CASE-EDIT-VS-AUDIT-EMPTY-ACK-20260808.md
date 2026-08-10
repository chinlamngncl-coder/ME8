# MOB DISC — Edit path + audit “Ack’d / empty” signals (Axon-class thinking) (2026-08-08)

**Status:** LOCKED suggestion. Not a menu.  
**You asked:** If someone needs to edit, must they hunt Super admin? When Super admin does daily/weekly audit, does the case show **Ack’d but no inputs**? Think like Axon / Motorola-class ops — stop soft talk.

---

## 1) Edit = find Super admin?

**Normal operator work does NOT need Super admin.**

| Need | Who | How |
|------|-----|-----|
| Add a new note / update after Ack | Operator / supervisor | Evidence → Cases → open case → **Save add-on** (new Rev) |
| Fix a **wrong past note** / delete bad text | Super admin | Same Case → **Edit / Delete** on that note |
| Change verdict / wipe case (later) | Super admin | Same Case |

**Enterprise pattern (Axon Evidence, Motorola CommandCentral-style records):**

- Field users **append** (timeline / notes / supplements).  
- **Altering or deleting** prior entries is privileged (admin / evidence custodian) and always **logged**.  
- You do **not** make every typo wait for Super admin — you **add a correcting note** (“Correcting earlier note: …”).  
- Super admin is for **true amend/redact/delete**, not for routine follow-up.

**Locked ME8 rule:**

1. **Prefer append** — operator always allowed to add Rev note.  
2. **Edit/Delete past** — Super admin only.  
3. **No “hunt admin” for normal work** — only when something must be erased or rewritten in place.

If a supervisor needs frequent in-place edits, that person should be **Super admin** (or later a dedicated “evidence admin” role). We do **not** invent a third fuzzy role in this disc — reuse Super admin until ship asks otherwise.

---

## 2) Daily / weekly Super admin audit — what must the list show?

**Yes. Empty Ack must be visible.** Silent Ack with no follow-up is a risk signal (Axon-class review queues flag incomplete / unreviewed items).

### List badges (locked — Cases desk will show these)

| Badge | Meaning |
|-------|---------|
| **Ack’d** | Closed from live alarm (or equivalent) |
| **No input** | Ack’d (or closed) and **zero add-on notes** since close |
| **Has notes** | ≥1 add-on note |
| **Needs review** | Optional filter: Ack’d + no input **and** older than X hours (default **24h** for daily; **7d** aging for weekly sweep) |
| **Amended** | Super admin edited/deleted a past note (Rev shows it) |

Super admin daily audit path:

1. Evidence → Cases  
2. Filter **Needs review** (or sort: Ack’d + No input first)  
3. Open case → either leave (true quiet event) or add note / escalate  
4. Weekly: same filter + older than 7 days still empty  

**Case header** always shows something like:

`Ack’d · No input` or `Ack’d · 2 notes · Rev 3 · last touch: user @ time`

So audit does **not** open every file blind.

---

## 3) What “world class” products do (compressed)

| Practice | Axon / Motorola-class | ME8 lock |
|----------|------------------------|----------|
| Field adds context | Append to chain | Add-on note = new Rev |
| Change history | Immutable audit / chain of custody | Touch log + Rev; edit/delete privileged |
| Supervisor review | Queues / filters for incomplete | **Ack’d + No input** badge + Needs review filter |
| Live alert UI | Not the evidence office | Toast = alarm only; Cases = office |
| Scope | Role / agency / unit | Dispatch team scope |

We are not copying vendor UI chrome; we copy **append-first + privileged amend + incomplete queue**.

---

## 4) End-to-end (no ambiguity)

```text
Alarm toast → Ack
     ↓
Case created: status=acked, notes=0  → badge "Ack’d · No input"
     ↓
Operator opens Evidence → Cases → adds note  → badge "Has notes", Rev++
     ↓
Typo in old note → operator adds correcting note (preferred)
     OR Super admin Edit/Delete (rare, logged, Amended)
     ↓
Super admin daily: filter Needs review → clear empties or accept quiet
```

---

## 5) Build (already ordered — unchanged)

Server store → Cases desk UI (with badges/filters) → Weapon migrate → FR → ANPR → SOS link.

When Cases UI is built, **Ack’d · No input** and **Needs review** ship in that desk MOB — not as a separate philosophy debate.

---

## What you do

`MOB-APPLY OPS-CASE-SERVER-STORE-V1` when ready to build storage.  
UI badges ship with `OPS-CASE-UI-DESK-V1` right after.
