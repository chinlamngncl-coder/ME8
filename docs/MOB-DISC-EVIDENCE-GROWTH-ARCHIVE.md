# MOB DISC — Evidence growth: pagination vs archive / FTP

**Status:** Reference after `mob-evidence-catalog-pagination`.  
**Search:** `archive`, `FTP dock`, `NAS`, `catalog pages`

---

## Two different problems

| Problem | Fix |
|---------|-----|
| **List too long to browse** | Pagination (Previous / Next) — **shipped** |
| **Disk / cases keep growing forever** | Archive policy + where files live (FTP dock → local/NAS) — **not** “delete from library by default” |

Pagination does **not** remove files from disk. It only pages the index UI.

---

## What already exists (do not confuse)

| Piece | Role |
|-------|------|
| **Dock FTP upload** | Cameras / docks push files into FTP root → indexed in Evidence Library |
| **Evidence → Storage** | Local path + optional **network archive (NAS/SAN)** mount |
| **`archivePrimary`** | Prefer local vs network path for storage roots |
| **Catalog index (SQLite)** | Remembers file IDs even if a path is briefly missing |

There is **no** “Take off library → move to FTP archive folder → hide forever” one-click today. That would be a **new MOB** if you want lifecycle (e.g. cold archive after N days).

---

## Growth SOP (enterprise)

1. Dock uploads land via FTP → Library lists them (paged).  
2. IT mounts NAS and sets Storage to **network archive** when local disk fills.  
3. Index stays searchable (tags + pages). Files stay addressable if path is on archive mount.  
4. Optional later: retention / cold-tier MOB — only after policy (years to keep, who may purge).

**Key:** Cases grow on **storage + index**. UI pages. Archive = where bytes live, not “un-list from catalog.”

---

## Next MOB (only if you ask)

`mob-evidence-cold-archive` — explicit move/mark cold + still find by ID/tag; never silent delete.
