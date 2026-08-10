# MOB DISC — OPS-CASE-BIND-EVIDENCE-V1 APPLY (2026-08-09)

**Status:** APPLIED.

## What

- Case JSON gains `evidenceLinks[]` (Library file ids only — media stays on Storage/FTP).  
- Open Case desk: **Link** by Library file id → Play via `/api/evidence/preview/:id` → Unlink.  
- SOS server/device record ids in refs auto-promote into `evidenceLinks` when present.  

## Not this APPLY

Retention categories, 7-day queue, archive hide, Library picker browser UI.

## Files

- `lib/opsCaseStore.js`  
- `server.js` (POST/DELETE evidence on ops-cases)  
- `public/js/ops-cases-ui.js`  
- `public/index.html` + `css/global.css` + `locales/en.json`  

## Check

Restart Fleet → hard refresh → Evidence → Cases → open case → paste Library file id → Link → Play. Unlink removes link only (file stays in Library).
