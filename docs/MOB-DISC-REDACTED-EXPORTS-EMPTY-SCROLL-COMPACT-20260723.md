# MOB DISC — Redacted exports: unnecessary scroll when empty (follow CSS rules)

**Date:** 2026-07-23  
**Status:** APPLIED 2026-07-23 — `MOB-APPLY REDACTED-EXPORTS-EMPTY-SCROLL-COMPACT-V1`  
**See:** `docs/MOB-APPLIED-REDACTED-EXPORTS-EMPTY-SCROLL-COMPACT-V1-20260723.md`  
**Operator:** Redacted exports = **0** · filters/table feel stretched · **scrollbar with nothing to see**. “Isn’t scroll only when the list is full? Can you follow the CSS rules?”  
**Related locked rule:** same family as Case Files / Redacted `ev-rx-few-rows` — **scroll only when rows overflow**.

---

## Short answer

**Yes — we can and must follow that rule.**  
Scroll is for **overflowing content**, not for an empty Finalized list. Your screenshot is a **layout bug**, not “how the page is supposed to look.”

---

## Locked product / CSS rule (already written many times)

| Rows | Behaviour |
|------|-----------|
| **0 / few** (fits on screen) | Compact chrome + short table shell · **no** scroll into blank |
| **Many** (taller than viewport) | Table box fills available height · **scroll inside** `#ev-rx-table-wrap` |
| Horizontal | No scroll-right into blank (fixed columns / ellipsis) |

Discs already on this:  
`MOB-DISC-REDACTED-EXPORTS-FILL-LAYOUT-WASTE-SCROLL` · `MOB-DISC-REDACTED-EXPORTS-DETAIL-ACTIONS-UGLY` · `MOB-DISC-CASE-FILES-LIST-SCROLL-WHEN-FULL`  
Pattern shipped: class **`ev-rx-few-rows`** on panel + table wrap.

---

## Why you still get a useless scroll at 0 exports

Fill layout CSS (when **not** few-rows):

```css
#ev-panel-redacted-exports:not([hidden]) {
  min-height: calc(100vh - 168px);   /* tall panel */
}
#ev-rx-table-wrap:not(.ev-rx-few-rows) {
  flex: 1 1 auto; min-height: 220px; overflow-y: auto;  /* scroll shell */
}
```

Few-rows is supposed to turn that off. But on **empty** load, JS currently does:

```js
// empty list path
setRedactedExportsLayout(false, 0);   // ← forces FULL fill, not few-rows
```

while the non-empty path does:

```js
setRedactedExportsLayout(rows.length <= 12, rows.length);  // 0 would be few — but empty never hits this
```

So **0 exports = treated as “many rows” shell** → tall dark box + scrollbar with only “No redacted exports match…”.

Worse: the helper itself **blocks empty**:

```js
function setRedactedExportsLayout(fewRows, count) {
  const few = !!fewRows && count > 0;  // ← empty can NEVER get few-rows
  …
}
```

So even a correct call with `(true, 0)` would still leave the scroll void. That is the opposite of the rule. Not inventing a new design — **fix few-rows to include count === 0**.

Also stacking: `#evidence-panel { overflow-y: auto }` can add **outer** page scroll on top of the inner shell → double “why am I scrolling?”

---

## Filters / headers look “split wide”

Table uses `width: 100%` + `%` columns — empty table still stretches headers across the panel (normal for tables). That is **not** the same bug as Prior exports column-stack.  

Optional polish (same APPLY or later): keep filter toolbar chips content-sized (`width: auto`) so Search/Period/Status/Tag sit in a tight row left, not four islands across the screen — match Case Files / Evidence compact filter feel. Secondary to killing empty scroll.

---

## Recommended APPLY (one path)

`MOB-APPLY REDACTED-EXPORTS-EMPTY-SCROLL-COMPACT-V1`

| Change | Detail |
|--------|--------|
| Empty = few-rows | Fix `setRedactedExportsLayout`: few when `count <= 12` (**including 0**); empty path uses that |
| Confirm | Panel + `#ev-rx-table-wrap` get `ev-rx-few-rows` when 0 |
| Outer scroll | When redacted-exports + few-rows: Evidence panel no scroll-into-void (same Case Files empty pattern if needed) |
| Keep | Fill + inner scroll when **>12** rows on a page |
| Optional | Compact filter toolbar chips (`width: auto`) — no new visual system |

**Do not** invent a new page layout. Reuse `ev-rx-few-rows` + locked scroll-when-full rule.

---

## Verify after APPLY

| Check | Expect |
|-------|--------|
| 0 exports | No vertical scroll into blank |
| ≤12 rows | Compact; no void scroll |
| 20+ rows | Scroll **inside** table wrap |
| Prior compact | Still PASS (untouched) |

---

## One line

**Yes — scroll only when the list overflows; empty Redacted exports wrongly uses the full-height shell (`few-rows` off at 0) — next APPLY turns few-rows on for empty.**
