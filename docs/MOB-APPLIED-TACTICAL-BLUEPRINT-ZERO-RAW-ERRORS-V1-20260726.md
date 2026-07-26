# MOB-APPLIED — TACTICAL-BLUEPRINT-ZERO-RAW-ERRORS-V1

**Date:** 2026-07-26  
**Disc:** `docs/MOB-DISC-TACTICAL-BLUEPRINT-ZERO-RAW-ERROR-20260726.md`  
**Lock:** `docs/MOB-DISC-ZERO-RAW-ERRORS-UI.md`

## What changed

Floor plan strip never paints `err.message` / JSON / HTML crash text.

- Safe parse helper `fetchBpJson` (HTML / non-JSON → console warn only)
- `failMsg` maps 401 / 403 / 404–405 / 503 / parse-fail to plain i18n
- Cache: `tactical-blueprint-ui.js?v=20260726-tactical-blueprint-zero-raw-v1`

## Why Remove looked broken (plain English)

Upload / list / place already lived on the running server. **Remove** needs a newer `DELETE /api/tactical/blueprints/:id` route.

When that route is missing, Express answers with an **HTML error page** (`<!DOCTYPE…`). The old UI called `r.json()` on that page → browser threw `Unexpected token '<'…` → that crash text was painted on the strip.

Lab check at apply time: Windows service **`UbitronC2` was Running**. That often means the desk is still on an **older process** that does not yet include Remove. Fix: **LAB CONSOLE START** (stops service + restarts Fleet), then **Ctrl+F5**, then Remove again.

## Operator smoke

1. LAB CONSOLE START → Ctrl+F5  
2. Floor plan → Remove plan → confirm  
3. Expect green **Plan removed**, or a short plain line (never `Unexpected token` / `<!DOCTYPE`)

Reply **PASS** / **FAIL**.

## Verify

```text
node scripts/verify-tactical-blueprint-zero-raw-errors-v1.js
```
