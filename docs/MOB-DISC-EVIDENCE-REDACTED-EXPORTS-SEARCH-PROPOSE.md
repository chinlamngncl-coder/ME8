# MOB DISC — Propose: search for redacted exports (same Evidence theme)

**Date:** 2026-07-17  
**Status:** APPLIED — see `MOB-APPLIED-EVIDENCE-REDACTED-EXPORTS-BROWSER-V1.md`  
**Name:** `mob-evidence-redacted-exports-browser-v1`

---

## Goal

Super-admin can **find finalized redacted files** without opening every source clip — same dark Evidence Hub look (nav chips, filters, table), professional and logical.

---

## Where it lives (UI)

Add one Evidence Hub nav button next to **Evidence Library** / **Case Files**:

**Redacted exports**

Same shell as Library:

- Top: search + filters + status chips  
- Body: table  
- Row action: **Open source** (detail) · **Download** (export stream)

Not a new top-level app tab. Stays inside Evidence.

---

## Filters (keep simple)

| Control | Options |
|---------|---------|
| Search | File name, officer, device id, export id |
| Status | Finalized (default) · Draft / note pending · All |
| Date | Uploaded / finalized range (same period control style as Case Files) |
| Tag | Optional — inherit from source evidence tags if present |

Default view = **Finalized only** (what you want to hand over).

---

## Table columns

| Column | Content |
|--------|---------|
| Redacted file | `[Redacted] …mp4` name |
| Size | bytes |
| Status | Finalized / Note pending |
| Source | Original clip name (link → open detail) |
| Officer / device | From source meta |
| When | Finalize or save time |
| Actions | **Download** · **Open** |

Same button / link language as Prior exports (no second “Download” meaning).

---

## Data / API (when APPLY)

- `GET /api/evidence/exports?status=finalized&q=&from=&to=&limit=&offset=`  
- Super-admin (or evidence export permission)  
- Backed by existing export registry / `evidence-exports` index — **no** raw disk browser in UI  
- Download stays `export-stream/{exportId}`  
- Open = existing detail panel for `fileId`

---

## What we will not do

- Dump folder paths or JSON in the table  
- Mix original library Download into this list  
- Build a second Evidence product chrome  

---

## APPLY when ready

Say: **`MOB-APPLY mob-evidence-redacted-exports-browser-v1`**

---

## One line

**New Evidence nav “Redacted exports” — search/filter finalized redacts, Download or open source — same theme as Library.**
