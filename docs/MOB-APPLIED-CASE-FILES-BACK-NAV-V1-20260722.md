# MOB APPLIED — CASE-FILES-BACK-NAV-V1

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-LIST-ACTIONS-AND-BACK-NAV-20260722.md`

## Problem

Case file detail had **← Back to case files** as a tiny ghost button buried in the title row — easy to miss; felt like no exit.

## Applied

- **Full-width back bar** above the detail header (`cf-detail-back-bar`)
- Prominent **← Back to case files** control (`cf-detail-back-btn`) — first thing on the detail view
- Title / Save / Delete stay in the row below

## Files

- `public/js/case-files-ui.js` — detail HTML structure
- `public/index.html` — back bar CSS

## Verify (operator)

1. **Ctrl+F5** → Case Files → **Open** a case
2. Top of detail: obvious **strip with ← Back to case files**
3. Click back → returns to case list

## Cache

- `case-files-ui.js?v=20260722-cf-back-nav-v1`
