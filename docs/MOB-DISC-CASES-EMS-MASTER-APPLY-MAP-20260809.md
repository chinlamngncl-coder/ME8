# MOB DISC — Cases / Evidence EMS master + APPLY map (2026-08-09)

**Status:** LOCKED. Operator: grey redact if no license; summarize all; what to APPLY; do not destroy UI (unify); explain **Redacted Exports** and link the logic.  
**`.cursorrules`:** UI form/grid + CREDIT-LEAN-HARD — never gut ids / Evidence chrome / invent a second skin.

---

## 1. Got it — license gate (no buy ≠ locked out of Evidence)

| License Redaction | What happens |
|-------------------|--------------|
| **Bought / ON** | Redact buttons work (Evidence, Docking, later Case desk) |
| **Not bought / OFF** | User **still uses** Library, Cases, Docking, playback, etc. **Redact button greyed out** (disabled + short hint: needs Redaction license). Never hide whole Evidence. Never delete the Redacted Exports tab — empty / gated is fine |

Same pattern as other licensed features: product visible, paid action disabled.

---

## 2. Real EMS shape (checked Axon) → ME8 target

Open a **Case** → **videos in that case** → **many inputs** → **map pin** → **redact if needed** (licensed) → close/settle.  
Refresh must not wipe disk cases. Audit log is part of settle roadmap.

**UI rule:** unify with existing Evidence desk (Cases / Case Files / Library / Redacted Exports same chrome). **Do not destroy UI.** No new product skin.

---

## 3. What each Evidence piece is for (linked logic)

```text
Library / Docking media (your Storage/FTP path)
        │
        │  Redact (if license ON) ──► creates a REDACTED COPY
        │                              (original stays)
        ▼
 Evidence → Redacted Exports     = shelf of those safe copies
   GET /api/evidence/exports
   Download finalized · Open source original
        │
        ▼
 Cases (target) = case folder spine
   alert ticket today (Open/Ack/notes)
   later: play linked clips + form + map + call same Redact
   bind media from Library/FTP into the case
```

| Tab / area | Job |
|------------|-----|
| **Library** | Original evidence media |
| **Docking** | Ingest / dock path; Redact entry also lives here |
| **Redact action** | Make safe copy (license). Original untouched |
| **Redacted Exports** | **List of redacted outputs** already made — download / open source. **Not** a second redact engine. **Not** Cases. This is why the tab exists |
| **Cases** | Alert/ops **case folder** (→ grow to Axon-like case page) |
| **Case Files** | Written field reports (optional; not every alert) |

**If Redacted Exports looks orphan:** it is the **output shelf** after Redact. Case desk later may **link** a redacted export into a case — do not delete the tab or rebuild it under a new name.

---

## 4. Storage (short)

| What | Where |
|------|--------|
| Case JSON | App storage `ops-cases/` (durable; not FTP) |
| Original video | User Storage / FTP (you set) |
| Redacted export files | Evidence export store (API `/api/evidence/exports`) — beside evidence, not “Cases JSON” |

---

## 5. Do not break (agent rules)

1. CREDIT-LEAN / `.cursorrules` lean block when invoked.  
2. Zero change without **MOB-APPLY** exact name.  
3. **Do not destroy UI** — keep Evidence hub panels, ids, Case Files–style layout.  
4. Reuse **one** redact stack (Evidence/Docking) — no second redact.  
5. No license → **grey** Redact, not remove Evidence / Redacted Exports.  
6. Brand Axiom; no OEM names.

---

## 6. What to APPLY (order — one at a time)

| # | APPLY name | Does |
|---|------------|------|
| 0 | *(optional)* `REDACT-LICENSE-GREY-BUTTON-V1` | No license → Redact **disabled/grey**; rest of Evidence works |
| 1 | `OPS-CASE-OPEN-DESK-V1` | Open case page: player slot + form grid + map pin — **unify** chrome; empty player OK until bind |
| 2 | `OPS-CASE-BIND-EVIDENCE-V1` | Attach Library/FTP (and later redacted export) into case so player fills |
| 3 | `OPS-CASE-CLOSE-SETTLE-V1` | Closed / Archived; list filters |
| 4 | `OPS-CASE-AUDIT-LOG-V1` | Append-only who/when |
| 5 | `OPS-CASE-ARCHIVE-HIDE-V1` | Hide clutter from list; keep disk |

**Recommend next when ready:** `OPS-CASE-OPEN-DESK-V1` (or `REDACT-LICENSE-GREY-BUTTON-V1` first if license gate must ship before case UX).

---

## 7. Related discs (this arc)

- `MOB-DISC-EMS-CASE-OPEN-SEES-VIDEO-MAP-NOTES-CHECKED-20260809.md`  
- `MOB-DISC-CASE-DESK-REDACT-IN-EVIDENCE-DOCKING-20260809.md`  
- `MOB-DISC-REDACTION-LICENSED-PRODUCT-20260809.md`  
- `MOB-DISC-CASES-VS-CASE-FILES-VS-FTP-LOGIC-20260809.md`  
- `MOB-DISC-CASES-SETTLE-BIND-MEDIA-AUDIT-EMS-20260809.md`  
- `MOB-DISC-OPS-CASES-WHERE-KEPT-AND-ARCHIVE-UI-20260809.md`  
- `MOB-DISC-CREDIT-LEAN-IN-CURSORRULES-APPLY-20260809.md`

---

## One line

**No Redaction license → still use Evidence; Redact grey. Redacted Exports = shelf of safe copies after Redact. Cases grow into unified case desk (video+inputs+map+same redact). APPLY only named rows above — never gut UI.**
