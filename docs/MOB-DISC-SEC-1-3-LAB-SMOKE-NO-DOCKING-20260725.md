# MOB DISC — SEC 1.3 lab smoke: no docking required

**Date:** 2026-07-25  
**Status:** DISC — **LOCKED**  
**Task:** Phase 1 **1.3** `SEC-EVIDENCE-UPLOAD-FREE-DISK-V1`  
**APPLIED:** `MOB-APPLIED-SEC-EVIDENCE-UPLOAD-FREE-DISK-V1-20260725.md`

---

## What “upload” meant (and why it sounded wrong)

The free-disk gate sits in front of **server multer** on:

| Route | Who uses it | Lab desk? |
|-------|-------------|-----------|
| `POST /api/evidence/upload` | Relay / hybrid **HTTPS evidence** clients with Bearer `FM_HTTPS_UPLOAD_TOKEN` | **Rare** — not everyday docking |
| `POST /api/evidence/import-forensic` | Evidence Hub **Import forensic file** (super-admin) | **Optional** UI path |
| Docking **FTP** ingest | Hardware dock → FTP to `FTP_ROOT` | **Does not** hit this middleware |

So: **you do not need a docking station** to prove Task 1.3. Dock FTP never called `requireFreeDiskSpace`. Asking for “normal HTTPS upload like docking” was the wrong operator ask.

---

## Locked lab PASS for operator (non-tech)

**Do not** require:

- Setting up `FM_HTTPS_UPLOAD_TOKEN` and curl/postman to `/api/evidence/upload`
- Running a physical dock “just to smoke 1.3”
- Filling the disk under 5 GB on purpose

**PASS is accepted when:**

1. Agent already ran **`npm run verify:sec-evidence-disk`** → OK (static proof: `statfs` + 507 gate before multer in `server.js` / `run.js`), **and**
2. Operator: **Restart Fleet** once after the APPLY, **and**
3. Operator says **PASS** (lab desk unchanged / no crash on restart)

**Optional (only if convenient):** Evidence → **Import forensic file** (super-admin) with a **small** file while the PC has plenty of free disk → expect success. If that button is not used in lab, **skip** — not required.

**507 under low disk** = engineer / verify path, not desk smoke.

---

## Why this is enough

Task 1.3 is a **server guard** before multer writes. Correctness is proven by:

- Code presence + order (verify script)  
- Restart with no regression  

Live “fill the drive” is not an operator life-safety UI check.

---

## Recommendation (locked)

For SEC 1.3: **accept PASS without docking / without HTTPS token upload.**  
Next after PASS → Task **1.4** only (`SEC-MSG-REASSEMBLER-TTL-V1`).

Until you say **PASS** (or FAIL) on 1.3 under this Disc — **no Task 1.4 code**.
