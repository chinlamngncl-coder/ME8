# MOB-DISC — Evidence: health button gap, slim tables, ID font, Index hug

**Date:** 2026-08-17  
**APPLY:** `MOB-APPLY EV-STORAGE-TABLE-SLIM-V1`  
**Scope:** Evidence hub only (`#evidence-panel`, `evidence-hub.js`, catalog/cases CSS in `index.html`). **No Settings.** No global `.enterprise-card label`. No Route 650px. No APIs.

## 1) Backup / Optimize stuck under “Index backups”

Overview health (`evidence-hub.js`) puts `#ev-overview-backup` / `#ev-overview-maint` in `.evidence-toolbar` with `margin-top:10px` under the last health row.

APPLY: that toolbar `margin-top: 16px`. Keep both buttons. Do not change Settings.

## 2) Slim library + cases rows

Library Detail cell is **Open** then `<br>` then Available (`evidence-hub.js` catalog map). That forces tall rows. File cell is name + `<br>` + size.

APPLY:
- Detail: one line — Open then Available (`inline-flex; align-items: center; gap: 8px`). No `<br>`.
- `#ev-panel-catalog` and `#ops-cases-table-wrap` cells: padding **6px 10px** (today 12px 16px).
- Header row: `padding-top: 10px` so th is not glued to the wrap edge.
- File: keep name; size on the same line after a middot if it fits (`filename · 2.5 MB`). No extra empty cell padding.

## 3) Case ID / Evidence ID look tiny

Cases: checkbox is column 1; **Case ID is `td:nth-child(2) code` at 13px** vs table 14px, monospace. Library Evidence ID is `td:first-child code` at 13px. Fixed table layout also squeezes the ID column.

APPLY (those two tables only): ID `code` **14px**, same colour as other cells; give the ID column a **min-width** (~11rem) so it does not shrink.

## 4) What Evidence Index is — and the empty well

**Evidence Index is the catalog database on this server** (which files exist, IDs, officer, time) — **not** the video files. Videos stay on disk / NAS / FTP. Library, search, Backup index, and Optimize index all use this catalog.

`#ev-storage-catalog` is only a title + one line (`Stored on this server (evidence index)`). The Storage column **stretches** that last section to fill leftover height → huge empty strip above Save storage.

APPLY: `#ev-storage-catalog` **hug content** (`flex: 0 0 auto; min-height: 0; padding-bottom: 8px`). Do not add fake fields. Path line stays masked / generic (no raw `C:\` or `storage/mobility.db` in the operator DOM if that string is still absolute — keep the existing one-liner, no new path dump).

## Out of scope

Settings, Tactical, user-drawer ALL, licensing, `.cursorrules`.

## Operator PASS

1. Overview: gap between Index backups text and Backup / Optimize buttons.  
2. Library + Cases: slimmer rows; Open and Available on one line.  
3. Case ID and Evidence ID same size as Title / File.  
4. Storage → Evidence Index: title + one line, **no** empty well down to Save storage.
