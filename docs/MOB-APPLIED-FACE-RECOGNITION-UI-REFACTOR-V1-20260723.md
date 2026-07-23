# MOB-APPLIED — FACE-RECOGNITION-UI-REFACTOR-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-FACE-RECOGNITION-UI-REFACTOR-V1`  
**Scope:** Analytics → Face recognition CSS/HTML only. Still **6** tiles. Verify 1:1 untouched. No FR API / match pipeline changes.

## What landed

1. **16:9 tiles** — `.ax-fr-grid` = `repeat(3, 1fr)`; each `.ax-fr-tile` has `aspect-ratio: 16 / 9` (height from width, not stretched rows). Live video/canvas use `object-fit: cover` to cut pillarbox dead space.
2. **Bottom roster** — `#ax-fr-watch-list` is `.ax-fr-watch.enterprise-card` (`--bg-surface`, padding, border).
3. **Recent rail placeholders** — empty slots use `.ax-fr-sidebar-placeholder` / `.is-empty` with solid subtle fill (not washed-out dashed voids).

## Files

| File | Change |
|------|--------|
| `public/index.html` | FR grid/tile/watch/placeholder CSS + watch `enterprise-card` |
| `public/js/fr-alarm.js` | Empty crop cards get `ax-fr-sidebar-placeholder` |
| cache | `fr-alarm.js?v=20260723-fr-ui-refactor-v1` |

## Operator verify

1. **Ctrl+F5** → Analytics → **Face recognition**  
2. Six tiles look 16:9 (not tall/squashed boxes)  
3. Bottom Start watch / roster sits in a card  
4. Right Recent empty slots look intentional  
5. Verify 1:1 tab unchanged  

**PASS / FAIL:** _(operator)_
