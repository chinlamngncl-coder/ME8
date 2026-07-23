# MOB-APPLIED — REDACT-DOWNLOAD-AFTER-FINALIZE-VISIBLE-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-REDACT-NO-DOWNLOAD-AFTER-FINALIZE-0707-20260722.md`  
**Cache:** `evidence-hub.js?v=20260722-redact-dl-visible`

## Fixed

| Issue | Fix |
|-------|-----|
| Finalize then no Download on screen | Success panel: **Finalized — Download redacted copy** + primary Download |
| Tiny Prior exports Download | Compact `btn-ghost` Download on Finalized rows |
| “Stuck at 0707” confusion | Row shows **Burned {time}** + short export id; 0707 remains source clip name only |
| Pending graveyard buries Finalized | List splits Finalized vs pending; only newest 5 pending shown |

## Operator verify

1. Hard refresh (**Ctrl+F5**).  
2. Open a **Note pending** row → fill Visible or Incident → **Finalize & register**.  
3. Success screen must show big **Download redacted copy** — click it; file saves.  
4. **Open Prior exports** → top **Finalized** section has clear Download + burn time.  
5. Ignore “0707” inside the file name — that is the original clip date.

## Out of scope (next)

`REDACT-PRIOR-EXPORTS-CLEANUP-V1` — clear old pending Prior exports (not custody trail).
