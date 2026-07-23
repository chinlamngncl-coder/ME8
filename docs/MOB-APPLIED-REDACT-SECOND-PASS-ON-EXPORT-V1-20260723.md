# MOB APPLIED — REDACT-SECOND-PASS-ON-EXPORT-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY REDACT-SECOND-PASS-ON-EXPORT-V1`  
**Disc:** `MOB-DISC-REDACT-SECOND-PASS-WHERE-TO-LOAD-20260723.md`

## Where you load the video

**Prior exports** (on that evidence detail) → **Second pass** on a redacted row → Redact player uses `/api/evidence/export-preview/…` (the already-blurred MP4), **not** the original.

## What changed

| Piece | Change |
|-------|--------|
| Prior exports row | **Second pass** button (draft or finalized redact) |
| Redact workspace | Title/hint for second pass; video src = export preview |
| Save / Auto | `parentExportId` → burn/detect from that export file |
| New export meta | `secondPass`, `parentExportId`, mode `second-pass` / `second-pass-face-follow` |
| Custody | New export id; previous Download unchanged |

**Cache:** `evidence-hub.js?v=20260723-redact-second-pass-on-export-v1`

## Operator verify

1. Restart Fleet · Ctrl+F5.  
2. Evidence → clip with a **Finalized** redacted row under Prior exports.  
3. Click **Second pass**.  
4. **PASS:** player shows the **already redacted** picture (blurred faces still blurred).  
5. Draw a box on a leftover clear face → Save → Finalize → Download **new** file.  
6. Old finalized Download still works unchanged.

## Not in this MOB

- Second pass on global Redacted exports nav (later optional)  
- Join/splice  
- Overwrite in place
