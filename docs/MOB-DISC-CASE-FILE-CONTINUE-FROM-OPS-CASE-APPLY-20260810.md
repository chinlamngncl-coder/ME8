# MOB DISC — CASE-FILE-CONTINUE-FROM-OPS-CASE-V1 APPLY (2026-08-10)

**Status:** APPLIED (code). Operator PASS pending.

## What shipped

1. Ops Case desk button **Continue as Case File**.  
2. `POST /api/ops-cases/:caseId/continue-case-file` — create once or reopen linked Case File.  
3. Seeds title / camera / SOS id / notes → narrative / evidence links.  
4. Jumps to Case Files detail. Re-click does not duplicate.  
5. Both sides show Linked (Case ↔ Case File).  
6. Migration `db/migrations/011_case_files_ops_case_id.sql` (`ops_case_id`). Insert/update fall back if column not yet applied; Ops Case JSON still stores `refs.linkedCaseFileId`.

## Operator check

1. Apply migration 011 on lab PG (or restart if your pack auto-runs migrations).  
2. Hard refresh → Evidence → Cases → open case → **Continue as Case File**.  
3. Land in Case File with narrative/links; click linked Ops Case id back.  
4. Continue again → same Case File (no second CF).

## Next pending (unchanged order)

1. `OPS-CASE-BIND-LIBRARY-PICKER-V1`  
2. Lab dual-record / dock PASS  
3. `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1`  
4. Alert/SOS sound re-PASS  
5. Retention / delete queue / redact grey  
… (see `MOB-DISC-CASE-FILE-CONTINUE-MOB-PROMPT-AND-PENDING-20260810.md`)
