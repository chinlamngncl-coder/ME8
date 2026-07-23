# MOB-APPLIED — REDACT-FINALIZE-LOOP-BREAK-UI-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-REDACT-FINALIZE-DEAD-LOOP-AND-UNTIDY-LIST-20260722.md`  
**Cache:** `evidence-hub.js?v=20260722-redact-loop-break`

## Fixed

| Issue | Fix |
|-------|-----|
| Dead loop Finish Finalize ↔ detail | Removed 80ms auto-bounce; note panel **stays** until Close / Finalize success |
| Empty Finalize silent fail | Inline error: need visible description **or** incident note |
| Open Prior exports “did nothing” | If already on detail → scroll + flash Prior exports heading |
| Fat zig-zag buttons | Compact text-link actions, meta left / actions right |
| Banner shout for every draft | Banner for **newest** pending only (+ count); **Dismiss** clears session flag |

## Operator

1. Hard refresh (**Ctrl+F5**).  
2. Open source clip → **Finalize** (compact link) on one **Note pending** row.  
3. Form must **stay** on screen — fill Visible description or Incident note → **Finalize & register**.  
4. Row becomes **Finalized** → **Download** text link.  
5. Do not Save again for old pending copies.

Already-Finalized rows in your list: Download works now.
