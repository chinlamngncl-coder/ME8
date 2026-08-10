# MOB DISC — Super Admin gate + where records live / search (2026-08-08)

**Status:** disc only. No APPLY / no code this turn.  
**Focus:** Gate is fine later — but **same folder + similar names + many users’ times** will confuse search. How do we keep records clear?

---

## Your worry (fair)

If everything dumps into **one pile / one folder**:

- Similar cam names (`kk`, `kk`, …)  
- Similar times from **different operators**  
- Many Rev notes on many hits  

→ Search and audit become a mess. Correct.

---

## Do **not** do this

| Bad idea | Why |
|----------|-----|
| One flat folder of files named by cam or “Rev2.jpg” | Name collisions; easy to fake/rename |
| One browser list with no unique ID | Hard to search; hard to prove which case |
| Sort only by time | Two users Ack at same second → confusion |

---

## Enterprise-style layout (recommended)

Think **case file**, not “dump in one folder.”

### 1) Unique case ID (always)

When a hit is first closed (Ack / Dismiss / overflow):

```text
WD-20260808-203927-kk-<shortHitId>
```

or simpler lab form:

```text
WD-<date>-<hitId>
```

- **hitId** already comes from the snap (unique per crop).  
- Operator **cannot** choose or edit this ID.  
- Display name can still show friendly `kk · gun · time` — ID is for storage/search.

### 2) Folder / store shape (when we leave sessionStorage)

Not one flat dump:

```text
storage/weapon-cases/
  2026-08-08/                    ← day partition (search by date first)
    WD-20260808-….json           ← one case file (metadata + Rev chain)
    WD-20260808-…/               ← optional attachments later
      rev-001-note.txt           ← optional; or all inside the JSON
      snap-ref.json              ← points at crop path, does not rename crop
```

**Same day folder is OK** — many enterprises partition by **date** (or site/site-id).  
Confusion is avoided by **unique case ID inside**, not by inventing creative filenames.

Crops can stay where they already live (`weapon` crop API path); the **case record** points to them. Do not copy/rename snaps as `Rev2_kk.jpg`.

### 3) What one case JSON holds (clear for audit)

```text
caseId
camId / deviceName
hit time
closedBy / closedAt / reason
revs: [
  { rev: 1, user, at, action: ack },
  { rev: 2, user, at, action: addon, note: "…" },
  { rev: 3, user, at, action: edit, … }   ← Super Admin only
]
```

Search then filters on fields, not “guess the filename”:

- by **date**  
- by **camera**  
- by **user** (who Ack’d / who added note)  
- by **case ID**  
- by **class** (gun / knife)  
- by **text in notes**

### 4) UI so humans are not confused

History list columns (simple):

| Case ID (short) | Cam | Class | Hit time | Closed by | Last Rev | Last touch user |

Click → Case page with Rev chain (who/when each).  
**No** two operators’ notes looking like two unrelated files with the same cam name.

---

## Super Admin gate (same disc — still held)

| Action | Operator | Super Admin |
|--------|----------|-------------|
| Ack / open / add-on **new** Rev note | Yes | Yes |
| **Edit / delete** past Rev or wipe case | No | Yes |

Gate does **not** solve folder chaos by itself — **case ID + day partition + search fields** do.

---

## Lab today vs next

| Now | Later (named MOBs) |
|-----|---------------------|
| sessionStorage history (one browser) | `WEAPON-CASE-SERVER-STORE-V1` — day folders + case JSON |
| Touch log + notes | Auto **Rev N** + caseId |
| No search box | History search: date / cam / user / caseId |

**Recommended order after you PASS this disc:**

1. `WEAPON-ADDON-SUPERADMIN-GATE-V1` — role gate only (still session store)  
2. `WEAPON-CASE-REV-MARK-V1` — caseId + Rev N in UI  
3. `WEAPON-CASE-SERVER-STORE-V1` — real folders under `storage/weapon-cases/YYYY-MM-DD/` + search  

Or jump **2+3** sooner if search/confusion is the bigger pain than the gate.

**Recommendation:** lock storage shape (day + unique caseId) **before** or **with** Rev; gate can ship first as UI-only if you want a quick win.

---

## What you decide

1. **Folder model PASS?** Day partition + one JSON per caseId (not flat rename pile).  
2. **Gate table PASS?**  
3. Next APPLY name you want first:  
   - `WEAPON-ADDON-SUPERADMIN-GATE-V1` or  
   - `WEAPON-CASE-REV-MARK-V1` / server store first  

No code until you APPLY one named step.
