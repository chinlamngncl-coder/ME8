# MOB APPLIED — EVIDENCE-PACKAGE-API-V1

**Date:** 2026-08-22  
**Phrase:** `MOB-APPLY EVIDENCE-PACKAGE-API-V1`

## Locks delivered

| Lock | Done |
|------|------|
| Nomenclature (no Court/Prosecutor/Police/Legal in UI) | Hub = **Evidence Package Verify**; HOW-TO / View-Evidence use External Reviewer |
| Zero-upload verify | `POST /api/evidence/packages/:id/verify` hashes disk under `storage/evidence-packages/` |
| Offline HTML | `View-Evidence.html` in package ZIP (local media SHA-256 vs manifest hash) |
| Retention Hold | Tag `retention-hold` + `is_priority`; case exhibit + package BWC media; retention enqueue + FIFO skip |

## New / touched

- `lib/evidencePackageStore.js` — save / list / verify on disk  
- `lib/evidenceRetentionHold.js` — apply hold  
- `lib/vmsCourtExport.js` — View-Evidence.html, HOW-TO, hold on BWC items, `generateEvidencePackage`  
- `lib/caseFiles.js` — hold on exhibit attach  
- `lib/evidenceRegistry.js` — skip case-linked + priority + hold tags  
- `lib/diskPressureFifo.js` — Retention Hold wording / matcher  
- `server.js` — persist package on export; list + verify APIs  
- Evidence Hub UI + `en.json` rename + server verify controls  

AES still **TODO only** (pre-ship block comment retained).

## Operator verify

1. Hard refresh → **Evidence Package Verify**.  
2. Export a VMS evidence package → note **X-Package-Id** (and SHA).  
3. **Verify On Server** with Package ID → MATCH (no upload).  
4. Open `View-Evidence.html` from ZIP offline → hash one media file vs `manifest.txt`.  
5. Confirm case-linked / packaged BWC media is not auto-queued by retention (hold tag / priority).
