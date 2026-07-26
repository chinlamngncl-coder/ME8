# MOB-APPLIED — SEC Phase 1.3 Evidence upload free-disk gate

**Date:** 2026-07-25  
**Task:** Phase 1 **1.3** — `SEC-EVIDENCE-UPLOAD-FREE-DISK-V1`  
**Operator:** **PASS** (2026-07-25) — lab smoke Disc: no docking required  
**Roadmap:** `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`  
**Disc:** `MOB-DISC-SEC-GOOGLE-FIVE-TIMING-SPAWN-DISK-WS-20260724.md` (Task 3)  
**Lab smoke:** `MOB-DISC-SEC-1-3-LAB-SMOKE-NO-DOCKING-20260725.md`

## Change

Async middleware **`requireFreeDiskSpace`**:

1. `await fs.promises.statfs(FTP_ROOT)`
2. Free bytes = `bfree * bsize`
3. If free &lt; **5 GB** → **HTTP 507** `{ ok: false, error: 'Insufficient storage on server.' }`
4. `statfs` failure → **HTTP 503** (fail closed; no multer write)

Injected **after** Bearer token auth (upload) / super-admin (forensic), **before** `httpsUploadMiddleware.single('file')`.

**Files:** `server.js`, `run.js`  
**Verify:** `npm run verify:sec-evidence-disk`

## Route shape (`/api/evidence/upload`)

```text
auth middleware → requireFreeDiskSpace → multer.single('file') → ingest
```

Twin: `/api/evidence/import-forensic` also uses `requireFreeDiskSpace` (same multer / same disk).

## Operator smoke

**Locked Disc:** `MOB-DISC-SEC-1-3-LAB-SMOKE-NO-DOCKING-20260725.md`

**Do not** require docking or HTTPS Bearer upload for lab PASS.

1. Agent: `npm run verify:sec-evidence-disk` → OK (already run at APPLY)  
2. Operator: **Restart Fleet** once  
3. Optional only: Evidence → **Import forensic file** (small file, super-admin) if you already use that button  
4. Say **PASS** or **FAIL**

Say **PASS** or **FAIL**. Do **not** start Task 1.4 until PASS.

## Next (after PASS only)

**Task 1.4** — `SEC-MSG-REASSEMBLER-TTL-V1`
