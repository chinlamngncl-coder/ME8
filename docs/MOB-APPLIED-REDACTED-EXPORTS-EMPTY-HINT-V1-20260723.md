# MOB-APPLIED — REDACTED-EXPORTS-EMPTY-HINT-V1

**Date:** 2026-07-23  
**Status:** APPLIED — operator verify  
**What (plain English):** When Redacted exports is empty, say honestly that there are no finalized blurred copies yet; trims are on Prior exports; how to create one (Redact → Save → Finalize). Top hint also says this tab is redacted downloads only, not trims.

## Copy

| Place | Text |
|-------|------|
| Top hint | Finalized redacted (blurred) downloads only — not trim cuts… |
| Empty (0 total) | No finalized redacted copies yet. Trim cuts are on each clip under Prior exports — not here. To get a file… Redact → Save → Finalize. |
| Empty (filters hide some) | No match — try All time / Status All. |

## Files

- `public/locales/en.json`
- `public/js/evidence-hub.js` — pick empty key from `total === 0`
- `public/index.html` — hint + cache `?v=20260723-redacted-exports-empty-hint-v1`

## Operator check

1. Hard refresh → Redacted exports (still 0).  
2. Read the empty line — should tell you trims ≠ this tab, and the Redact path.  
3. Top hint should mention blurred downloads, not trims.

**PASS** = wording clear without guessing.
