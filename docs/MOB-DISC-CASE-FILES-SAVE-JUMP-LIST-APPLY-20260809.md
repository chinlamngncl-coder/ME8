# MOB DISC — CASE-FILES-SAVE-JUMP-LIST-V1 APPLY (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY CASE-FILES-SAVE-JUMP-LIST-V1`

## Behavior

1. Empty narrative → block save; hint **Write the field report before saving.**; focus narrative.  
2. Successful save → Case Files **list** + short “Field report saved.” on toolbar.

## Files

- `public/js/case-files-ui.js`
- `public/index.html` (`#cf-list-save-msg`, cache-bust)
- `public/locales/en.json` (`caseFiles.needNarrative`)

## Operator check

1. Hard refresh.  
2. Case Files → open case → clear report → Save → stays + hint.  
3. Type report → Save → list + saved message.  
4. Re-open → text still there.
