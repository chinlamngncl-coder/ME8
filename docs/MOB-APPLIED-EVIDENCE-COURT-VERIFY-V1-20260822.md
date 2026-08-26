# MOB APPLIED — EVIDENCE-COURT-VERIFY-V1

**Date:** 2026-08-22  
**Phrase:** `MOB-APPLY EVIDENCE-COURT-VERIFY-V1`

## Scope (this MOB only)

- Evidence Hub **Court Package Verify** panel: pick ZIP → local **SHA-256** (browser, zero upload) → paste expected hash → **MATCH / MISMATCH**
- Court ZIP includes **`HOW-TO-VERIFY.txt`**
- **AES-256 not implemented** — TODO flags planted (pre-ship block reminder)

## Files

| File | Change |
|------|--------|
| `public/index.html` | Nav + panel + AES TODO HTML comment; cache-bust evidence-hub |
| `public/js/evidence-hub.js` | Hash Checker UI logic + AES TODO comment |
| `public/locales/en.json` | Court Verify chrome strings (title case) |
| `lib/vmsCourtExport.js` | HOW-TO-VERIFY.txt + AES TODO before ZIP build |

## Not in this MOB

- AES encryption
- View-Evidence.html offline player
- Server-side upload verify
- Wall snip → case

## Operator verify

1. Hard refresh Evidence and Docking.  
2. Open **Court Package Verify**.  
3. Export a VMS court ZIP (or use an existing one); note `X-Package-SHA256` if available.  
4. Choose ZIP + paste expected hash → **Verify**.  
5. **PASS** = MATCH on untouched ZIP; change one byte / wrong hash → MISMATCH.
