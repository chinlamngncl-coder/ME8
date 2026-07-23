# MOB DISC — Redacted exports Detail column: blank on the right (same waste bug)

**Status:** APPLIED — `REDACTED-EXPORTS-DETAIL-COL-FIT-V1` (2026-07-22)  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot — **Redacted exports**, **Detail** column zoomed. `Download · Open source` hug the **left**; ~60–70% of the column is **empty dark space** on the right. “Same as the previous mob — why leave space on the right?”  
**Search:** `redacted exports detail blank`, `ev-rx-actions`, `column width 20%`, `table-layout fixed`  
**Related:** `MOB-APPLIED-REDACTED-EXPORTS-DETAIL-ONE-LINE-V3` · `MOB-DISC-CASE-FILES-DETAIL-RIGHT-BLANK-20260722.md` (different surface — two-pane detail)

---

## Yes — same *kind* of bug, different screen

| Previous mob (Case Files) | This screenshot |
|---------------------------|-----------------|
| Two detail panes don’t fill viewport | **One table column** wider than its content |
| Blank beside Linked evidence box | Blank **inside** Detail column, right of links |
| Fix: fill split panes | Fix: **shrink Actions column**, give width back to file columns |

**Surface:** Evidence → **Redacted exports** → table column **Detail** (last column).

**Not** Case Files. **Not** missing data. **Layout only.**

---

## What the blank is for

**Nothing.** V3 fixed links on **one line** — good. Column is still forced to **20% of table width** (`min-width: 148px`) with `table-layout: fixed`. On a wide monitor that column can be **250px+** while `Download · Open source` needs **~130px**. Left-aligned links + wide fixed column = **dead gutter on the right** inside every row.

```
┌─ Detail (20% of table) ─────────────────────────────┐
│ Download · Open source          │← blank (waste) →│
└───────────────────────────────────────────────────┘
```

---

## Root cause (code)

```css
#ev-panel-redacted-exports .evidence-table { table-layout: fixed; width: 100%; }
… td:nth-child(7) { width: 20%; min-width: 148px; }
.ev-rx-actions { justify-content: flex-start; }
```

V3 only changed **flex-wrap** and **separator** — not **column width budget**.

---

## What operator wants

| Rule | Detail |
|------|--------|
| **No blank in Detail column** | Column only as wide as actions need |
| **Table still full width** | Freed % goes to **Redacted file** + **Source** (long names) |
| **One line actions** | Keep V3 `Download · Open source` |
| **Many rows** | Scroll / pager unchanged (already answered in prior DISC) |

Optional: rename header **Detail** → **Actions** (honest label for a narrow column).

---

## Recommended MOB

**Name:** `REDACTED-EXPORTS-DETAIL-COL-FIT-V1`

### In scope

1. Last column: **`width: 1%`** (or ~10%) + **`white-space: nowrap`** — shrink-to-fit under `table-layout: fixed`.
2. Remove or lower **`min-width: 148px`** on col 7 if it fights shrink.
3. Redistribute width: e.g. col 1 (file) **30%**, col 4 (source) **20%**, col 7 **auto-tight**.
4. Keep V2/V3 link styling.
5. Cache bust if needed (CSS-only likely `index.html` only).

### Out of scope

- New columns, API, pagination size
- Case Files detail fill split (separate MOB)

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Detail column **no wide blank** right of links | ☐ |
| 2 | Links still one line: `Download · Open source` | ☐ |
| 3 | Long filenames still ellipsis in file column | ☐ |
| 4 | 15+ rows — scroll in table box still works | ☐ |

---

## Agent pick

**`REDACTED-EXPORTS-DETAIL-COL-FIT-V1`** — one CSS MOB; completes the Detail column story after V2 + V3.

---

## Ask

**`MOB-APPLY REDACTED-EXPORTS-DETAIL-COL-FIT-V1`**
