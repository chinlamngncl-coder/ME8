# MOB-APPLIED — CENTRE-SUMMARY-AWAIT-AUDIT-PG-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-APPLY CENTRE-SUMMARY-AWAIT-AUDIT-PG-V1`  
**Disc:** `MOB-DISC-CENTRE-SUMMARY-AWAIT-AUDIT-PG-20260722.md`

## Root cause (fixed)

Postgres made `auditLog.list()` async. Centre still did:

```js
auditEntries = auditLog.list({ limit: 50 }) || [];  // Promise, not rows
```

Then `audit.slice(...)` threw → **500** → UI “Failed to load summary.”

## What changed

1. `commandCentreDeps` is **async** and `await`s `auditLog.list`; on fail uses `[]`.
2. `GET /api/command-centre/summary`, `export`, and `POST .../ask` await deps.
3. `buildSummary` belt: if audit is not an array → `[]`.

## Files

| File | Change |
|------|--------|
| `server.js` | async deps + routes |
| `lib/commandCentreReport.js` | Array.isArray guard |

## Operator verify

1. **Restart Fleet** (server.js changed)
2. Sign in as **super admin**
3. **Ctrl+F5** → **Centre Summary**
4. Expect KPIs / “Updated …” — not “Failed to load summary.”

**PASS / FAIL:** _(operator)_

**Next in remaining queue:** `WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1`
