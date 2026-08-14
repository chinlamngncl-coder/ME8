# MOB-DISC ANPR FTP snapshot library — planning — 2026-08-13

**Status:** planning only. **No APPLY.**  
**Audience:** product (operator-facing).  
**Related:** `docs/MOB-DISC-ANPR-ARCHITECTURE-MAP-FOR-PLANNING-20260813.md`

---

## Question

After Live ANPR is removed: do we need a **dedicated “FTP Snapshot” space** (all BWC names, who uploaded, which date), or is **Search + existing Offline FTP inbox** enough?

---

## Recommendation (one path)

**Do not add a new ANPR sub-tab** named “FTP Snapshot.”

**Do** treat dock FTP as a **file inbox under Offline Match** (already started), and keep **plate search** in **Search & History**.

Why:

1. **Search already works** for “find this plate / this day” after OCR — that is the investigator job. A second plate-search UI is duplicate.
2. You **do** need a place to **browse raw dock photos by camera / time** before (or without) OCR — that is an **inbox**, not a second History.
3. A fifth ANPR sub-tab (Live gone → Snapshot / Offline / History / Lists) plus “FTP Snapshot” splits operators across two almost-identical photo pickers (Snapshot manual + FTP library).
4. Files already land under Fleet **FTP root** (`storage/ftp-uploads` by default via `storagePaths` / `FM_FTP_ROOT`). Re-copying into a parallel “ANPR FTP vault” wastes disk and confuses Evidence.

---

## Where it lives (UI)

| Need | Put it here | Do not put it here |
|------|-------------|--------------------|
| Pick a dock photo → run OCR / match | **ANPR → Offline Match → Image Investigation → FTP inbox** (enrich columns) | New ANPR sub-tab; Snapshot tab (keep Snapshot = manual file pick / crop / Read plate) |
| “Show me plate ABC / date range / list hit” | **ANPR → Search & History** | FTP folder browser |
| Dock / evidence lifecycle (admit, archive, SOS link) | **Evidence / Storage** (existing FTP + dock ingest) | ANPR-only duplicate library |

**Operator story (plain English):**  
Dock drops photos into FTP → open **Offline Match** → see thumbs with **camera + date** → click → Run Scan → result can go to History. Later, find plates in **Search & History**.

---

## Where it lives (storage)

| Layer | Location | Owns |
|-------|----------|------|
| **Bytes (photos)** | Existing FTP root — default `storage/ftp-uploads` (or `FM_FTP_ROOT`) | Dock / FTP service; do **not** invent `storage/anpr-ftp-snapshot/` |
| **Device / folder identity** | Dock subfolders + dock FTP settings (already used for ingest hints) | BWC / dock name on the path or admit metadata |
| **Who / when** | Prefer **filesystem mtime + path + dock admit log**; optional thin Postgres index later if browse is slow | Node — not Python sidecar |
| **Plate text after scan** | Existing **`anprCaptureHistory`** (Postgres) | Same as Snapshot / Offline finalize |

Python ANPR stays **OCR only** (`/read`, `/image-scan`). It must not own the FTP library.

---

## Minimum enrichment (when APPLY is named later)

Offline Match FTP inbox cards / rows show at least:

- Thumbnail  
- **BWC / dock / folder name**  
- **Upload / file date**  
- Optional: file name  

Not required for v1: full “uploader user account” if docks share one FTP user — then **camera folder + timestamp** is the honest identity.

---

## Explicit non-goals

- Do not revive Live watch for FTP.  
- Do not move Snapshot to “FTP only.”  
- Do not duplicate Search & History as a folder tree.  
- Do not store a second copy of every FTP JPEG under a new ANPR path “for convenience.”

---

## Next APPLY (only when operator orders it)

Suggested name (not applied):  
`ANPR-OFFLINE-FTP-INBOX-META-V1` — Offline Match FTP inbox: show BWC/folder + date; files stay on existing FTP root.

Prior still open (separate): Snapshot `/read` Node-compatible JSON (`ANPR-STATIC-READ-NODE-COMPAT-V1`).
