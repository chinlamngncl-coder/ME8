# MOB DISC — Cases list grow: where kept · how clear UI · not FTP (2026-08-09)

**Status:** Design lock. **No code until** named APPLY (e.g. `OPS-CASE-ARCHIVE-HIDE-V1`).  
**CREDIT-LEAN:** logic from known store path only — no hunt.

---

## 1. Total logic (one picture)

```text
ALARM (SOS / Face / Plate / Weapon)
        │
        ▼
 Ops Cases JSON  ──────────────────────────────►  Evidence → Cases  (list UI)
 storage/ops-cases/{day}/SOS|ANALYTICS/.../*.json
        │
        │  NOT the same as
        ▼
 Dock FTP / Evidence Library media (video clips, snapshots)
 (path you set in Evidence → Storage / docking settings)
```

| Thing | Where | UI |
|-------|--------|-----|
| **Case office** (notes, Open / Ack only, audit) | **Local Fleet storage** → `…/ops-cases/…` under the app **storage** root | **Evidence → Cases** |
| **SOS ledger strip** | Separate SOS incident store (Ops strip) | Ops **SOS cases** |
| **Field reports** | Case Files store | Evidence → **Case Files** |
| **Dock / FTP video** | FTP root **you** configure | Evidence Library / Storage |

**FTP is for camera upload media — not where Ops Cases JSON live today.**  
You already arrange **FTP / evidence paths** in Storage settings. Ops Cases today follow the **same storage root** as Fleet (not a separate “pick folder” UI yet).

---

## 2. “List getting higher” — can I delete off the UI?

| Today | Fact |
|-------|------|
| Remove a **whole case** from Cases list | **No UI yet** — only Super admin **edit/delete notes** inside a case |
| Clear Ops SOS **strip** | Clear strip = tidy Ops panel only — **does not** delete Cases JSON |
| Keep forever on disk | Yes — JSON stays under `storage/ops-cases/` |

So: list grows because every raise/Ack creates a case file. **Nothing archives/hides cases from the desk yet.**

---

## 3. What you want (locked direction)

| Goal | Design |
|------|--------|
| Clear clutter from UI | **Hide / Archive** from Cases list (Super admin) — row gone from default list |
| Keep on system | File **stays** on disk (or move to `ops-cases-archive/` — same storage root) |
| Not FTP | Archive is **local storage**, not dock FTP |
| Arrange location yourself | Optional later: Settings → Storage → “Cases folder” (default under storage). **Not required for first hide APPLY** |

Recommended first APPLY name: `OPS-CASE-ARCHIVE-HIDE-V1`  
- Super admin: Archive / Remove from list  
- Default list: active only  
- Filter: Show archived  
- Disk: keep JSON (mark `archivedAt` or move subfolder)

---

## 4. Where is it on the PC (lab)

Under the running Fleet **storage directory** (same family as other site data), e.g.:

`{STORAGE}/ops-cases/2026-08-09/SOS/SO-….json`

Exact STORAGE path = whatever this install uses (often next to the app / configured storage) — **Evidence → Storage** shows related roots; Cases folder is sibling under that root, **not** the FTP camera folder unless you later point storage there.

---

## 5. Decision

1. Cases ≠ FTP. Media = FTP/Library; Cases = local `ops-cases` JSON.  
2. List growth = no archive UI yet — **design above**, code on APPLY.  
3. Clear strip ≠ delete cases.  
4. Custom Cases path = optional later Settings APPLY.

**Audio APPLY this turn is separate.** Archive = wait for `MOB-APPLY OPS-CASE-ARCHIVE-HIDE-V1`.
