# MOB-APPLIED — SEC Phase 1.2 SOS open without cmd.exe

**Date:** 2026-07-25  
**Task:** Phase 1 **1.2** — `SEC-SOS-OPEN-EXPLORER-NO-CMD-V1`  
**Roadmap:** `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`

## Change

`POST /api/sos-incidents/open` on Windows:

- Folder → `spawn('explorer.exe', [folderPath], …)`  
- Report → `spawn('explorer.exe', [reportPath], …)` (only if file exists)  
- **No** `cmd.exe` / `start`

**Files:** `server.js`, `run.js`  
**Verify:** `npm run verify:sec-sos-explorer`

## Operator smoke

1. Restart Fleet  
2. SOS ledger → open an incident (folder / report)  
3. Expect Explorer windows; no shell injection path  

Say **PASS** or **FAIL**. Do not start 1.3 until PASS.

## Next (after PASS only)

**Task 1.3** — `SEC-EVIDENCE-UPLOAD-FREE-DISK-V1`
