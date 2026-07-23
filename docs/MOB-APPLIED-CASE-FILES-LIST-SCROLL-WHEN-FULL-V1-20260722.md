# MOB APPLIED — CASE-FILES-LIST-SCROLL-WHEN-FULL-V1

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-LIST-SCROLL-WHEN-FULL-20260722.md`

## Problem

Case Files list with **few rows** (e.g. 2–4) forced viewport height + inner scroll into blank — EMPTY-COMPACT-V2 only fixed **zero** rows.

## Applied

- **`cf-few-rows`** when `1 ≤ rows ≤ 12` (mirror Redacted exports `ev-rx-few-rows`)
- Few rows: panel/table **compact** — no `min-height: 100vh`, no `overflow-y` on table wrap
- **13+ rows**: keep fill layout + scroll inside table box
- **`ev-case-files-few-rows`** on evidence panel — avoid outer page scroll

## Files

- `public/js/case-files-ui.js` — `setCaseListFewRows()`, `CF_FEW_ROWS_MAX = 12`
- `public/index.html` — `cf-few-rows` CSS

## Verify (operator)

1. **Ctrl+F5** → Case Files
2. **2–4 cases** — table compact, **no scroll into void**
3. **0 cases** — still compact empty card (V2)
4. **Many cases** (13+ if you have them) — scroll inside table area

## Cache

- `case-files-ui.js?v=20260722-cf-list-scroll-v1`
