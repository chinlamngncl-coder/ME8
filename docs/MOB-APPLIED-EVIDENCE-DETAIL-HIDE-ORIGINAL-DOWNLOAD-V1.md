# MOB-APPLIED: mob-evidence-detail-hide-original-download-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**File:** `public/js/evidence-hub.js` · cache `?v=20260717-hide-original-dl-custody-words`

## Change

Removed the bottom evidence-detail **Download** button that pulled the **original** file (confused with Prior exports **Download** for redacted copies).

| Still available | How |
|-----------------|-----|
| Original download | Evidence Library row **Download** (catalog) |
| Redacted / trim | **Prior exports** → **Download** (after finalize) |
| Secure request | Non–super-admin with secure export on — **Request secure export** still on detail |

## Operator

Hard refresh Evidence → open a file → no bottom original Download; use Prior exports for redacted files.
