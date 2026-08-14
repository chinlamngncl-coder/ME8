# MOB-DISC Super-admin FTP upload browser (NOT ANPR FTP) — 2026-08-14

**Status:** planning. **No APPLY.**  
**Correction:** Agent misunderstood. Operator does **not** want an ANPR FTP feature.

---

## What you meant (locked)

You want a place where a **super admin** can open and **see what was uploaded** (via the FTP path from settings) and **check** those files.

You do **not** want:

- “ANPR FTP”
- A special ANPR-only FTP vault
- Offline Match rebuilt as the FTP control room
- Snapshot Bulk replaced by FTP

**Snapshot Bulk** stays what it is: drag photos from the PC for plate scan. No need to wire FTP into ANPR for that.

---

## What this is (one sentence)

**Admin upload browser** = look at the FTP upload folder (the path from settings) → list / preview / check files.  
Product home: **super-admin / storage / evidence-style area** — **not** Analytics → ANPR.

---

## Plain map

```
Dock uploads --FTP--> [folder from FTP path setting]
                              |
                              v
              Super-admin screen: “FTP uploads” / Upload browser
              (see files, who/when/folder if we can show it, open/check)
```

ANPR stays separate:

```
Operator --drag photo--> Snapshot / Bulk --> plate read --> lists
```

No “make an ANPR FTP.”

---

## Where to put the UI (LOCKED recommendation)

**Put it here:**

**Evidence → Storage** (the same place super-admin already sets FTP / upload path).

On that page, under the FTP settings block, add a clear section:

**FTP uploads** — list / preview / check files that landed in the configured upload path.

| Why this spot | Why not elsewhere |
|---------------|-------------------|
| Path setting and “what arrived” stay **one screen** | ANPR — not an ANPR job |
| Super-admin already owns Evidence Storage | Offline Match — leave as-is |
| Matches “check what was uploaded” | New top-level app menu — extra navigation for nothing |

**Not:** Analytics → ANPR. **Not:** a new ANPR FTP product. **Not:** replacing Snapshot Bulk.

Optional later (only if Storage page gets too crowded): split to Evidence sub-tab **FTP uploads** next to Storage — same Evidence hub, still not ANPR.


---

## What “check” means (v1)

Minimum useful:

- List files in the configured FTP folder (and subfolders if docks use folders)
- Show name + date
- Open / preview image
- Optional: camera/folder name from path

Not required for v1: auto plate OCR of every FTP file, watchlist batch from FTP, duplicate copy into ANPR storage.

---

## Suggested APPLY (only when you order it)

`ADMIN-FTP-UPLOAD-BROWSER-V1`  
- Super-admin page/panel to browse the **settings FTP path**  
- No new ANPR FTP product  
- No change to Snapshot Bulk unless you ask

Fast plate-OCR remains a **separate** ANPR MOB: `ANPR-FAST-PLATE-OCR-SWAP-V1` (reader quality only).

---

## Agent mistake (record)

Earlier discs that said “enrich Offline Match FTP inbox as the ANPR FTP door” were the wrong product story. **This disc wins** for FTP visibility.
