# MOB DISC — Can redacted files appear in Ops Case Library picker? (2026-08-10)

**Status:** LOCKED paper. **No code.** User: Mob disc + read `.cursorrules`.

**Context:** `OPS-CASE-BIND-LIBRARY-PICKER-V1` loads **Evidence → Library catalog** (`/api/evidence/catalog`, active files only).

---

## Short answer

**Today: usually no.** A redaction you finish does **not** automatically show up in the Case desk “Link Library file” list the same way a docked BWC clip does.

---

## Why (simple English)

There are **two shelves**:

| Shelf | What it is | Ops Case picker today |
|-------|------------|------------------------|
| **Library (catalog)** | Normal evidence files — dock uploads, SOS/HQ records, restored clips, etc. Stored as Library file rows (`evidence_files`, active). | **Yes** — picker lists these |
| **Redacted Exports** | Safe copy after you blur/cut faces/plates for sharing — a **finished export product**, not the same as “raw Library clip.” | **No** — that shelf is Evidence → **Redacted Exports** (or export queue), not the active Library catalog the picker reads |

So: you redact → you get a **safe export**. That job lives on the **Redacted Exports** path. The Case picker only asks Library: “show me active catalog files.” It does not walk the redacted-export shelf.

If some redaction paths also **write a new file into Library** (extra copy as a normal evidence file), that copy could appear — but that is not the product rule to rely on. Do not tell operators “always pick the redacted one from Link Library.”

---

## What should the product do later? (design only — needs APPLY)

Logical options if you want Cases to hold the safe copy:

1. **Link from Redacted Exports** — on Case desk, second control: “Link redacted export…” listing that shelf (by name/date/source file), not paste-id.  
2. **Promote redacted → Library** — on finalize, optionally place a labeled Library row (“Redacted · …”) so the existing picker sees it.  
3. **Keep separate** — Case links **source** clips; redacted stays on Redacted Exports for download/share only (clearer audit: original vs safe copy).

**Recommendation (one pick):** Prefer **(3) keep separate** for audit clarity, plus optional **(1)** when the Case must carry the shareable safe file. Do **not** silently mix redacted into Library without a clear label.

Named MOB when you want build (examples):  
`OPS-CASE-BIND-REDACTED-EXPORT-V1` or `REDACT-PROMOTE-TO-LIBRARY-V1`.

---

## Related pending (unchanged)

- `REDACT-LICENSE-GREY-BUTTON-V1` — grey Redact if unlicensed  
- Dock dual-record must  
- Alert sound re-PASS  

No product edits from this disc.
