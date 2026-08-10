# MOB DISC — Bind evidence · where files live · retention the Axon way · MOB-by-MOB (2026-08-09)

**Status:** LOCKED design. **No code this turn.**  
**`.cursorrules`:** UI + CREDIT-LEAN. Do not gut Evidence UI when we APPLY later.  
**Sources checked:** Axon Cases / Categories retention / Evidence delete-queue help (2026).

---

## 1. Your bind question — still JSON after Library?

**Partly right — two layers:**

| Layer | What it is | Where |
|-------|------------|--------|
| **Case record (ticket)** | Still a small durable record (JSON today; DB later OK) — id, status, notes, **links** to files | App storage `ops-cases/` |
| **Evidence files (video/photo)** | Real media bytes | **User-assigned** Storage / FTP / Library path (Evidence → Storage — you already set this) |
| **Bind** | Case JSON gains `evidenceLinks[]` (file ids / paths) — player opens Library files. **Does not** stuff video into JSON |

```text
Case JSON  =  index card + links
Library    =  the actual clips (your FTP / storage root)
Redacted Exports = safe copies (also files on evidence store)
```

**So:** Library does **not** replace JSON. Bind = **join** them. Saving media = write to **configured storage**, not into the case JSON blob.

---

## 2. “User storage / FTP + local vault only Super admin” — are you right?

**Yes — that is the right product shape:**

| Store | Who | Job |
|-------|-----|-----|
| **Agency storage / FTP** (you set) | Ops + dock | Day-to-day Library / dock ingest / case-linked clips |
| **Local / internal vault** (app-controlled path) | **Super admin only** | Sensitive hold, lab purge tools, maybe queued-delete holding area, system case JSON, audit packs |

Ordinary operators: work in Evidence Library + Cases.  
Super admin: Storage settings + vault / retention admin + restore-from-queue.

ME8 already has Storage settings for media roots; **Super-admin-only vault UI** = later APPLY (name below), not invent a second FTP for ops.

---

## 3. How retention is done correctly (how people actually do it)

### Axon pattern (UI — yes, they use UI)

**A. Admin sets policies (not per-file invent every time)**  
- UI: **Admin → Retention Categories** (agency settings)  
- Each **category** = name + retention (e.g. 30 days / 1 year / **Until manually deleted**)  
- Who: users with **Category Administration** permission  

**B. Ops assign category on evidence (UI)**  
- On evidence details / bulk actions: pick **Category**  
- Category drives “how long keep this file” when **not** protected by a case  

**C. Cases interact with retention (UI)**  
- Create/edit case: set case retention (Until manually deleted / Longest / Specific date / Individual evidence)  
- Evidence **in an active case** is **exempt from auto-delete** until removed from the case (Axon policy text)  
- **Cases are never deleted automatically** (Axon) — status/delete is human  

**D. Delete is not instant (UI)**  
- Delete evidence → status **Queued for Deletion** → **~7 days** → then permanent  
- Admin can **Restore** from queue in that window  
- Evidence details → Retention section shows queued date  
- Dashboard / weekly mail: upcoming deletions (Axon)  

**E. Case delete (UI)**  
- Permissioned Delete on case list → unlinks evidence → evidence then follows **its** category retention (may queue soon)  

### Correct mental model

```text
Category (admin UI)  →  retention clock on FILES
Case membership      →  hold / protect while on case
Delete button        →  7-day queue (undo), then purge
Case archive/hide    →  desk tidy (not same as file purge)
```

---

## 4. How ME8 should follow (same idea, our Evidence chrome)

| Axon UI | ME8 follow |
|---------|------------|
| Admin → Retention Categories | **Settings / Evidence → Retention categories** (Super admin) — name + days or “keep until delete” |
| Assign category on file | Library detail / bind: category dropdown |
| Case protects evidence | While file linked on Case → do not auto-purge |
| Queued for Deletion 7 days | Delete → status Queued → Super admin **Deletion queue** panel → Restore or wait → purge job |
| Case never auto-delete | Archive/hide + optional Super admin delete-one; no auto wipe of Cases |
| Storage path | Keep **your** FTP/Storage for media; vault path Super admin only |

**Not:** hide retention in code with no UI.  
**Yes:** Super admin configures categories; operators assign; system enforces clock + queue.

---

## 5. MOB-by-MOB order (APPLY one at a time)

| # | MOB-APPLY | What |
|---|-----------|------|
| ✅ | `OPS-CASE-OPEN-DESK-V1` | Done — desk shell (player/map/fields) |
| 1 | `OPS-CASE-BIND-EVIDENCE-V1` | Attach Library file ids into case `evidenceLinks`; player plays from storage (JSON stays index) |
| 2 | `OPS-CASE-ARCHIVE-HIDE-V1` | Hide/archive cases from list; keep disk |
| 3 | `EVIDENCE-RETENTION-CATEGORIES-V1` | Super admin UI: categories + days / until-manual |
| 4 | `EVIDENCE-DELETE-QUEUE-7D-V1` | Delete → Queued 7 days → Restore UI (Super admin) → then purge; **never instant wipe** |
| 5 | `OPS-CASE-CLOSE-SETTLE-V1` | Close status; case can hold retention policy field (simple: until-manual / follow evidence) |
| 6 | `OPS-CASE-DELETE-ONE-V1` | Super admin delete one case + confirm + audit (unlink media; do not mass-delete FTP) |
| 7 | `STORAGE-SUPERADMIN-VAULT-V1` | Explicit Super-admin-only local vault path (queue hold / sensitive) vs agency FTP |
| 8 | `OPS-CASE-AUDIT-LOG-V1` | Stronger append-only audit if still thin |
| 9 | `REDACT-LICENSE-GREY-BUTTON-V1` | No license → Redact grey |

**Optional later:** case-level retention picker on desk (mirror Axon four options) after categories exist.

**Do not APPLY “Clear all cases”** as a Cases toolbar MOB.

---

## 6. Bind APPLY scope reminder (when you type it)

`OPS-CASE-BIND-EVIDENCE-V1` only:

- Pick / link Library (and known SOS record ids) onto case  
- Show in desk player  
- Persist links in case JSON  

**Not** in bind: full retention engine, 7-day queue, vault path — those are rows 3–4–7 above.

---

## One line

**JSON = case index + links; media = your Storage/FTP; Super admin vault = yes later. Retention = Admin categories UI + assign on files + case holds delete + 7-day delete queue UI — follow Axon that way, MOB-by-MOB above.**
