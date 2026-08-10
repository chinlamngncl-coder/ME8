# MOB DISC — Where do operators / Super admin touch notes? (2026-08-08)

**Status:** disc only — how the design works (and what is still lab-weak).  
**You asked:** Where do they add / edit / delete? On a ledger? On the notes themselves? Is there a place to work? Super admin only at the end? We must **not** allow FTP / dig in storage folders to change notes.

---

## Plain answer

| Who | What they do | **Where** (in the product UI) |
|-----|----------------|-------------------------------|
| **Operator** | **Add** a new note only | Dashboard → Weapon toast/History → **Case** → type in “Add-on note” → **Save add-on** |
| **Super admin** | **Edit** or **Delete** a **past** note | Same **Case** screen → on each saved note row → **Edit** / **Delete** buttons (operators do **not** see these) |
| **Nobody** | Edit notes via FTP / Explorer / raw disk | **Not allowed by design** — notes are not a free-floating text file you “fix” on the PC |

There is **one place to work:** the **Case** panel inside Mobility Axiom (History → Case).  
Not a separate “ledger app.” Not FileZilla. Not opening JSON on the storage disk by hand.

---

## What you see today (Weapon — already built)

1. Weapon alert → **Ack** (or Dismiss / overflow) → goes to **History**.  
2. Click **History** (toast / orange bar / floating button).  
3. Click a row → **Case**.  
4. Screen shows:
   - **caseId · Rev N** (system mark)
   - **Add-on note** box + **Save add-on** (everyone who can open Case)
   - **Notes** list (all add-ons so far)
   - **Touch log** (who / when / action / Rev)
5. If signed in as **Super admin**, each note also shows **Edit** and **Delete**.  
   If **Operator**, those buttons are **hidden** — they can only save a **new** note.

So: work happens **on the notes inside the Case UI**, not “on the ledger itself” as a second product. History list = index; Case = the file you work in.

---

## Design rule: UI is the only legal door

```text
Operator / Super admin
        │
        ▼
  Browser dashboard (Axiom)
        │
        ▼
  Case API / case store   ← only this writes Rev + notes + audit
        │
        ▼
  storage (server-side JSON later)
```

**Forbidden paths (policy + product):**

| Path | Allowed? |
|------|----------|
| Case UI Save / Edit / Delete | Yes (Edit/Delete = Super admin) |
| FTP into crop/note folders and rewrite text | **No** |
| Open `storage\…` on the PC and edit JSON by hand | **No** (ops policy; not a supported workflow) |
| USB copy of “notes.txt” as source of truth | **No** |

Snaps (JPEG crops) may still live on disk for display — that is **evidence image**, not the editable note ledger. Notes live in the **case record** (today: browser session; next: server file only the app writes).

---

## Lab honesty (important)

**Today:** case notes sit in **browser sessionStorage** (this PC, this browser session).  
- Super admin gate is enforced **in the UI** (role from login).  
- A tech who clears browser data or hacks DevTools can still mess with lab data — **not** enterprise-hard yet.

**Enterprise-hard (next MOB):** `OPS-CASE-SERVER-STORE-V1`

- Case JSON only written by **server APIs** after auth + role check.  
- Edit/Delete endpoints reject non–super_admin even if someone fakes the UI.  
- Disk files under `storage/ops-cases/…` are **app-owned**; operators never get FTP to that tree.  
- Audit still shows who/when; Rev still system-assigned.

Until that store ships, treat Weapon Case as **lab workflow rehearsal**, not court-grade seal.

---

## FR / ANPR / SOS (same idea, not built yet)

Same **door**:

- Each kind gets a Case (or SOS **links** existing SOS ledger into a case).  
- Operators add notes in UI.  
- Super admin edit/delete in UI.  
- **No** FTP into those records.

Unify disc: `MOB-DISC-OPS-CASE-UNIFY-WEAPON-FR-ANPR-SOS-20260808.md`

---

## One picture

```text
[History list]  →  [Case WD-… · Rev 3]
                      │
                      ├─ Add-on note + Save     ← Operator + Super admin
                      ├─ Notes list
                      │     └─ Edit / Delete    ← Super admin only
                      └─ Touch log (read-only)
```

**Not:**

```text
FTP → storage/notes/kk_rev2.txt   ← never
```

---

## What you do

1. Hard refresh → Ack a hit → History → **Case** — that is the workplace.  
2. Login as operator vs Super admin to see Edit/Delete appear/disappear.  
3. When you want hard server lock: `MOB-APPLY OPS-CASE-SERVER-STORE-V1`

No code this turn.
