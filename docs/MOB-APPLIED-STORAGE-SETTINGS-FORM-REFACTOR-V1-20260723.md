# MOB-APPLIED — STORAGE-SETTINGS-FORM-REFACTOR-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-STORAGE-SETTINGS-FORM-REFACTOR-V1`  
**Scope:** Evidence → Storage layout only (CSS/HTML). No FTP API / backend changes.

## What changed

1. **Where is video stored?** — equal `1fr 1fr` cards, gap **16px**.
2. **Enable FTP ingest** — de-boxed (plain checkbox row, no full-width border).
3. **FTP form grid** — `1fr 1fr`, gap **24px / 16px**: service|password → host (span 2) → port|user → password|passive (flex pair).
4. **FTP upload folder** inside the same FTP block (no mid HR); **Save FTP settings** bottom-right.
5. **System status rail** — fixed label column so values align.

## Files

| File | Change |
|------|--------|
| `public/index.html` | Storage FTP markup + CSS |
| cache | `evidence-storage-ui.js?v=20260723-storage-form-refactor-v1` |

## Operator verify

1. **Ctrl+F5** → Evidence → **Storage** (or Settings path that opens Storage)  
2. Twin storage cards equal width  
3. FTP: clean checkbox, aligned 2-col fields, folder + Save at bottom right  
4. Save FTP / Browse still work  

**PASS / FAIL:** _(operator)_
