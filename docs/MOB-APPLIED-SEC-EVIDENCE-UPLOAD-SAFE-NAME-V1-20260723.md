# MOB APPLIED — mob-sec-evidence-upload-safe-name (S0)

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY mob-sec-evidence-upload-safe-name`  
**Disc:** `MOB-DISC-SEC-HARDEN-BEFORE-SHIP.md`, `MOB-DISC-SEC-GOOGLE-FOUR-FINDINGS-PLAN.md`  
**Pri:** S0 — ship FAIL if open

## What this closes

Multer no longer writes `file.originalname` into evidence storage. Disk name is **`ev-<uuid>.<allowlisted-ext>`** only; original name kept for display/metadata.

## Implementation (verified in tree)

| Piece | Role |
|-------|------|
| `lib/evidenceUploadSafeName.js` | `safeExtension`, `buildSafeFileName`, `assertPathInsideRoot`, `safeOriginalDisplayName` |
| `server.js` HTTPS upload | `filename` → `buildSafeFileName`; filter via `safeExtension`; post-write `assertPathInsideRoot` |
| `lib/evidenceIngestGate.js` | Admit/quarantine also UUID-rename + containment |
| `scripts/verify-evidence-upload-safe-name.js` | Unit checks for traversal / double-ext / path escape |

**Agent check (this APPLY):** `node scripts/verify-evidence-upload-safe-name.js` → **PASS**  
No live `cb(null, file.originalname)` on the HTTPS evidence upload path.

## Operator verify

1. Restart Fleet if the process is old (this is server-side).  
2. Optional live: POST `/api/evidence/upload` with a token and a malicious name like `../../../evil.mp4`.  
3. **PASS:** file lands under evidence pending/root as `ev-<uuid>.mp4` only — never outside storage; UI may still show a sanitized display name.  
4. Normal BWC upload / dock still works.

## Security four-pack status

| # | MOB | Status |
|---|-----|--------|
| **S0** | `mob-sec-evidence-upload-safe-name` | **APPLIED** (this doc) — operator verify |
| S1 | `mob-sec-uncaught-exit` | APPLIED earlier |
| S2 | `mob-sec-sip-crypto-random` | APPLIED earlier |
| S3 | `mob-sec-login-rate-lru` | APPLIED earlier |

## Outside this MOB

- FR enroll/verify/offline multer still use sanitized basename (optional later UUID unify).  
- Lab default creds / image pin = separate.  
- TLS / HTTPS dashboard = Track C.
