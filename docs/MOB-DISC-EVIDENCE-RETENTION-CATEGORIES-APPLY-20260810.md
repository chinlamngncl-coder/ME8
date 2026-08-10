# MOB DISC — EVIDENCE-RETENTION-CATEGORIES-V1 APPLY (2026-08-10)

**Status:** APPLIED. Operator PASS pending.

## What

- Evidence hub nav **Retention** (Super admin only), beside Storage  
- Categories: **name** + **Keep for N days** OR **Until manually deleted**  
- Seed defaults: Standard 90d / Long 1y / Until manually deleted  
- Store: `storage/evidence-retention-categories.json`  
- APIs: `GET/POST/PATCH/DELETE /api/evidence/retention-categories`

**Not in this MOB:** assign category on Library file, 7-day delete queue, auto purge.

## Check

Restart → hard refresh → Super admin → Evidence → **Retention** → see defaults → Add/Edit/Delete.

## Next

`MOB-APPLY EVIDENCE-DELETE-QUEUE-7D-V1` (when ready).
