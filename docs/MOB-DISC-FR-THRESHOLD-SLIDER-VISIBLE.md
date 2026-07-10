# MOB DISC — FR match-threshold slider (invisible white track)

**Status:** **Applied** `mob-ui-range-slider-visible` 2026-07-10  
**Date:** 2026-07-10  
**Search:** `ax-fr-threshold`, `input type=range`, `Match threshold`, white slider, `fm-range`  
**Cue:** Analytics → Face — “Match threshold” control looks like a blank line, not a slider

---

## Applied

| Surface | Change |
|---------|--------|
| FR match threshold | Dark track `#334155` · cyan thumb `#38bdf8` · class `fm-range` |
| Route scrub `#rt-scrub` | Same |
| Live audio gutter `#layout-audio-vol` | Dark vertical track + visible thumb |

Threshold **logic / default 75%** unchanged — CSS only.

Hard refresh to load `index.html` styles.
