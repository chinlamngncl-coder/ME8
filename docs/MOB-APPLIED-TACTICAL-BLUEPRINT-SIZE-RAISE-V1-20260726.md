# MOB-APPLIED — TACTICAL-BLUEPRINT-SIZE-RAISE-V1

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY TACTICAL-BLUEPRINT-SIZE-RAISE-V1`  
**Disc:** `MOB-DISC-TACTICAL-BASIC-COMMAND-LICENSE-LOAD-QUEUE-20260726.md`

## What changed

| Piece | Before | After |
|-------|--------|-------|
| Upload default | 5 MB hard | **25 MB** default |
| Enterprise | — | `FM_TACTICAL_BP_MAX_MB=50` (clamp **5..50**) |
| Error text | `Blueprint exceeds 5 MB` | `Blueprint exceeds N MB` (N = active limit) |
| DB CHECK | ≤ 5 242 880 | ≤ **52 428 800** (50 MB) via migration **005** |

MIME / UUID filename / Super Admin / free-disk gate **unchanged**.

## Files

- `server.js` — `resolveTacticalBpMaxBytes()` + dynamic error
- `db/migrations/005_tactical_blueprint_size_raise.sql`
- `lib/siteDb.js` — load 005; require schema version ≥ 5
- `.env.example`, `.env.enterprise.example` — document `FM_TACTICAL_BP_MAX_MB`
- `scripts/verify-tactical-blueprint-size-raise-v1.js`
- `package.json` — `npm run verify:tactical-blueprint-size-raise`

## Verify (agent)

```text
npm run verify:tactical-blueprint-size-raise
npm run verify:tactical-blueprint-schema
npm run verify:tactical-blueprint-upload
```

## Operator smoke (API until blueprint UI MOB)

1. **Restart** Fleet (so migration 005 runs and new limit loads).
2. As **Super Admin**, upload a floor-plan JPEG/PNG/WebP about **6–20 MB** via:
   `POST /api/tactical/blueprints/upload` (field `file`, optional `name`)  
   — or wait for next MOB UI if you prefer not to use a tool.
3. **PASS** if upload succeeds (was rejected at 5 MB before).
4. Optional: set `FM_TACTICAL_BP_MAX_MB=50`, restart, try a larger plan ≤ 50 MB.

## Next MOB (after PASS)

`TACTICAL-BLUEPRINT-UI-V1`
