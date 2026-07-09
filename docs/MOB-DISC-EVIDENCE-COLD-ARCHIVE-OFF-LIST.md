# MOB DISC — `mob-evidence-cold-archive-off-list`

**Status:** DISC only — **decision locked**. No code until `MOB-APPLY mob-evidence-cold-archive-off-list`.  
**Risk:** **2** — Evidence Hub + disk move / meta only. No wall · PTT · SIP · SOS.  
**Search:** `cold archive`, `take off list`, `active catalog`, `restore evidence`

---

## Product rule (plain)

**Archive = take off the day-to-day Library list. File and ID still exist.**

| Action | Result |
|--------|--------|
| **Archive** | Leaves **Active** list; appears under **Archived**; bytes on archive path / NAS if configured |
| **Restore** | Back on **Active** list |
| **Delete forever** | **Not in this MOB** |

Never silent purge. Audited only.

---

## Operator path

1. Evidence → **Evidence Library** (Active — default)  
2. Open file → **Archive** (super-admin or `evidenceEdit` — same as tags edit for v1; prefer **super-admin only** if tighter)  
3. Confirm short dialog: “Remove from active library. File kept in archive.”  
4. Row gone from Active; visible under **Archived** filter/tab  
5. From Archived detail → **Restore to library** if needed  

Catalog Tag filter + pagination apply to **current view** (Active or Archived).

---

## Technical sketch

### Status
Prefer extend existing `storage_tier` / sync fields rather than a second boolean if clean:

| Value | Meaning |
|-------|---------|
| `local` / current | Active (today’s behaviour) |
| `archived` | Cold — hidden from default Active catalog |

Or dedicated `archived_at` + `archived_by` on `evidence_meta` / `evidence_files` — pick one on APPLY; do not invent both overlapping flags.

### Bytes
1. Resolve current path via `evidenceRegistry.resolveFilePath`  
2. Decrypt **not** required for move if moving MEV1 blob as-is (keep ciphertext intact)  
3. Destination:  
   - If network archive (NAS) configured → under that root `/archived/…`  
   - Else `storage/evidence-archive/…` (or FTP sibling folder under ship policy)  
4. Update catalog `relative_path` + tier so preview/download still use `pipeDecrypted`  
5. If move fails → **abort**, file stays Active, error shown  

### API (illustrative)
- `POST /api/evidence/detail/:fileId/archive` — audit `evidence.archive`  
- `POST /api/evidence/detail/:fileId/restore` — audit `evidence.restore`  
- Catalog: `?status=active|archived` (default `active`); pagination unchanged  

### UI
- Library toolbar: **Active** | **Archived** (or status select)  
- Detail: Archive / Restore button  
- en locale first; other langs later  

### Forbidden
- `video-wall.js`, PTT, SIP, SOS ingest  
- Rewrite encrypt-on-upload  
- Auto-delete after N days (separate MOB: `mob-evidence-retention-purge`)  

---

## Risk

| Failure | Mitigation |
|---------|------------|
| Move mid-read | Fail closed; keep Active |
| Wrong path / NAS down | Abort; operator message |
| Operator thinks “gone forever” | Dialog + Archived view always available to permitted roles |
| Missing restore | Restore required in same MOB |

---

## Bench after APPLY (evidence only)

1. Restart → hard refresh  
2. Archive one file → gone from Active; appears in Archived  
3. Preview still works from Archived  
4. Restore → back on Active  
5. Audit shows archive + restore  
6. Tag filter + Next/Prev still work on both views  

Reply **PASS** / **FAIL**.

---

## Growth context

FTP dock = ingest. NAS Storage = where volume lives.  
This MOB = **lifecycle off Active list**.  
Pagination = browse. Archive = shrink the **active** working set without losing evidence.

See also: `MOB-DISC-EVIDENCE-GROWTH-ARCHIVE.md`.

---

## Next

Reply: **`MOB-APPLY mob-evidence-cold-archive-off-list`**
