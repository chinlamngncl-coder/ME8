# MOB DISC — Case Files list: scroll down when only 2 rows — nothing to see

**Status:** APPLIED — `CASE-FILES-LIST-SCROLL-WHEN-FULL-V1` (2026-07-22)  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot — **2 case files**, huge empty table void below, **vertical scroll into nothing**. “Why always unnecessary scroll? If files fill up, *then* scroll.”  
**Search:** `case files few rows scroll`, `cf-list-empty`, `min-height 100vh`, `fill layout`  
**Related:** `MOB-APPLIED-CASE-FILES-EMPTY-COMPACT-V2` (fixed **zero** rows only) · `MOB-APPLIED-REDACTED-EXPORTS-FILL-LAYOUT-V1` + `ev-rx-few-rows`

---

## Straight answer — yes, we understand

**There is nothing to see below those 2 rows.** The scroll is **wrong**.

| What you see | Truth |
|--------------|--------|
| 2 cases in the table | Real data — correct |
| Dark box stretching to bottom of screen | **CSS bug** — forced viewport height |
| Scrollbar / scroll down | **CSS bug** — `overflow-y: auto` on an empty flex-grow shell |
| “What is there to see?” | **Nothing.** No hidden cases. |

**Product rule (operator):** Scroll **only when rows overflow** the visible list area. Few rows = **compact, no scroll void**.

---

## Why EMPTY-COMPACT-V2 didn’t fix this

V2 fixed **zero rows** (`cf-list-empty` → hide table, show compact empty card).

Your screenshot has **2 rows** → `cf-list-empty` is **off** → panel reverts to **FILL-LAYOUT**:

```css
#ev-panel-case-files:not(.cf-list-empty) {
    min-height: calc(100vh - 168px);   /* force nearly full screen */
}
#cf-table-wrap:not(.cf-list-empty) {
    flex: 1 1 auto; min-height: 220px; overflow-y: auto;
}
```

So: **empty = compact** ✅ · **few rows = still skyscraper** ❌

Same family as Redacted exports before `ev-rx-few-rows` — we fixed **≤12 rows** there, never ported to Case Files list.

---

## Root cause (one line)

**Fill-height layout runs whenever `cf-list-empty` is false** — does not distinguish **2 rows** vs **200 rows**.

```
Hints + buttons + filters
┌─ table (2 rows) ───────────┐
│ row 1                      │
│ row 2                      │
│                            │  ← flex:1 void
│      (scroll — why?)       │
└────────────────────────────┘
```

Also: `#evidence-panel { overflow-y: auto }` can add **outer** page scroll on top of inner table scroll.

---

## What PASS looks like

| Rows | Behaviour |
|------|-----------|
| **0** | Compact empty card (V2 — keep) |
| **1–~12** (fits on screen) | Table **height = content**; **no** scroll into blank |
| **Many** (overflow viewport) | Table box **fills** available height; **scroll inside table only** |
| **Horizontal** | No scroll-right regression (keep FILL column fixes) |

---

## Recommended MOB

**Name:** `CASE-FILES-LIST-SCROLL-WHEN-FULL-V1`

### In scope

1. Mirror **`ev-rx-few-rows`** from Redacted exports:
   - JS: `setCaseListFewRows(count)` when `count > 0 && count <= 12` (or viewport-based threshold).
   - Class e.g. `cf-few-rows` on `#ev-panel-case-files`, `#cf-list-wrap`, `#cf-table-wrap`.
2. CSS when `cf-few-rows`:
   - Panel: **no** `min-height: calc(100vh - …)`; `flex: 0 1 auto`.
   - Table wrap: **no** `flex: 1` grow; `overflow-y: visible`.
3. When **not** few-rows: keep current fill + internal scroll.
4. Optional: `evidence-panel` overflow tweak when Case Files list + few rows (avoid double scroll).
5. Cache bust `case-files-ui.js`.

### Out of scope

- Detail two-pane fill (`CASE-FILES-DETAIL-FILL-SPLIT-V1`)
- Pagination (Case Files loads up to 200 — scroll OK when actually full)
- Redacted exports Detail column width (separate MOB)

### Risk

**Low** — same pattern already PASS on Redacted exports.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | **2 cases** — no scroll into blank below table | ☐ |
| 2 | **0 cases** — still compact empty (V2 regression) | ☐ |
| 3 | **20+ cases** — scroll inside table box | ☐ |
| 4 | Open case / back — list layout OK | ☐ |

---

## Agent pick

**`CASE-FILES-LIST-SCROLL-WHEN-FULL-V1`** — completes the scroll story EMPTY-V2 started.

---

## Ask

**`MOB-APPLY CASE-FILES-LIST-SCROLL-WHEN-FULL-V1`**
