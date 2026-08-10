# MOB DISC — OPS-CASE-ARCHIVE-HIDE-V1 APPLY (2026-08-09)

**Status:** APPLIED. Real soft-archive — **not** a fake client-only hide.

---

## What is real

| Behavior | Implementation |
|----------|----------------|
| Archive | Writes `archivedAt` + `archivedBy` on the **same** case JSON under `storage/ops-cases/…` |
| Default list | API `archive=active` (default) **excludes** archived cases |
| See archived | List filter **Archived only** or **All** |
| Restore | Clears `archivedAt` / `archivedBy`; case returns to Active list |
| Audit | `case.archive` / `case.unarchive` in case touch log |
| Media | **Not** deleted — Library / FTP / evidenceLinks stay |
| Who | **Super admin** only (server + UI). Operator cannot archive |

---

## Not this APPLY

- Hard delete / clear-all  
- 7-day deletion queue (evidence files)  
- Moving JSON to a different folder (flag is enough; find-by-id stays reliable)

---

## Operator / manual test (must pass)

1. Restart Fleet → hard refresh → login as **Super admin**.  
2. Evidence → Cases → open a case → **Archive (hide from list)** → confirm.  
3. List filter **Active** → that case **gone**.  
4. Filter **Archived only** → case **there**; status **Archived**.  
5. Open it → **Restore to active list** → back on Active.  
6. Open the JSON under storage `ops-cases` after archive: must show `"archivedAt": "…"`.  
7. Non–super-admin: Archive buttons hidden; POST `/archive` returns 403.

---

## Files

- `lib/opsCaseStore.js`  
- `server.js`  
- `public/js/ops-cases-ui.js`  
- `public/index.html` / `css/global.css` / `locales/en.json`  

---

## Manuals later

Document: Archive = hide from Active desk, keep on disk; Restore = bring back; Super admin; does not erase video.
