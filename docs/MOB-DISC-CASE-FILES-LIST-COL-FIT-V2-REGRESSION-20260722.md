# MOB DISC — Case Files list COL-FIT-V2 regression: Detail crushed (“Op”, “De”)

**Status:** FAIL — operator screenshot 2026-07-22 (inner void). See `MOB-DISC-CASE-FILES-LIST-COL-FIT-V3-FAIL-20260722.md` → **V4**  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot after `CASE-FILES-LIST-DETAIL-COL-FIT-V2` — table right side **broken**: header shows **“De”** (Detail cut off), cells show **“Op”** (Open cut off), vertical line, cramped box. “You fucked it all up.”  
**Search:** `width 1%`, `table-layout fixed`, `COL-FIT-V2`, `cf-list-actions`  
**Related:** `MOB-APPLIED-CASE-FILES-LIST-DETAIL-COL-FIT-V2` · Redacted exports COL-FIT (same pattern, different result)

---

## Yes — we see it. COL-FIT-V2 broke the list.

| Before V2 | Ghost blank box after Delete (8th column) |
| After V2 | **Detail column crushed** — text clipped, header truncated |

**Removing the ghost column was correct.**  
**Setting Detail to `width: 1%` under `table-layout: fixed` was wrong for Case Files.**

---

## What your screenshot is

Zoom on **Evidence | Updated | Detail** (left columns scrolled off or cropped).

```
Evidence    Updated              De|
0           22/07/2026, 15:54    Op|  ← should be Open · Delete
```

- **“De”** = **Detail** header clipped  
- **“Op”** = **Open · Delete** clipped  
- Vertical line = cell border on a column **too narrow to fit text**

---

## Root cause (code)

```css
#ev-panel-case-files .evidence-table { table-layout: fixed; width: 100%; }
… td:nth-child(7) { width: 1%; white-space: nowrap; }
```

With **`table-layout: fixed`**, **`width: 1%` is a hard cap** (~1% of table width ≈ **12–15px** on a normal screen). The browser **does not grow** the column for `Open · Delete` — text is **cut off**.

We copied the Redacted exports `1%` trick without the same column count / content width. Redacted exports may **look** OK at some zooms; Case Files **Open · Delete** needs **~130–150px** minimum.

**Ghost column fix: good. One-percent width: bad.**

---

## What PASS looks like

| Rule | Detail |
|------|--------|
| **Full text visible** | `Open · Delete` (or `Open` only) — not `Op` |
| **Header readable** | “Detail” or “Actions” — not `De` |
| **No ghost 8th column** | Keep V2 column removal |
| **No wide blank** after links | Column **fits content**, not 14% empty, not 1% crushed |
| **Horizontal scroll** | Table fits viewport; no clip on right |

---

## Recommended MOB

**Name:** `CASE-FILES-LIST-DETAIL-COL-FIT-V3`

### In scope

1. **Keep** 7 columns only (no Manage `<th>`).
2. Replace `width: 1%` with **`min-width: 9.5em`** (or **132px**) + **`width: auto`** on col 7 — enough for `Open · Delete`.
3. Optional **`max-width: 11em`** so column doesn’t re-grow to old 14% void.
4. Rebalance % on cols 1–6 so table still fills width (Title/Case ID get ellipsis).
5. Verify `overflow-x` on `#cf-table-wrap` — don’t clip actions.

### Out of scope

- Form align (FORM-ALIGN-V1 — separate)
- Detail pane box bottom (BOX-CLOSE-V1)

### Risk

**Very low** — CSS only.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Detail header full word visible | ☐ |
| 2 | **Open · Delete** full text, one line | ☐ |
| 3 | No blank 8th column | ☐ |
| 4 | No huge empty gutter right of actions | ☐ |

---

## Agent pick

**`CASE-FILES-LIST-DETAIL-COL-FIT-V3`** — one CSS fix; undo the 1% mistake, keep ghost-column removal.

---

## Ask

**`MOB-APPLY CASE-FILES-LIST-DETAIL-COL-FIT-V3`**
