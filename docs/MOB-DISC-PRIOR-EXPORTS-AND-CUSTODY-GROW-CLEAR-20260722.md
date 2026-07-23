# MOB DISC — Growing Prior exports / custody — how to clear?

**Status:** APPLIED 2026-07-22 — see `MOB-APPLIED-REDACT-PRIOR-EXPORTS-CLEANUP-V1-20260722.md`  
**Mode:** Applied — `MOB-APPLY REDACT-PRIOR-EXPORTS-CLEANUP-V1`  
**Search:** `clear prior exports`, `delete redacted`, `custody grow`, `list keeps growing`  
**Trigger:** Screenshot of long **Prior exports** list; operator asks how to clear because it will keep growing (said “custody”).

---

## Two lists — do not mix them

| List on evidence detail | What it is | Grows when | Can you “clear” today? |
|-------------------------|------------|------------|-------------------------|
| **Prior exports** (your screenshot) | Redacted / trim **copies** of this clip | Every successful **Save redacted copy** | **No UI** to delete today |
| **Custody trail** (below / separate block) | **Audit history** (who opened / redacted / finalized) | Real actions on this file | **Must not wipe** for legal ops — display already capped |

Your screenshot is **Prior exports**, not custody. Both can feel “growing forever.” Answers differ.

---

## Prior exports — yes, it grows

Every **Save redacted copy** creates:

- A new row in the catalog (`evidence_exports`)  
- A new file under `storage\evidence-exports\{fileId}\EXP-…_redacted_….mp4`  

That is why one source clip (`20260707223538-00N…`) can show **many** `[Redacted]` rows — especially after dead-loop Save-again.  
**0707 in the name** = source clip id, not “system stuck on July 7.”

### Today (no clear button)

| Action | Available? |
|--------|------------|
| Delete one Prior export from UI | **No** |
| Bulk clear pending drafts | **No** |
| Server API for operator delete | **No** (DB helper `deleteEvidenceExport` exists in code — **not wired** to a button) |
| Download Finalized | **Yes** (when status Finalized) |
| Leave Note pending forever | **Yes** — they stay until cleaned or finalized |

So: **without a new MOB, the list only grows** (or stays). IT could delete files + DB rows by hand — not an operator path.

---

## Custody trail — different rules

| Fact | Detail |
|------|--------|
| Purpose | Legal / ops **audit** of what happened to this evidence |
| Display | Last ~**30** events (`CUSTODY_LIMIT`) — UI does not dump infinite history on screen |
| Full store | Audit log / catalog — grows with real work |
| “Clear custody” | **Wrong product default** — wiping audit looks like tampering |

Do **not** build a casual “Clear custody” for daily declutter. If customers need retention (e.g. purge audit after N years), that is a **separate compliance MOB** with counsel, not a tidy button next to Prior exports.

---

## What we should add (recommended)

**Name:** `REDACT-PRIOR-EXPORTS-CLEANUP-V1`

### In scope (Prior exports only)

1. Super-admin controls on each Prior exports row (or bulk for **Note pending** only):  
   - **Remove draft** (pending / not finalized) → delete catalog row + file on disk + audit `evidence.redact_export_removed`  
2. Optional: **Remove finalized** only with typed confirm (“DELETE”) — higher risk; default = drafts only in v1.  
3. Banner when N>5 pending: “N draft redacts — Clean drafts” one click (confirm).  
4. Never auto-delete. Never clear custody trail in this MOB.

### Out of scope

- Clearing custody / audit_log  
- Auto-retention cron (later)  
- Renaming 0707 source filenames  

### Risk

Medium — delete is irreversible for that export copy (original evidence stays). Super-admin + confirm + audit required.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Remove one Note pending → gone from list + file gone from `evidence-exports` | ☐ |
| 2 | Finalized row not removable in v1 (or only with strong confirm if included) | ☐ |
| 3 | Original source clip still in library | ☐ |
| 4 | Custody still shows remove action as audit line | ☐ |

---

## Operator today (before APPLY)

1. **Do not Save again** unless you need a new burn — each Save adds a row.  
2. Use **Finalized → Download** for the copies you need (top Finalized rows in your shot).  
3. Leave old **Note pending** rows until **`REDACT-PRIOR-EXPORTS-CLEANUP-V1`** — or ask IT to delete specific `EXP-…` folders only if you accept manual ops.  
4. Custody list: ignore for declutter; it is history, not trash.

---

## Also still open (Download visibility)

If Download is hard to see:  
`MOB-DISC-REDACT-NO-DOWNLOAD-AFTER-FINALIZE-0707-20260722.md` →  
**`REDACT-DOWNLOAD-AFTER-FINALIZE-VISIBLE-V1`**

Suggested order:

1. `REDACT-DOWNLOAD-AFTER-FINALIZE-VISIBLE-V1` (find Download)  
2. `REDACT-PRIOR-EXPORTS-CLEANUP-V1` (clear draft pile)

---

## Ask

- Cleanup drafts when ready: **`MOB-APPLY REDACT-PRIOR-EXPORTS-CLEANUP-V1`**  
- Clearer Download first: **`MOB-APPLY REDACT-DOWNLOAD-AFTER-FINALIZE-VISIBLE-V1`**
