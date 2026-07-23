# MOB-APPLIED — CASE-FILES-PURPOSE-HINT-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-CASE-FILES-PURPOSE-SOS-ACK-EMPTY-SCROLL-20260722.md`  
**Cache:** `case-files-ui.js?v=20260722-cf-purpose-hint`

## Fixed

| Issue | Fix |
|-------|-----|
| Operator forgot what Case Files is for | Stronger `#cf-hint-block` copy: field report + link library evidence |
| “Does SOS Ack land here?” | Second line (`caseFiles.hintSos`): Ack does **not** auto-create cases — use **Create from SOS** |

## Files

- `public/locales/en.json` — `caseFiles.hint`, `caseFiles.hintSos`
- `public/index.html` — hint block markup + light styling
- `public/js/case-files-ui.js` — hide hint block in case detail view

## Operator verify

1. **Ctrl+F5** (copy/CSS/JS only — no server restart).
2. Evidence → **Case files**.
3. Top of list shows two hint lines; second mentions SOS Ack vs **Create from SOS**.
4. Open a case → hints hide; Back to list → hints return.

## Out of scope

- Auto-create case on every SOS Ack (separate product MOB if ever wanted)
- Prior exports Finalized clear → `REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1`
